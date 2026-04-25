from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, Request, Response

from app.api.deps import RequestContext, get_request_context
from app.core.rate_limit import rate_limit
from app.schemas.auth import (
    AuthResponse,
    ForgotPasswordRequest,
    LoginRequest,
    LogoutRequest,
    MeResponse,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
    VerifyEmailRequest,
)
from app.services.auth_service import AuthService, SessionMeta
from app.db.session import get_db
from sqlalchemy.orm import Session

router = APIRouter(prefix='/auth', tags=['auth'])
REFRESH_COOKIE_NAME = 'ai_refresh_token'


def _session_meta(request: Request) -> SessionMeta:
    return SessionMeta(
        user_agent=request.headers.get('user-agent'),
        ip=request.client.host if request.client else None,
    )


def _set_refresh_cookie(response: Response, auth: AuthResponse) -> None:
    response.set_cookie(
        REFRESH_COOKIE_NAME,
        auth.tokens.refresh_token,
        httponly=True,
        secure=True,
        samesite='lax',
        expires=auth.tokens.refresh_expires_at,
        path='/api/v1/auth',
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(REFRESH_COOKIE_NAME, path='/api/v1/auth')


@router.post('/register', response_model=AuthResponse, dependencies=[Depends(rate_limit(10, 60))])
def register(payload: RegisterRequest, request: Request, response: Response, db: Session = Depends(get_db)) -> AuthResponse:
    service = AuthService(db)
    auth = service.register(payload, _session_meta(request))
    _set_refresh_cookie(response, auth)
    return auth


@router.post('/login', response_model=AuthResponse, dependencies=[Depends(rate_limit(20, 60))])
def login(payload: LoginRequest, request: Request, response: Response, db: Session = Depends(get_db)) -> AuthResponse:
    service = AuthService(db)
    auth = service.login(payload, _session_meta(request))
    _set_refresh_cookie(response, auth)
    return auth


@router.post('/refresh', response_model=AuthResponse)
def refresh(
    payload: RefreshRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    refresh_cookie: str | None = Cookie(default=None, alias=REFRESH_COOKIE_NAME),
) -> AuthResponse:
    service = AuthService(db)
    refresh_token = payload.refresh_token or refresh_cookie
    if not refresh_token:
        from app.core.errors import APIError

        raise APIError(status_code=401, error_code='refresh_token_missing', message='Refresh token отсутствует')
    auth = service.refresh(refresh_token, _session_meta(request))
    _set_refresh_cookie(response, auth)
    return auth


@router.post('/logout')
def logout(
    payload: LogoutRequest,
    response: Response,
    db: Session = Depends(get_db),
    refresh_cookie: str | None = Cookie(default=None, alias=REFRESH_COOKIE_NAME),
) -> dict:
    service = AuthService(db)
    service.logout(payload.refresh_token or refresh_cookie)
    _clear_refresh_cookie(response)
    return {'status': 'ok'}


@router.get('/me', response_model=MeResponse)
def me(context: Annotated[RequestContext, Depends(get_request_context)]) -> MeResponse:
    return MeResponse(
        user=context.user,
        organization_id=context.organization.id,
        organization_name=context.organization.name,
        organization_role=context.member.role.value,
    )


@router.post('/verify-email')
def verify_email(payload: VerifyEmailRequest, db: Session = Depends(get_db)) -> dict:
    AuthService(db).verify_email(payload.token)
    return {'status': 'ok'}


@router.post('/forgot-password')
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)) -> dict:
    AuthService(db).forgot_password(payload.email)
    return {'status': 'accepted'}


@router.post('/reset-password')
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)) -> dict:
    AuthService(db).reset_password(payload.token, payload.password)
    return {'status': 'ok'}
