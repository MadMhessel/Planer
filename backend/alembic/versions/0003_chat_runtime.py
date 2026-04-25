"""Add chat runtime entities

Revision ID: 0003_chat_runtime
Revises: 0002_knowledge_base
Create Date: 2026-04-23 01:00:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0003_chat_runtime'
down_revision: Union[str, None] = '0002_knowledge_base'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


conversation_status_enum = postgresql.ENUM('active', 'closed', name='conversation_status_enum', create_type=False)
channel_type_enum = postgresql.ENUM('web', 'telegram', 'whatsapp', 'slack', 'email', 'api', name='channel_type_enum', create_type=False)
message_role_enum = postgresql.ENUM('system', 'user', 'assistant', 'tool', name='message_role_enum', create_type=False)
usage_event_type_enum = postgresql.ENUM('message', 'embedding', 'upload', 'deploy', 'api_call', name='usage_event_type_enum', create_type=False)


def upgrade() -> None:
    bind = op.get_bind()

    conversation_status_enum.create(bind, checkfirst=True)
    channel_type_enum.create(bind, checkfirst=True)
    message_role_enum.create(bind, checkfirst=True)
    usage_event_type_enum.create(bind, checkfirst=True)

    op.create_table(
        'conversations',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('assistant_id', sa.Integer(), sa.ForeignKey('assistants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_external_id', sa.String(length=255), nullable=False, server_default='anonymous'),
        sa.Column('channel_type', channel_type_enum, nullable=False, server_default='web'),
        sa.Column('channel_conversation_id', sa.String(length=255), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('last_message_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('status', conversation_status_enum, nullable=False, server_default='active'),
    )
    op.create_index('ix_conversations_assistant_id', 'conversations', ['assistant_id'])

    op.create_table(
        'messages',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('conversation_id', sa.Integer(), sa.ForeignKey('conversations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('role', message_role_enum, nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('token_input', sa.Integer(), nullable=True),
        sa.Column('token_output', sa.Integer(), nullable=True),
        sa.Column('model_used', sa.String(length=128), nullable=True),
        sa.Column('latency_ms', sa.Integer(), nullable=True),
        sa.Column('metadata_json', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_messages_conversation_id', 'messages', ['conversation_id'])

    op.create_table(
        'usage_events',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('organization_id', sa.Integer(), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('assistant_id', sa.Integer(), sa.ForeignKey('assistants.id', ondelete='SET NULL'), nullable=True),
        sa.Column('conversation_id', sa.Integer(), sa.ForeignKey('conversations.id', ondelete='SET NULL'), nullable=True),
        sa.Column('type', usage_event_type_enum, nullable=False),
        sa.Column('amount', sa.Numeric(12, 2), nullable=False, server_default='0'),
        sa.Column('unit', sa.String(length=32), nullable=False),
        sa.Column('cost', sa.Numeric(12, 4), nullable=False, server_default='0'),
        sa.Column('metadata_json', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_usage_events_organization_id', 'usage_events', ['organization_id'])
    op.create_index('ix_usage_events_assistant_id', 'usage_events', ['assistant_id'])
    op.create_index('ix_usage_events_conversation_id', 'usage_events', ['conversation_id'])


def downgrade() -> None:
    op.drop_index('ix_usage_events_conversation_id', table_name='usage_events', create_type=False)
    op.drop_index('ix_usage_events_assistant_id', table_name='usage_events', create_type=False)
    op.drop_index('ix_usage_events_organization_id', table_name='usage_events', create_type=False)
    op.drop_table('usage_events')

    op.drop_index('ix_messages_conversation_id', table_name='messages', create_type=False)
    op.drop_table('messages')

    op.drop_index('ix_conversations_assistant_id', table_name='conversations', create_type=False)
    op.drop_table('conversations')

    bind = op.get_bind()
    usage_event_type_enum.drop(bind, checkfirst=True)
    message_role_enum.drop(bind, checkfirst=True)
    channel_type_enum.drop(bind, checkfirst=True)
    conversation_status_enum.drop(bind, checkfirst=True)
