from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=2, max_length=255)
    organization_name: str = Field(min_length=2, max_length=255)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str | None = None


class LogoutRequest(BaseModel):
    refresh_token: str | None = None


class VerifyEmailRequest(BaseModel):
    token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    password: str = Field(min_length=8, max_length=128)


class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    is_active: bool
    is_verified: bool
    created_at: datetime

    model_config = {'from_attributes': True}


class AuthTokens(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = 'bearer'
    access_expires_at: datetime
    refresh_expires_at: datetime


class AuthResponse(BaseModel):
    user: UserOut
    organization_id: int
    organization_role: str
    tokens: AuthTokens


class MeResponse(BaseModel):
    user: UserOut
    organization_id: int
    organization_name: str
    organization_role: str
