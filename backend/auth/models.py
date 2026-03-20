from sqlalchemy import Column, String, Boolean, Enum, Integer, ForeignKey, Index, JSON
from sqlalchemy.orm import relationship
from core.base import Base, TimestampMixin
import enum


class RoleEnum(str, enum.Enum):
    admin  = "admin"
    waiter = "waiter"
    chef   = "chef"


class User(Base, TimestampMixin):
    __tablename__ = "users"

    full_name        = Column(String(100), nullable=False)
    username         = Column(String(50),  nullable=False)
    hashed_password  = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)
    is_active        = Column(Boolean, default=True, nullable=False)
    assigned_tables  = Column(JSON, default=list, nullable=False, server_default="[]")

    __table_args__ = (
        Index("ix_users_username",    "username", unique=True),
        Index("ix_users_role_active", "role", "is_active"),
    )


class Table(Base, TimestampMixin):
    __tablename__ = "tables"

    number    = Column(Integer,     nullable=False)
    qr_code   = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    sessions  = relationship("TableSession", back_populates="table")

    __table_args__ = (
        Index("ix_tables_number",  "number",  unique=True),
        Index("ix_tables_qr_code", "qr_code", unique=True),
    )


class TableSession(Base, TimestampMixin):
    __tablename__ = "table_sessions"

    table_id      = Column(Integer, ForeignKey("tables.id"), nullable=False)
    session_token = Column(String(255), nullable=False)
    is_active     = Column(Boolean, default=True, nullable=False)

    table = relationship("Table", back_populates="sessions")

    __table_args__ = (
        Index("ix_table_sessions_token",        "session_token", unique=True),
        Index("ix_table_sessions_table_active", "table_id", "is_active"),
    )