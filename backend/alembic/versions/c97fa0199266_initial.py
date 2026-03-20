"""initial

Revision ID: c97fa0199266
Revises:
Create Date: 2026-03-09 15:46:07.651584

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'c97fa0199266'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('full_name', sa.String(100), nullable=False),
        sa.Column('username', sa.String(50), nullable=False),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('role', sa.String(50), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('assigned_tables', sa.JSON(), server_default='[]', nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), server_default='false', nullable=False),
    )
    op.create_index('ix_users_username', 'users', ['username'], unique=True)
    op.create_index('ix_users_role_active', 'users', ['role', 'is_active'])


def downgrade() -> None:
    op.drop_index('ix_users_role_active', 'users')
    op.drop_index('ix_users_username', 'users')
    op.drop_table('users')