"""add banners and discount fields

Revision ID: d24a28f34ed6
Revises: 6e50bbef12ce
Create Date: 2026-03-11 22:11:44.751601

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'd24a28f34ed6'
down_revision: Union[str, Sequence[str], None] = '6e50bbef12ce'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Banner jadvali
    op.create_table(
        'banners',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('image_url', sa.String(500), nullable=False),
        sa.Column('link_url', sa.String(500), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('sort_order', sa.Integer(), server_default='0', nullable=False),
        sa.Column('start_date', sa.DateTime(), nullable=True),
        sa.Column('end_date', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), server_default='false', nullable=False),
    )

    # MenuItem ga aksiya ustunlari
    op.add_column('menu_items', sa.Column('is_sale', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('menu_items', sa.Column('discount_percent', sa.Float(), nullable=True))
    op.add_column('menu_items', sa.Column('discount_label', sa.String(100), nullable=True))
    op.add_column('menu_items', sa.Column('sale_start', sa.DateTime(), nullable=True))
    op.add_column('menu_items', sa.Column('sale_end', sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column('menu_items', 'sale_end')
    op.drop_column('menu_items', 'sale_start')
    op.drop_column('menu_items', 'discount_label')
    op.drop_column('menu_items', 'discount_percent')
    op.drop_column('menu_items', 'is_sale')
    op.drop_table('banners')