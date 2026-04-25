"""Add commercial v1 operational entities

Revision ID: 0006_commercial_v1
Revises: 0005_billing_analytics_ops
Create Date: 2026-04-24 16:00:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '0006_commercial_v1'
down_revision: Union[str, None] = '0005_billing_analytics_ops'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


payment_method_status_enum = postgresql.ENUM('active', 'inactive', 'revoked', name='payment_method_status_enum', create_type=False)
processing_job_status_enum = postgresql.ENUM('pending', 'processing', 'ready', 'failed', name='processing_job_status_enum', create_type=False)
integration_log_status_enum = postgresql.ENUM('info', 'success', 'error', name='integration_log_status_enum', create_type=False)
email_token_purpose_enum = postgresql.ENUM('verify_email', 'reset_password', 'invite', name='email_token_purpose_enum', create_type=False)


def upgrade() -> None:
    bind = op.get_bind()
    payment_method_status_enum.create(bind, checkfirst=True)
    processing_job_status_enum.create(bind, checkfirst=True)
    integration_log_status_enum.create(bind, checkfirst=True)
    email_token_purpose_enum.create(bind, checkfirst=True)

    op.create_table(
        'payment_methods',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('organization_id', sa.Integer(), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('provider', sa.String(length=64), nullable=False, server_default='yookassa'),
        sa.Column('provider_payment_method_id', sa.String(length=255), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=True),
        sa.Column('status', payment_method_status_enum, nullable=False, server_default='active'),
        sa.Column('metadata_json', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_payment_methods_organization_id', 'payment_methods', ['organization_id'])
    op.create_index('ix_payment_methods_provider_payment_method_id', 'payment_methods', ['provider_payment_method_id'])

    op.create_table(
        'integration_logs',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('integration_id', sa.Integer(), sa.ForeignKey('integrations.id', ondelete='SET NULL'), nullable=True),
        sa.Column('assistant_id', sa.Integer(), sa.ForeignKey('assistants.id', ondelete='SET NULL'), nullable=True),
        sa.Column('provider', sa.String(length=64), nullable=False),
        sa.Column('status', integration_log_status_enum, nullable=False, server_default='info'),
        sa.Column('event', sa.String(length=120), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('metadata_json', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_integration_logs_integration_id', 'integration_logs', ['integration_id'])
    op.create_index('ix_integration_logs_assistant_id', 'integration_logs', ['assistant_id'])

    op.create_table(
        'deployment_logs',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('deployment_id', sa.Integer(), sa.ForeignKey('deployment_channels.id', ondelete='SET NULL'), nullable=True),
        sa.Column('assistant_id', sa.Integer(), sa.ForeignKey('assistants.id', ondelete='SET NULL'), nullable=True),
        sa.Column('channel_type', sa.String(length=64), nullable=False),
        sa.Column('status', integration_log_status_enum, nullable=False, server_default='info'),
        sa.Column('event', sa.String(length=120), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('metadata_json', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_deployment_logs_deployment_id', 'deployment_logs', ['deployment_id'])
    op.create_index('ix_deployment_logs_assistant_id', 'deployment_logs', ['assistant_id'])

    op.create_table(
        'document_processing_jobs',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('document_id', sa.Integer(), sa.ForeignKey('knowledge_documents.id', ondelete='CASCADE'), nullable=False),
        sa.Column('job_id', sa.String(length=255), nullable=True),
        sa.Column('status', processing_job_status_enum, nullable=False, server_default='pending'),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('metadata_json', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_document_processing_jobs_document_id', 'document_processing_jobs', ['document_id'])
    op.create_index('ix_document_processing_jobs_job_id', 'document_processing_jobs', ['job_id'])

    op.create_table(
        'assistant_sources',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('assistant_id', sa.Integer(), sa.ForeignKey('assistants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('document_id', sa.Integer(), sa.ForeignKey('knowledge_documents.id', ondelete='SET NULL'), nullable=True),
        sa.Column('chunk_id', sa.Integer(), sa.ForeignKey('document_chunks.id', ondelete='SET NULL'), nullable=True),
        sa.Column('conversation_id', sa.Integer(), sa.ForeignKey('conversations.id', ondelete='SET NULL'), nullable=True),
        sa.Column('message_id', sa.Integer(), sa.ForeignKey('messages.id', ondelete='SET NULL'), nullable=True),
        sa.Column('score', sa.Numeric(8, 4), nullable=True),
        sa.Column('snippet', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_assistant_sources_assistant_id', 'assistant_sources', ['assistant_id'])
    op.create_index('ix_assistant_sources_document_id', 'assistant_sources', ['document_id'])
    op.create_index('ix_assistant_sources_chunk_id', 'assistant_sources', ['chunk_id'])
    op.create_index('ix_assistant_sources_conversation_id', 'assistant_sources', ['conversation_id'])
    op.create_index('ix_assistant_sources_message_id', 'assistant_sources', ['message_id'])

    op.create_table(
        'limit_counters',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('organization_id', sa.Integer(), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('metric', sa.String(length=80), nullable=False),
        sa.Column('period_key', sa.String(length=32), nullable=False),
        sa.Column('amount', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('organization_id', 'metric', 'period_key', name='uq_limit_counter_period'),
    )
    op.create_index('ix_limit_counters_organization_id', 'limit_counters', ['organization_id'])

    op.create_table(
        'admin_audit_logs',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('actor_user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('organization_id', sa.Integer(), sa.ForeignKey('organizations.id', ondelete='SET NULL'), nullable=True),
        sa.Column('action', sa.String(length=120), nullable=False),
        sa.Column('target_type', sa.String(length=80), nullable=True),
        sa.Column('target_id', sa.String(length=80), nullable=True),
        sa.Column('metadata_json', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_admin_audit_logs_actor_user_id', 'admin_audit_logs', ['actor_user_id'])
    op.create_index('ix_admin_audit_logs_organization_id', 'admin_audit_logs', ['organization_id'])

    op.create_table(
        'email_tokens',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=True),
        sa.Column('email', sa.String(length=320), nullable=False),
        sa.Column('token_hash', sa.String(length=128), nullable=False),
        sa.Column('purpose', email_token_purpose_enum, nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('consumed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('metadata_json', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_email_tokens_user_id', 'email_tokens', ['user_id'])
    op.create_index('ix_email_tokens_email', 'email_tokens', ['email'])
    op.create_index('ix_email_tokens_token_hash', 'email_tokens', ['token_hash'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_email_tokens_token_hash', table_name='email_tokens')
    op.drop_index('ix_email_tokens_email', table_name='email_tokens')
    op.drop_index('ix_email_tokens_user_id', table_name='email_tokens')
    op.drop_table('email_tokens')

    op.drop_index('ix_admin_audit_logs_organization_id', table_name='admin_audit_logs')
    op.drop_index('ix_admin_audit_logs_actor_user_id', table_name='admin_audit_logs')
    op.drop_table('admin_audit_logs')

    op.drop_index('ix_limit_counters_organization_id', table_name='limit_counters')
    op.drop_table('limit_counters')

    op.drop_index('ix_assistant_sources_message_id', table_name='assistant_sources')
    op.drop_index('ix_assistant_sources_conversation_id', table_name='assistant_sources')
    op.drop_index('ix_assistant_sources_chunk_id', table_name='assistant_sources')
    op.drop_index('ix_assistant_sources_document_id', table_name='assistant_sources')
    op.drop_index('ix_assistant_sources_assistant_id', table_name='assistant_sources')
    op.drop_table('assistant_sources')

    op.drop_index('ix_document_processing_jobs_job_id', table_name='document_processing_jobs')
    op.drop_index('ix_document_processing_jobs_document_id', table_name='document_processing_jobs')
    op.drop_table('document_processing_jobs')

    op.drop_index('ix_deployment_logs_assistant_id', table_name='deployment_logs')
    op.drop_index('ix_deployment_logs_deployment_id', table_name='deployment_logs')
    op.drop_table('deployment_logs')

    op.drop_index('ix_integration_logs_assistant_id', table_name='integration_logs')
    op.drop_index('ix_integration_logs_integration_id', table_name='integration_logs')
    op.drop_table('integration_logs')

    op.drop_index('ix_payment_methods_provider_payment_method_id', table_name='payment_methods')
    op.drop_index('ix_payment_methods_organization_id', table_name='payment_methods')
    op.drop_table('payment_methods')

    bind = op.get_bind()
    email_token_purpose_enum.drop(bind, checkfirst=True)
    integration_log_status_enum.drop(bind, checkfirst=True)
    processing_job_status_enum.drop(bind, checkfirst=True)
    payment_method_status_enum.drop(bind, checkfirst=True)
