from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import RefreshToken


class RefreshTokenRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, *, user_id: int, token_jti: str, expires_at: datetime, user_agent: str | None, ip: str | None) -> RefreshToken:
        token = RefreshToken(
            user_id=user_id,
            token_jti=token_jti,
            expires_at=expires_at,
            user_agent=user_agent,
            ip=ip,
        )
        self.db.add(token)
        self.db.flush()
        return token

    def get_active_by_jti(self, token_jti: str) -> RefreshToken | None:
        stmt = select(RefreshToken).where(RefreshToken.token_jti == token_jti)
        token = self.db.execute(stmt).scalar_one_or_none()
        if token is None:
            return None
        if token.revoked_at is not None:
            return None
        expires_at = token.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at <= datetime.now(timezone.utc):
            return None
        return token

    def revoke(self, token: RefreshToken) -> None:
        token.revoked_at = datetime.now(timezone.utc)
        self.db.flush()
