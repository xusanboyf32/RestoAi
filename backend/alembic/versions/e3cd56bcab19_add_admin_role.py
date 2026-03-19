"""add admin role

Revision ID: e3cd56bcab19
Revises: f4e4b797e360
Create Date: 2026-03-09 17:27:43.180118

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'e3cd56bcab19'
down_revision: Union[str, Sequence[str], None] = 'f4e4b797e360'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'roleenum') THEN
                CREATE TYPE roleenum AS ENUM ('admin', 'waiter', 'chef');
            ELSIF NOT EXISTS (
                SELECT 1 FROM pg_enum
                WHERE enumtypid = 'roleenum'::regtype
                AND enumlabel = 'admin'
            ) THEN
                ALTER TYPE roleenum ADD VALUE 'admin';
            END IF;
        END$$;
    """)


def downgrade() -> None:
    pass