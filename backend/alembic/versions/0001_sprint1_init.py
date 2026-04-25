"""Sprint 1 initial schema

Revision ID: 0001_sprint1_init
Revises:
Create Date: 2026-04-23 00:00:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0001_sprint1_init'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


user_role_enum = postgresql.ENUM('user', 'admin', name='user_role_enum', create_type=False)
organization_status_enum = postgresql.ENUM('active', 'suspended', name='organization_status_enum', create_type=False)
organization_member_role_enum = postgresql.ENUM('owner', 'admin', 'member', 'viewer', name='organization_member_role_enum', create_type=False)
assistant_status_enum = postgresql.ENUM('draft', 'active', 'archived', name='assistant_status_enum', create_type=False)
subscription_status_enum = postgresql.ENUM('trialing', 'active', 'canceled', 'past_due', name='subscription_status_enum', create_type=False)


def upgrade() -> None:
    bind = op.get_bind()

    user_role_enum.create(bind, checkfirst=True)
    organization_status_enum.create(bind, checkfirst=True)
    organization_member_role_enum.create(bind, checkfirst=True)
    assistant_status_enum.create(bind, checkfirst=True)
    subscription_status_enum.create(bind, checkfirst=True)

    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('email', sa.String(length=320), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=False),
        sa.Column('role', user_role_enum, nullable=False, server_default='user'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('is_verified', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_users_email', 'users', ['email'], unique=True)

    op.create_table(
        'plans',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(length=120), nullable=False),
        sa.Column('code', sa.String(length=80), nullable=False),
        sa.Column('monthly_price', sa.Numeric(10, 2), nullable=False, server_default='0'),
        sa.Column('limits_json', sa.Text(), nullable=True),
        sa.Column('features_json', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.create_index('ix_plans_code', 'plans', ['code'], unique=True)

    op.create_table(
        'organizations',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('slug', sa.String(length=255), nullable=False),
        sa.Column('owner_user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('plan_id', sa.Integer(), sa.ForeignKey('plans.id', ondelete='SET NULL'), nullable=True),
        sa.Column('status', organization_status_enum, nullable=False, server_default='active'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_organizations_slug', 'organizations', ['slug'], unique=True)

    op.create_table(
        'organization_members',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('organization_id', sa.Integer(), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('role', organization_member_role_enum, nullable=False, server_default='member'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('organization_id', 'user_id', name='uq_organization_member'),
    )

    op.create_table(
        'assistants',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('organization_id', sa.Integer(), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('slug', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('avatar_url', sa.String(length=1024), nullable=True),
        sa.Column('status', assistant_status_enum, nullable=False, server_default='draft'),
        sa.Column('system_prompt', sa.Text(), nullable=True),
        sa.Column('welcome_message', sa.Text(), nullable=True),
        sa.Column('model_provider', sa.String(length=64), nullable=True),
        sa.Column('model_name', sa.String(length=128), nullable=True),
        sa.Column('temperature', sa.Numeric(3, 2), nullable=True),
        sa.Column('max_tokens', sa.Integer(), nullable=True),
        sa.Column('memory_enabled', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('is_public', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('created_by', sa.Integer(), sa.ForeignKey('users.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('organization_id', 'slug', name='uq_assistant_org_slug'),
    )

    op.create_table(
        'subscriptions',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('organization_id', sa.Integer(), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('plan_id', sa.Integer(), sa.ForeignKey('plans.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('status', subscription_status_enum, nullable=False, server_default='trialing'),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('auto_renew', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('provider', sa.String(length=64), nullable=True),
        sa.Column('provider_subscription_id', sa.String(length=255), nullable=True),
    )

    op.create_table(
        'refresh_tokens',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('token_jti', sa.String(length=64), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('user_agent', sa.String(length=512), nullable=True),
        sa.Column('ip', sa.String(length=64), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_refresh_tokens_token_jti', 'refresh_tokens', ['token_jti'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_refresh_tokens_token_jti', table_name='refresh_tokens')
    op.drop_table('refresh_tokens')

    op.drop_table('subscriptions')
    op.drop_table('assistants')
    op.drop_table('organization_members')

    op.drop_index('ix_organizations_slug', table_name='organizations')
    op.drop_table('organizations')

    op.drop_index('ix_plans_code', table_name='plans')
    op.drop_table('plans')

    op.drop_index('ix_users_email', table_name='users')
    op.drop_table('users')

    bind = op.get_bind()
    subscription_status_enum.drop(bind, checkfirst=True)
    assistant_status_enum.drop(bind, checkfirst=True)
    organization_member_role_enum.drop(bind, checkfirst=True)
    organization_status_enum.drop(bind, checkfirst=True)
    user_role_enum.drop(bind, checkfirst=True)
