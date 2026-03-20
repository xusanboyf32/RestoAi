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
    pass


def downgrade() -> None:
    pass