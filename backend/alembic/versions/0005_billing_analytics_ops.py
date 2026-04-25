"""Add billing invoices

Revision ID: 0005_billing_analytics_ops
Revises: 0004_integrations_deploy
Create Date: 2026-04-24 00:20:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0005_billing_analytics_ops'
down_revision: Union[str, None] = '0004_integrations_deploy'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


invoice_status_enum = postgresql.ENUM('pending', 'paid', 'failed', 'void', name='invoice_status_enum', create_type=False)


def upgrade() -> None:
    bind = op.get_bind()
    invoice_status_enum.create(bind, checkfirst=True)

    op.create_table(
        'invoices',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('organization_id', sa.Integer(), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('subscription_id', sa.Integer(), sa.ForeignKey('subscriptions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('currency', sa.String(length=8), nullable=False, server_default='RUB'),
        sa.Column('status', invoice_status_enum, nullable=False, server_default='pending'),
        sa.Column('provider', sa.String(length=64), nullable=True),
        sa.Column('provider_invoice_id', sa.String(length=255), nullable=True),
        sa.Column('paid_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_invoices_organization_id', 'invoices', ['organization_id'])
    op.create_index('ix_invoices_subscription_id', 'invoices', ['subscription_id'])


def downgrade() -> None:
    op.drop_index('ix_invoices_subscription_id', table_name='invoices', create_type=False)
    op.drop_index('ix_invoices_organization_id', table_name='invoices', create_type=False)
    op.drop_table('invoices')

    bind = op.get_bind()
    invoice_status_enum.drop(bind, checkfirst=True)
