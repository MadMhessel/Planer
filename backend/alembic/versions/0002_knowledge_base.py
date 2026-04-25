"""Add knowledge base entities

Revision ID: 0002_knowledge_base
Revises: 0001_sprint1_init
Create Date: 2026-04-23 00:30:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0002_knowledge_base'
down_revision: Union[str, None] = '0001_sprint1_init'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


knowledge_base_status_enum = postgresql.ENUM('draft', 'processing', 'ready', 'failed', 'archived', name='knowledge_base_status_enum', create_type=False)
document_source_type_enum = postgresql.ENUM('upload', 'url', 'text', 'manual', name='document_source_type_enum', create_type=False)
document_parse_status_enum = postgresql.ENUM('pending', 'processing', 'ready', 'failed', name='document_parse_status_enum', create_type=False)
document_indexing_status_enum = postgresql.ENUM('pending', 'processing', 'ready', 'failed', name='document_indexing_status_enum', create_type=False)


def upgrade() -> None:
    bind = op.get_bind()

    knowledge_base_status_enum.create(bind, checkfirst=True)
    document_source_type_enum.create(bind, checkfirst=True)
    document_parse_status_enum.create(bind, checkfirst=True)
    document_indexing_status_enum.create(bind, checkfirst=True)

    op.create_table(
        'knowledge_bases',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('assistant_id', sa.Integer(), sa.ForeignKey('assistants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', knowledge_base_status_enum, nullable=False, server_default='draft'),
        sa.Column('chunk_size', sa.Integer(), nullable=False, server_default='500'),
        sa.Column('chunk_overlap', sa.Integer(), nullable=False, server_default='50'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        'knowledge_documents',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('knowledge_base_id', sa.Integer(), sa.ForeignKey('knowledge_bases.id', ondelete='CASCADE'), nullable=False),
        sa.Column('filename', sa.String(length=512), nullable=False),
        sa.Column('original_url', sa.String(length=2048), nullable=True),
        sa.Column('storage_key', sa.String(length=2048), nullable=True),
        sa.Column('mime_type', sa.String(length=255), nullable=True),
        sa.Column('file_size', sa.Integer(), nullable=True),
        sa.Column('source_type', document_source_type_enum, nullable=False, server_default='upload'),
        sa.Column('parse_status', document_parse_status_enum, nullable=False, server_default='pending'),
        sa.Column('indexing_status', document_indexing_status_enum, nullable=False, server_default='pending'),
        sa.Column('extracted_text', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        'document_chunks',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('document_id', sa.Integer(), sa.ForeignKey('knowledge_documents.id', ondelete='CASCADE'), nullable=False),
        sa.Column('chunk_index', sa.Integer(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('token_count', sa.Integer(), nullable=False),
        sa.Column('embedding_id', sa.String(length=255), nullable=True),
        sa.Column('metadata_json', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_document_chunks_document_id', 'document_chunks', ['document_id'])


def downgrade() -> None:
    op.drop_index('ix_document_chunks_document_id', table_name='document_chunks', create_type=False)
    op.drop_table('document_chunks')
    op.drop_table('knowledge_documents')
    op.drop_table('knowledge_bases')

    bind = op.get_bind()
    document_indexing_status_enum.drop(bind, checkfirst=True)
    document_parse_status_enum.drop(bind, checkfirst=True)
    document_source_type_enum.drop(bind, checkfirst=True)
    knowledge_base_status_enum.drop(bind, checkfirst=True)
