from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import Column, Integer, DateTime, Boolean, func


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    id         = Column(Integer, primary_key=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, onupdate=func.now(),       nullable=True)
    is_deleted = Column(Boolean,  default=False,             nullable=False)