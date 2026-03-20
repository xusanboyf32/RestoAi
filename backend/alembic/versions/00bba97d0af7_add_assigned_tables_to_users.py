"""add assigned tables to users

Revision ID: 00bba97d0af7
Revises: d24a28f34ed6
Create Date: 2026-03-14

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '00bba97d0af7'
down_revision: Union[str, Sequence[str], None] = 'd24a28f34ed6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass