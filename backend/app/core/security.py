from __future__ import annotations

import uuid
import base64
import hashlib
import json
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from cryptography.fernet import Fernet, InvalidToken
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import get_settings
from app.core.errors import APIError

pwd_context = CryptContext(schemes=['argon2'], deprecated='auto')


@dataclass
class TokenPayload:
    sub: int
    token_type: str
    exp: datetime
    jti: str | None = None
    org_id: int | None = None
    org_role: str | None = None


settings = get_settings()


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


def _encode_token(payload: dict) -> str:
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_access_token(user_id: int, org_id: int | None, org_role: str | None) -> tuple[str, datetime]:
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    token_payload = {
        'sub': str(user_id),
        'type': 'access',
        'exp': int(expires_at.timestamp()),
        'org_id': org_id,
        'org_role': org_role,
    }
    return _encode_token(token_payload), expires_at


def create_refresh_token(user_id: int, org_id: int | None, org_role: str | None) -> tuple[str, str, datetime]:
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
    jti = uuid.uuid4().hex
    token_payload = {
        'sub': str(user_id),
        'type': 'refresh',
        'jti': jti,
        'exp': int(expires_at.timestamp()),
        'org_id': org_id,
        'org_role': org_role,
    }
    return _encode_token(token_payload), jti, expires_at


def decode_token(token: str, expected_type: str) -> TokenPayload:
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except JWTError as exc:
        raise APIError(status_code=401, error_code='invalid_token', message='Некорректный токен') from exc

    token_type = payload.get('type')
    if token_type != expected_type:
        raise APIError(status_code=401, error_code='invalid_token_type', message='Некорректный тип токена')

    sub = payload.get('sub')
    if sub is None:
        raise APIError(status_code=401, error_code='invalid_token_payload', message='Токен не содержит пользователя')

    exp_raw = payload.get('exp')
    if exp_raw is None:
        raise APIError(status_code=401, error_code='invalid_token_payload', message='Токен не содержит срок действия')

    exp = datetime.fromtimestamp(int(exp_raw), tz=timezone.utc)

    return TokenPayload(
        sub=int(sub),
        token_type=token_type,
        exp=exp,
        jti=payload.get('jti'),
        org_id=payload.get('org_id'),
        org_role=payload.get('org_role'),
    )


def _fernet() -> Fernet:
    digest = hashlib.sha256(settings.integration_secret_key.encode('utf-8')).digest()
    key = base64.urlsafe_b64encode(digest)
    return Fernet(key)


def encrypt_json(value: dict) -> str:
    serialized = json.dumps(value, ensure_ascii=False)
    token = _fernet().encrypt(serialized.encode('utf-8'))
    return token.decode('utf-8')


def decrypt_json(token: str) -> dict:
    try:
        decrypted = _fernet().decrypt(token.encode('utf-8'))
    except InvalidToken as exc:
        raise APIError(status_code=500, error_code='config_decrypt_failed', message='Не удалось расшифровать конфигурацию') from exc

    try:
        value = json.loads(decrypted.decode('utf-8'))
    except json.JSONDecodeError as exc:
        raise APIError(status_code=500, error_code='config_json_invalid', message='Некорректный формат конфигурации') from exc

    if not isinstance(value, dict):
        raise APIError(status_code=500, error_code='config_json_invalid', message='Некорректный формат конфигурации')
    return value
