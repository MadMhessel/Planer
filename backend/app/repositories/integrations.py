from __future__ import annotations

from sqlalchemy import and_, select
from sqlalchemy.orm import Session, joinedload

from app.db.models import (
    DeploymentChannel,
    DeploymentChannelType,
    Integration,
    IntegrationType,
    UsageEvent,
)


class IntegrationsRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_integrations(self, assistant_id: int) -> list[Integration]:
        stmt = select(Integration).where(Integration.assistant_id == assistant_id).order_by(Integration.created_at.desc())
        return list(self.db.execute(stmt).scalars().all())

    def get_integration(self, integration_id: int) -> Integration | None:
        return self.db.get(Integration, integration_id)

    def get_integration_with_assistant(self, integration_id: int) -> Integration | None:
        stmt = (
            select(Integration)
            .options(joinedload(Integration.assistant))
            .where(Integration.id == integration_id)
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def get_integration_by_type(self, assistant_id: int, integration_type: IntegrationType) -> Integration | None:
        stmt = select(Integration).where(and_(Integration.assistant_id == assistant_id, Integration.type == integration_type))
        return self.db.execute(stmt).scalar_one_or_none()

    def create_integration(self, **data) -> Integration:
        integration = Integration(**data)
        self.db.add(integration)
        self.db.flush()
        return integration

    def delete_integration(self, integration: Integration) -> None:
        self.db.delete(integration)

    def list_deployments(self, assistant_id: int) -> list[DeploymentChannel]:
        stmt = (
            select(DeploymentChannel)
            .where(DeploymentChannel.assistant_id == assistant_id)
            .order_by(DeploymentChannel.updated_at.desc())
        )
        return list(self.db.execute(stmt).scalars().all())

    def get_deployment(self, deployment_id: int) -> DeploymentChannel | None:
        return self.db.get(DeploymentChannel, deployment_id)

    def get_deployment_with_assistant(self, deployment_id: int) -> DeploymentChannel | None:
        stmt = (
            select(DeploymentChannel)
            .options(joinedload(DeploymentChannel.assistant))
            .where(DeploymentChannel.id == deployment_id)
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def get_deployment_by_type(self, assistant_id: int, channel_type: DeploymentChannelType) -> DeploymentChannel | None:
        stmt = select(DeploymentChannel).where(
            and_(
                DeploymentChannel.assistant_id == assistant_id,
                DeploymentChannel.channel_type == channel_type,
            )
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def create_deployment(self, **data) -> DeploymentChannel:
        deployment = DeploymentChannel(**data)
        self.db.add(deployment)
        self.db.flush()
        return deployment

    def delete_deployment(self, deployment: DeploymentChannel) -> None:
        self.db.delete(deployment)

    def create_usage_event(self, **data) -> UsageEvent:
        event = UsageEvent(**data)
        self.db.add(event)
        self.db.flush()
        return event
