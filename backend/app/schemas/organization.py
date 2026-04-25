from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field


RoleLiteral = Literal['owner', 'admin', 'member', 'viewer']


class OrganizationOut(BaseModel):
    id: int
    name: str
    slug: str
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {'from_attributes': True}


class OrganizationUpdate(BaseModel):
    name: str = Field(min_length=2, max_length=255)


class OrganizationMemberUserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: str


class OrganizationMemberOut(BaseModel):
    id: int
    role: RoleLiteral
    created_at: datetime
    user: OrganizationMemberUserOut


class OrganizationMemberCreate(BaseModel):
    email: EmailStr
    full_name: str | None = Field(default=None, max_length=255)
    role: RoleLiteral = 'member'


class OrganizationMemberUpdate(BaseModel):
    role: RoleLiteral
