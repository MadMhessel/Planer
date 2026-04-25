"""Add integrations and deployment channels

Revision ID: 0004_integrations_deploy
Revises: 0003_chat_runtime
Create Date: 2026-04-23 01:40:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0004_integrations_deploy'
down_revision: Union[str, None] = '0003_chat_runtime'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


integration_type_enum = postgresql.ENUM(
    'telegram',
    'notion',
    'slack',
    'google_sheets',
    'webhook',
    'email',
    'crm',
    name='integration_type_enum',
    create_type=False,
)
integration_status_enum = postgresql.ENUM('connected', 'disconnected', 'error', name='integration_status_enum', create_type=False)
deployment_channel_type_enum = postgresql.ENUM('telegram', 'web_widget', 'webhook', name='deployment_channel_type_enum', create_type=False)
deployment_status_enum = postgresql.ENUM('deployed', 'inactive', 'failed', name='deployment_status_enum', create_type=False)


def upgrade() -> None:
    bind = op.get_bind()

    integration_type_enum.create(bind, checkfirst=True)
    integration_status_enum.create(bind, checkfirst=True)
    deployment_channel_type_enum.create(bind, checkfirst=True)
    deployment_status_enum.create(bind, checkfirst=True)

    op.create_table(
        'integrations',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('assistant_id', sa.Integer(), sa.ForeignKey('assistants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('type', integration_type_enum, nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('status', integration_status_enum, nullable=False, server_default='disconnected'),
        sa.Column('config_encrypted', sa.Text(), nullable=False),
        sa.Column('last_sync_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('assistant_id', 'type', name='uq_integration_assistant_type'),
    )
    op.create_index('ix_integrations_assistant_id', 'integrations', ['assistant_id'])

    op.create_table(
        'deployment_channels',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('assistant_id', sa.Integer(), sa.ForeignKey('assistants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('channel_type', deployment_channel_type_enum, nullable=False),
        sa.Column('status', deployment_status_enum, nullable=False, server_default='inactive'),
        sa.Column('public_url', sa.String(length=2048), nullable=True),
        sa.Column('embed_code', sa.Text(), nullable=True),
        sa.Column('config_json', sa.Text(), nullable=True),
        sa.Column('deployed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('assistant_id', 'channel_type', name='uq_deploy_assistant_channel_type'),
    )
    op.create_index('ix_deployment_channels_assistant_id', 'deployment_channels', ['assistant_id'])


def downgrade() -> None:
    op.drop_index('ix_deployment_channels_assistant_id', table_name='deployment_channels')
    op.drop_table('deployment_channels')

    op.drop_index('ix_integrations_assistant_id', table_name='integrations')
    op.drop_table('integrations')

    bind = op.get_bind()
    deployment_status_enum.drop(bind, checkfirst=True)
    deployment_channel_type_enum.drop(bind, checkfirst=True)
    integration_status_enum.drop(bind, checkfirst=True)
    integration_type_enum.drop(bind, checkfirst=True)
