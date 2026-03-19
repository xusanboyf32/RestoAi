"""add_table_number_to_orders

Revision ID: 174378af2971
Revises: 00bba97d0af7
Create Date: 2026-03-15

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '174378af2971'
down_revision: Union[str, Sequence[str], None] = '00bba97d0af7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('orders', sa.Column('table_number', sa.Integer(), nullable=False, server_default='0'))


def downgrade() -> None:
    op.drop_column('orders', 'table_number')