from __future__ import annotations

import hashlib
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import APIError
from app.core.config import get_settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.core.text import slugify
from app.db.models import EmailToken, EmailTokenPurpose, Organization, OrganizationMemberRole, Subscription, SubscriptionStatus, User
from app.repositories.organizations import OrganizationMemberRepository, OrganizationRepository
from app.repositories.refresh_tokens import RefreshTokenRepository
from app.repositories.users import UserRepository
from app.schemas.auth import AuthResponse, AuthTokens, LoginRequest, RegisterRequest, UserOut
from app.services.billing_service import BillingService
from app.services.email_service import EmailService


@dataclass
class SessionMeta:
    user_agent: str | None
    ip: str | None


class AuthService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.users = UserRepository(db)
        self.orgs = OrganizationRepository(db)
        self.org_members = OrganizationMemberRepository(db)
        self.refresh_tokens = RefreshTokenRepository(db)

    def register(self, payload: RegisterRequest, meta: SessionMeta) -> AuthResponse:
        if self.users.get_by_email(payload.email):
            raise APIError(status_code=409, error_code='email_exists', message='Пользователь с таким email уже существует')

        user = self.users.create(
            email=payload.email,
            password_hash=hash_password(payload.password),
            full_name=payload.full_name,
            is_verified=False,
        )

        base_slug = slugify(payload.organization_name)
        slug = base_slug
        counter = 2
        while self.orgs.get_by_slug(slug):
            slug = f'{base_slug}-{counter}'
            counter += 1

        org = self.orgs.create(name=payload.organization_name, slug=slug, owner_user_id=user.id)
        self.orgs.add_member(organization_id=org.id, user_id=user.id, role=OrganizationMemberRole.owner)
        self._create_trial_subscription(org)

        self.db.commit()
        self.db.refresh(user)

        self._send_verify_email(user)

        context_member = self.org_members.get_context_member(user_id=user.id, organization_id=org.id)
        if context_member is None:
            raise APIError(status_code=500, error_code='context_resolution_failed', message='Не удалось определить контекст организации')

        return self._issue_tokens_for_context(user, context_member.organization_id, context_member.role.value, meta)

    def login(self, payload: LoginRequest, meta: SessionMeta) -> AuthResponse:
        user = self.users.get_by_email(payload.email)
        if user is None or not verify_password(payload.password, user.password_hash):
            raise APIError(status_code=401, error_code='invalid_credentials', message='Неверный email или пароль')

        if not user.is_active:
            raise APIError(status_code=403, error_code='user_inactive', message='Пользователь деактивирован')

        member = self.org_members.get_first_context_member(user.id)
        if member is None:
            raise APIError(status_code=403, error_code='organization_not_found', message='У пользователя нет доступной организации')

        user.last_login_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(user)

        return self._issue_tokens_for_context(user, member.organization_id, member.role.value, meta)

    def refresh(self, refresh_token: str, meta: SessionMeta) -> AuthResponse:
        payload = decode_token(refresh_token, 'refresh')
        if payload.jti is None:
            raise APIError(status_code=401, error_code='invalid_refresh_token', message='Refresh token не содержит jti')

        token_record = self.refresh_tokens.get_active_by_jti(payload.jti)
        if token_record is None:
            raise APIError(status_code=401, error_code='refresh_token_revoked', message='Refresh token недействителен')

        user = self.users.get_by_id(payload.sub)
        if user is None or not user.is_active:
            raise APIError(status_code=401, error_code='invalid_user', message='Пользователь недоступен')

        self.refresh_tokens.revoke(token_record)

        member = None
        if payload.org_id is not None:
            member = self.org_members.get_context_member(user_id=user.id, organization_id=payload.org_id)
        if member is None:
            member = self.org_members.get_first_context_member(user.id)
        if member is None:
            raise APIError(status_code=403, error_code='organization_not_found', message='У пользователя нет доступной организации')

        self.db.commit()

        return self._issue_tokens_for_context(user, member.organization_id, member.role.value, meta)

    def logout(self, refresh_token: str | None) -> None:
        if not refresh_token:
            return
        payload = decode_token(refresh_token, 'refresh')
        if payload.jti is None:
            return

        token_record = self.refresh_tokens.get_active_by_jti(payload.jti)
        if token_record is not None:
            self.refresh_tokens.revoke(token_record)
            self.db.commit()

    def verify_email(self, token: str) -> None:
        record = self._consume_email_token(token, EmailTokenPurpose.verify_email)
        user = record.user
        if user is None:
            raise APIError(status_code=404, error_code='user_not_found', message='Пользователь не найден')
        user.is_verified = True
        self.db.commit()

    def forgot_password(self, email: str) -> None:
        user = self.users.get_by_email(email)
        if user is None:
            return
        token = self._create_email_token(user=user, email=email, purpose=EmailTokenPurpose.reset_password, ttl_minutes=60)
        url = f'{get_settings().public_frontend_url}/login?reset_token={token}'
        EmailService().send(
            to_email=email,
            subject='Сброс пароля в AI Ассистенты',
            text=f'Для сброса пароля откройте ссылку: {url}',
            html=f'<p>Для сброса пароля откройте ссылку:</p><p><a href="{url}">{url}</a></p>',
        )

    def reset_password(self, token: str, password: str) -> None:
        record = self._consume_email_token(token, EmailTokenPurpose.reset_password)
        user = record.user
        if user is None:
            raise APIError(status_code=404, error_code='user_not_found', message='Пользователь не найден')
        user.password_hash = hash_password(password)
        self.db.commit()

    def _issue_tokens_for_context(self, user: User, organization_id: int, org_role: str, meta: SessionMeta) -> AuthResponse:
        access_token, access_exp = create_access_token(user.id, organization_id, org_role)
        refresh_token, refresh_jti, refresh_exp = create_refresh_token(user.id, organization_id, org_role)

        try:
            self.refresh_tokens.create(
                user_id=user.id,
                token_jti=refresh_jti,
                expires_at=refresh_exp,
                user_agent=meta.user_agent,
                ip=meta.ip,
            )
            self.db.commit()
        except IntegrityError as exc:
            self.db.rollback()
            raise APIError(status_code=500, error_code='token_persist_failed', message='Не удалось сохранить refresh token') from exc

        return AuthResponse(
            user=UserOut.model_validate(user),
            organization_id=organization_id,
            organization_role=org_role,
            tokens=AuthTokens(
                access_token=access_token,
                refresh_token=refresh_token,
                access_expires_at=access_exp,
                refresh_expires_at=refresh_exp,
            ),
        )

    def _create_trial_subscription(self, organization: Organization) -> None:
        billing = BillingService(self.db)
        billing.ensure_default_plans()
        starter = billing.repo.get_plan_by_code('starter')
        if starter is None:
            return
        now = datetime.now(timezone.utc)
        organization.plan_id = starter.id
        self.db.add(
            Subscription(
                organization_id=organization.id,
                plan_id=starter.id,
                status=SubscriptionStatus.trialing,
                started_at=now,
                expires_at=now + timedelta(days=14),
                auto_renew=False,
                provider='trial',
                provider_subscription_id=f'trial_{secrets.token_hex(8)}',
            )
        )

    def _send_verify_email(self, user: User) -> None:
        token = self._create_email_token(user=user, email=user.email, purpose=EmailTokenPurpose.verify_email, ttl_minutes=60 * 24)
        url = f'{get_settings().public_frontend_url}/login?verify_token={token}'
        EmailService().send(
            to_email=user.email,
            subject='Подтвердите email в AI Ассистенты',
            text=f'Для подтверждения email откройте ссылку: {url}',
            html=f'<p>Для подтверждения email откройте ссылку:</p><p><a href="{url}">{url}</a></p>',
        )

    def _create_email_token(self, *, user: User, email: str, purpose: EmailTokenPurpose, ttl_minutes: int) -> str:
        token = secrets.token_urlsafe(32)
        record = EmailToken(
            user_id=user.id,
            email=email,
            token_hash=self._hash_token(token),
            purpose=purpose,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=ttl_minutes),
        )
        self.db.add(record)
        self.db.commit()
        return token

    def _consume_email_token(self, token: str, purpose: EmailTokenPurpose) -> EmailToken:
        token_hash = self._hash_token(token)
        record = self.db.execute(
            select(EmailToken).where(EmailToken.token_hash == token_hash, EmailToken.purpose == purpose)
        ).scalar_one_or_none()
        now = datetime.now(timezone.utc)
        if record is None or record.consumed_at is not None or record.expires_at < now:
            raise APIError(status_code=400, error_code='email_token_invalid', message='Ссылка недействительна или истекла')
        record.consumed_at = now
        self.db.flush()
        return record

    @staticmethod
    def _hash_token(token: str) -> str:
        return hashlib.sha256(token.encode('utf-8')).hexdigest()
