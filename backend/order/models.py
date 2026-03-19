from sqlalchemy import (
    Column, String, Integer, Float, Boolean,
    Text, ForeignKey
)
from sqlalchemy.orm import relationship
import enum
from core.base import Base, TimestampMixin


class OrderStatus(str, enum.Enum):
    PENDING    = "pending"
    ACCEPTED   = "accepted"
    PREPARING  = "preparing"
    READY      = "ready"
    DELIVERING = "delivering"
    DELIVERED  = "delivered"
    CANCELLED  = "cancelled"


class PaymentStatus(str, enum.Enum):
    UNPAID = "unpaid"
    CASH   = "cash"
    CARD   = "card"
    PAID   = "paid"


class IssueType(str, enum.Enum):
    QR_NOT_WORKING = "qr_not_working"
    DIRTY_TABLE    = "dirty_table"
    ORDER_WRONG    = "order_wrong"
    TOO_LONG_WAIT  = "too_long_wait"
    OTHER          = "other"


class IssueStatus(str, enum.Enum):
    OPEN     = "open"
    RESOLVED = "resolved"


class Order(Base, TimestampMixin):
    __tablename__ = "orders"

    id               = Column(Integer, primary_key=True)
    table_session_id = Column(Integer, ForeignKey("table_sessions.id", ondelete="CASCADE"), nullable=False)
    table_number     = Column(Integer, nullable=False, default=0)

    status         = Column(String(50), default="pending", nullable=False)
    payment_status = Column(String(50), default="unpaid",  nullable=False)

    total_price  = Column(Float,  nullable=False, default=0)
    service_fee  = Column(Float,  nullable=False, default=0)
    final_price  = Column(Float,  nullable=False, default=0)
    note         = Column(Text,   nullable=True)
    accepted_at  = Column(String, nullable=True)
    ready_at     = Column(String, nullable=True)
    delivered_at = Column(String, nullable=True)

    table_session = relationship("TableSession", lazy="selectin")
    items         = relationship("OrderItem", back_populates="order", lazy="selectin", cascade="all, delete-orphan")
    issues        = relationship("Issue",     back_populates="order", lazy="selectin")


class OrderItem(Base, TimestampMixin):
    __tablename__ = "order_items"

    id           = Column(Integer, primary_key=True)
    order_id     = Column(Integer, ForeignKey("orders.id",     ondelete="CASCADE"),  nullable=False)
    menu_item_id = Column(Integer, ForeignKey("menu_items.id", ondelete="SET NULL"), nullable=True)

    name     = Column(String(200), nullable=False)
    price    = Column(Float,       nullable=False)
    quantity = Column(Integer,     default=1)
    note     = Column(Text,        nullable=True)

    order     = relationship("Order",    back_populates="items")
    menu_item = relationship("MenuItem", lazy="selectin")


class Issue(Base, TimestampMixin):
    __tablename__ = "issues"

    id          = Column(Integer, primary_key=True)
    order_id    = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)

    issue_type  = Column(String(50), nullable=False)
    description = Column(Text,       nullable=True)
    status      = Column(String(50), default="open", nullable=False)
    resolved_at = Column(String,     nullable=True)

    order = relationship("Order", back_populates="issues")


class Rating(Base, TimestampMixin):
    __tablename__ = "ratings"

    id        = Column(Integer, primary_key=True)
    order_id  = Column(Integer, ForeignKey("orders.id",  ondelete="CASCADE"),  nullable=False)
    waiter_id = Column(Integer, ForeignKey("users.id",   ondelete="SET NULL"), nullable=True)

    rating  = Column(Integer, nullable=False)
    comment = Column(Text,    nullable=True)

    order  = relationship("Order", lazy="selectin")
    waiter = relationship("User",  lazy="selectin")


class WaiterPayment(Base, TimestampMixin):
    __tablename__ = "waiter_payments"

    id        = Column(Integer, primary_key=True)
    waiter_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    amount    = Column(Float,   nullable=False)
    note      = Column(Text,    nullable=True)
    paid_date = Column(String,  nullable=False)  # "2026-03-16" formatda

    waiter = relationship("User", lazy="selectin")