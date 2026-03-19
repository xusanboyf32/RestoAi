"""add order tables

Revision ID: 6e50bbef12ce
Revises: e3cd56bcab19
Create Date: 2026-03-10 01:02:05.247439

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '6e50bbef12ce'
down_revision: Union[str, Sequence[str], None] = 'e3cd56bcab19'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'orders',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('table_session_id', sa.Integer(), sa.ForeignKey('table_sessions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('status', sa.String(50), nullable=False, server_default='pending'),
        sa.Column('payment_status', sa.String(50), nullable=False, server_default='unpaid'),
        sa.Column('total_price', sa.Float(), nullable=False, server_default='0'),
        sa.Column('service_fee', sa.Float(), nullable=False, server_default='0'),
        sa.Column('final_price', sa.Float(), nullable=False, server_default='0'),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('accepted_at', sa.String(), nullable=True),
        sa.Column('ready_at', sa.String(), nullable=True),
        sa.Column('delivered_at', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
    )

    op.create_table(
        'order_items',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('order_id', sa.Integer(), sa.ForeignKey('orders.id', ondelete='CASCADE'), nullable=False),
        sa.Column('menu_item_id', sa.Integer(), sa.ForeignKey('menu_items.id', ondelete='SET NULL'), nullable=True),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('price', sa.Float(), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
    )

    op.create_table(
        'issues',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('order_id', sa.Integer(), sa.ForeignKey('orders.id', ondelete='CASCADE'), nullable=False),
        sa.Column('issue_type', sa.String(50), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.String(50), nullable=False, server_default='open'),
        sa.Column('resolved_at', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
    )

    op.create_table(
        'ratings',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('order_id', sa.Integer(), sa.ForeignKey('orders.id', ondelete='CASCADE'), nullable=False),
        sa.Column('waiter_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('rating', sa.Integer(), nullable=False),
        sa.Column('comment', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
    )


def downgrade() -> None:
    op.drop_table('ratings')
    op.drop_table('issues')
    op.drop_table('order_items')
    op.drop_table('orders')