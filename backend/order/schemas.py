# order/schemas.py
from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum
from datetime import datetime


# ─── ENUMLAR ─────────────────────────────────────────────

class OrderStatus(str, Enum):
    PENDING    = "pending"
    ACCEPTED   = "accepted"
    PREPARING  = "preparing"
    READY      = "ready"
    DELIVERING = "delivering"
    DELIVERED  = "delivered"
    CANCELLED  = "cancelled"


class PaymentStatus(str, Enum):
    UNPAID = "unpaid"
    CASH   = "cash"
    CARD   = "card"
    PAID   = "paid"


class IssueType(str, Enum):
    QR_NOT_WORKING = "qr_not_working"
    DIRTY_TABLE    = "dirty_table"
    ORDER_WRONG    = "order_wrong"
    TOO_LONG_WAIT  = "too_long_wait"
    OTHER          = "other"


class IssueStatus(str, Enum):
    OPEN     = "open"
    RESOLVED = "resolved"


# ─── ORDER ITEM ──────────────────────────────────────────

class OrderItemCreate(BaseModel):
    menu_item_id: int
    quantity:     int  = Field(default=1, ge=1)
    note:         Optional[str] = None  # "kam tuz soling"


class OrderItemResponse(BaseModel):
    id:           int
    menu_item_id: Optional[int]
    name:         str    # snapshot — taom nomi
    price:        float  # snapshot — taom narxi
    quantity:     int
    note:         Optional[str]

    model_config = {"from_attributes": True}


# ─── ORDER ───────────────────────────────────────────────

class OrderCreate(BaseModel):
    table_session_id: int
    items:            List[OrderItemCreate] = Field(..., min_length=1)
    note:             Optional[str] = None  # umumiy istak


class OrderStatusUpdate(BaseModel):
    # Oshpaz ishlatadi — ACCEPTED, PREPARING, READY
    # Ofitsiant ishlatadi — DELIVERING, DELIVERED
    status: OrderStatus


class PaymentRequest(BaseModel):
    # Mijoz ishlatadi — CASH yoki CARD tanlaydi
    payment_status: PaymentStatus = Field(
        ...,
        description="Faqat cash yoki card"
    )

class OrderResponse(BaseModel):
    id:               int
    table_session_id: int
    table_number:     int = 0
    status:           OrderStatus
    payment_status:   PaymentStatus
    total_price:      float
    service_fee:      float
    final_price:      float
    note:             Optional[str]
    accepted_at:      Optional[str]
    ready_at:         Optional[str]
    delivered_at:     Optional[str]
    created_at:       Optional[datetime] = None
    items:            List[OrderItemResponse] = []

    model_config = {"from_attributes": True}

# ─── ISSUE ───────────────────────────────────────────────

class IssueCreate(BaseModel):
    order_id:    int
    issue_type:  IssueType
    description: Optional[str] = None  # "Boshqa" uchun


class IssueResponse(BaseModel):
    id:          int
    order_id:    int
    issue_type:  IssueType
    description: Optional[str]
    status:      IssueStatus
    resolved_at: Optional[str]

    model_config = {"from_attributes": True}


# ─── RATING ──────────────────────────────────────────────

class RatingCreate(BaseModel):
    order_id:  int
    waiter_id: Optional[int] = None
    rating:    int = Field(..., ge=1, le=5)  # 1 dan 5 gacha
    comment:   Optional[str] = None


class RatingResponse(BaseModel):
    id:        int
    order_id:  int
    waiter_id: Optional[int]
    rating:    int
    comment:   Optional[str]

    model_config = {"from_attributes": True}

"""

---

## Qisqacha:
```
OrderCreate      → mijoz buyurtma berganda keladi
OrderStatusUpdate → oshpaz/ofitsiant holat o'zgartiradi
PaymentRequest   → mijoz cash/card tanlaydi
OrderResponse    → barcha buyurtma ma'lumoti ketadi
IssueCreate      → mijoz muammo tugmasini bosadi
RatingCreate     → mijoz baholaydi
"""
