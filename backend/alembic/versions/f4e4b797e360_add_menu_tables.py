"""add menu tables

Revision ID: f4e4b797e360
Revises: c97fa0199266
Create Date: 2026-03-09 16:56:48.326703

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'f4e4b797e360'
down_revision: Union[str, Sequence[str], None] = 'c97fa0199266'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'menu_categories',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('emoji', sa.String(10), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('sort_order', sa.Integer(), default=0),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), server_default='false', nullable=False),
    )

    op.create_table(
        'menu_items',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('category_id', sa.Integer(), sa.ForeignKey('menu_categories.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('price', sa.Float(), nullable=False),
        sa.Column('image_url', sa.String(500), nullable=True),
        sa.Column('calories', sa.Integer(), nullable=True),
        sa.Column('weight_grams', sa.Integer(), nullable=True),
        sa.Column('food_type', sa.String(50), nullable=True),
        sa.Column('is_fatty', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('is_salty', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('is_sweet', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('is_spicy', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('is_vegetarian', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('has_sugar', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('availability', sa.String(50), server_default='available', nullable=False),
        sa.Column('is_diabetes_safe', sa.Boolean(), nullable=True),
        sa.Column('is_heart_safe', sa.Boolean(), nullable=True),
        sa.Column('is_stomach_safe', sa.Boolean(), nullable=True),
        sa.Column('is_pressure_safe', sa.Boolean(), nullable=True),
        sa.Column('is_gluten_free', sa.Boolean(), nullable=True),
        sa.Column('order_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('sort_order', sa.Integer(), default=0),
        sa.Column('is_sale', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('discount_percent', sa.Float(), nullable=True),
        sa.Column('discount_label', sa.String(100), nullable=True),
        sa.Column('sale_start', sa.DateTime(), nullable=True),
        sa.Column('sale_end', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), server_default='false', nullable=False),
    )

    op.create_table(
        'menu_item_tags',
        sa.Column('menu_item_id', sa.Integer(), sa.ForeignKey('menu_items.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('tag', sa.String(50), primary_key=True),
    )

    op.create_table(
        'menu_item_reviews',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('menu_item_id', sa.Integer(), sa.ForeignKey('menu_items.id', ondelete='CASCADE'), nullable=False),
        sa.Column('comment', sa.Text(), nullable=False),
        sa.Column('rating', sa.Integer(), server_default='0', nullable=False),
        sa.Column('likes', sa.Integer(), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), server_default='false', nullable=False),
    )

    op.create_table(
        'combo_sets',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('price', sa.Float(), nullable=False),
        sa.Column('image_url', sa.String(500), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), server_default='false', nullable=False),
    )

    op.create_table(
        'combo_items',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('combo_id', sa.Integer(), sa.ForeignKey('combo_sets.id', ondelete='CASCADE'), nullable=False),
        sa.Column('menu_item_id', sa.Integer(), sa.ForeignKey('menu_items.id', ondelete='CASCADE'), nullable=False),
        sa.Column('quantity', sa.Integer(), default=1),
        sa.Column('size_note', sa.String(100), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), server_default='false', nullable=False),
    )

    op.create_table(
        'banners',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('image_url', sa.String(500), nullable=False),
        sa.Column('link_url', sa.String(500), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('sort_order', sa.Integer(), default=0),
        sa.Column('start_date', sa.DateTime(), nullable=True),
        sa.Column('end_date', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), server_default='false', nullable=False),
    )


def downgrade() -> None:
    op.drop_table('banners')
    op.drop_table('combo_items')
    op.drop_table('combo_sets')
    op.drop_table('menu_item_reviews')
    op.drop_table('menu_item_tags')
    op.drop_table('menu_items')
    op.drop_table('menu_categories')