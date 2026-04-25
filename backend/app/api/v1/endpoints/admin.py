from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import RequestContext, require_roles
from app.db.models import OrganizationMemberRole
from app.db.session import get_db
from app.schemas.admin import AdminOverviewOut
from app.services.admin_service import AdminService

router = APIRouter(prefix='/admin', tags=['admin'])


@router.get('/overview', response_model=AdminOverviewOut)
def admin_overview(
    context: Annotated[
        RequestContext,
        Depends(require_roles(OrganizationMemberRole.owner, OrganizationMemberRole.admin)),
    ],
    db: Session = Depends(get_db),
) -> AdminOverviewOut:
    return AdminService(db).overview(context.organization.id)
