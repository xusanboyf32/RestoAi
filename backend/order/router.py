from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from pydantic import BaseModel
from typing import Optional

from database import get_db
from auth.models import User, RoleEnum
from auth.router import get_current_user
from order import crud
from order.models import Order, OrderStatus, WaiterPayment
from order.schemas import (
    OrderCreate, OrderResponse, OrderStatusUpdate,
    PaymentRequest, IssueCreate, IssueResponse,
    RatingCreate, RatingResponse,
)
from websocket.manager import manager

router = APIRouter(prefix="/orders", tags=["Orders"])


class PayWaiterRequest(BaseModel):
    amount: float
    note:   Optional[str] = None


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Faqat admin uchun")
    return current_user


def require_chef(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in (RoleEnum.chef, RoleEnum.admin):
        raise HTTPException(status_code=403, detail="Faqat oshpaz uchun")
    return current_user


def require_waiter(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in (RoleEnum.waiter, RoleEnum.admin):
        raise HTTPException(status_code=403, detail="Faqat ofitsiant uchun")
    return current_user


@router.post("/", response_model=OrderResponse, status_code=201)
async def create_order(data: OrderCreate, db: AsyncSession = Depends(get_db)):
    order = await crud.create_order(db, data)
    if not order:
        raise HTTPException(status_code=400, detail="Buyurtma yaratib bo'lmadi")
    return order


@router.get("/session/{table_session_id}", response_model=List[OrderResponse])
async def get_session_orders(table_session_id: int, db: AsyncSession = Depends(get_db)):
    return await crud.get_orders_by_session(db, table_session_id)


@router.get("/active/all", response_model=List[OrderResponse])
async def get_active_orders(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in (RoleEnum.chef, RoleEnum.admin, RoleEnum.waiter):
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")
    return await crud.get_active_orders(db)


@router.get("/waiter-stats")
async def get_waiter_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in (RoleEnum.waiter, RoleEnum.admin):
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")
    return await crud.get_waiter_stats(db, current_user.id)


@router.get("/admin/stats")
async def get_admin_stats(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    from datetime import datetime, timedelta, timezone

    cutoff = datetime.utcnow() - timedelta(hours=72)

    result = await db.execute(
        select(Order).where(
            Order.status == OrderStatus.DELIVERED.value,
            Order.updated_at >= cutoff,
        ).order_by(Order.created_at.desc())
    )
    delivered_orders = result.scalars().all()

    total_revenue = sum(o.final_price for o in delivered_orders)
    total_service = sum(o.service_fee for o in delivered_orders)
    total_food    = sum(o.total_price for o in delivered_orders)
    total_count   = len(delivered_orders)

    waiters_result = await db.execute(
        select(User).where(User.role == RoleEnum.waiter, User.is_active == True)
    )
    waiters = waiters_result.scalars().all()

    def get_waiter_for_table(table_number):
        for w in waiters:
            if table_number in (w.assigned_tables or []):
                return w.full_name
        return None

    waiter_stats = []
    for w in waiters:
        assigned = w.assigned_tables or []
        w_orders = [o for o in delivered_orders if o.table_number in assigned] if assigned else []
        waiter_stats.append({
            "id":           w.id,
            "full_name":    w.full_name,
            "tables":       assigned,
            "orders_count": len(w_orders),
            "service_fee":  round(sum(o.service_fee for o in w_orders), 2),
        })

    return {
        "total_revenue":    round(total_revenue, 2),
        "total_service":    round(total_service, 2),
        "total_food":       round(total_food,    2),
        "total_count":      total_count,
        "delivered_orders": [
            {
                "id":           o.id,
                "table_number": o.table_number,
                "total_price":  o.total_price,
                "service_fee":  o.service_fee,
                "final_price":  o.final_price,
                "created_at":   str(o.created_at),
                "accepted_at":  str(o.accepted_at)  if o.accepted_at  else None,
                "ready_at":     str(o.ready_at)     if o.ready_at     else None,
                "delivered_at": str(o.delivered_at) if o.delivered_at else None,
                "waiter_name":  get_waiter_for_table(o.table_number),
                "items":        [{"name": i.name, "quantity": i.quantity, "price": i.price} for i in o.items],
            }
            for o in delivered_orders
        ],
        "waiter_stats": waiter_stats,
    }


@router.get("/admin/waiter-salary/{waiter_id}")
async def get_waiter_salary(
    waiter_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    from datetime import datetime, timedelta, timezone

    TZ_UZB    = timezone(timedelta(hours=5))
    today     = datetime.now(TZ_UZB).date()
    month_ago = today - timedelta(days=30)

    # Ofitsiant
    waiter_result = await db.execute(select(User).where(User.id == waiter_id))
    waiter = waiter_result.scalar_one_or_none()
    if not waiter:
        raise HTTPException(status_code=404, detail="Ofitsiant topilmadi")

    assigned = waiter.assigned_tables or []

    # 30 kun ichida delivered zakazlar
    def uzb_date(dt):
        if not dt:
            return None
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(TZ_UZB).date()

    orders_result = await db.execute(
        select(Order).where(
            Order.status.in_([OrderStatus.DELIVERED.value, OrderStatus.DELIVERING.value]),
        )
    )
    all_orders = orders_result.scalars().all()

    # Faqat o'z stollaridagi 30 kunlik zakazlar
    my_orders = [
        o for o in all_orders
        if (assigned and o.table_number in assigned)
        and uzb_date(o.created_at) is not None
        and uzb_date(o.created_at) >= month_ago
    ]

    # Jami 30 kunlik ish haqi
    total_earned = round(sum(o.service_fee for o in my_orders), 2)

    # Berilgan to'lovlar — 30 kun ichida
    payments_result = await db.execute(
        select(WaiterPayment).where(
            WaiterPayment.waiter_id == waiter_id,
            WaiterPayment.paid_date >= str(month_ago),
        ).order_by(WaiterPayment.created_at.desc())
    )
    payments = payments_result.scalars().all()
    total_paid = round(sum(p.amount for p in payments), 2)
    remaining  = round(total_earned - total_paid, 2)

    # Kunlik tarix — oxirgi 30 kun
    daily = {}
    for i in range(29, -1, -1):
        day = today - timedelta(days=i)
        daily[str(day)] = {"date": str(day), "earned": 0.0, "orders": 0}

    for o in my_orders:
        od = uzb_date(o.created_at)
        if od:
            ds = str(od)
            if ds in daily:
                daily[ds]["earned"]  = round(daily[ds]["earned"] + o.service_fee, 2)
                daily[ds]["orders"] += 1

    return {
        "waiter_id":     waiter.id,
        "full_name":     waiter.full_name,
        "tables":        assigned,
        "total_earned":  total_earned,
        "total_paid":    total_paid,
        "remaining":     remaining,
        "daily_history": list(daily.values()),
        "payments": [
            {
                "id":        p.id,
                "amount":    p.amount,
                "note":      p.note,
                "paid_date": p.paid_date,
                "created_at": str(p.created_at),
            }
            for p in payments
        ],
    }


@router.post("/admin/waiter-salary/{waiter_id}/pay")
async def pay_waiter(
    waiter_id: int,
    data: PayWaiterRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    from datetime import datetime, timedelta, timezone

    TZ_UZB = timezone(timedelta(hours=5))
    today  = datetime.now(TZ_UZB).date()

    waiter_result = await db.execute(select(User).where(User.id == waiter_id))
    waiter = waiter_result.scalar_one_or_none()
    if not waiter:
        raise HTTPException(status_code=404, detail="Ofitsiant topilmadi")

    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Summa 0 dan katta bo'lishi kerak")

    payment = WaiterPayment(
        waiter_id = waiter_id,
        amount    = data.amount,
        note      = data.note,
        paid_date = str(today),
    )
    db.add(payment)
    await db.commit()
    await db.refresh(payment)

    return {
        "id":        payment.id,
        "waiter_id": waiter_id,
        "full_name": waiter.full_name,
        "amount":    payment.amount,
        "note":      payment.note,
        "paid_date": payment.paid_date,
    }


@router.delete("/admin/waiter-salary/payment/{payment_id}")
async def delete_payment(
    payment_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(WaiterPayment).where(WaiterPayment.id == payment_id))
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="To'lov topilmadi")
    await db.delete(payment)
    await db.commit()
    return {"message": "To'lov o'chirildi ✅"}


@router.get("/issues/open", response_model=List[IssueResponse])
async def get_open_issues(db: AsyncSession = Depends(get_db), _: User = Depends(require_waiter)):
    return await crud.get_open_issues(db)


@router.patch("/issues/{issue_id}/resolve", response_model=IssueResponse)
async def resolve_issue(
    issue_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_waiter),
):
    issue = await crud.resolve_issue(db, issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Muammo topilmadi")
    return issue


@router.post("/issues", response_model=IssueResponse, status_code=201)
async def create_issue(data: IssueCreate, db: AsyncSession = Depends(get_db)):
    return await crud.create_issue(db, data)


@router.post("/ratings", response_model=RatingResponse, status_code=201)
async def create_rating(data: RatingCreate, db: AsyncSession = Depends(get_db)):
    return await crud.create_rating(db, data)


@router.patch("/{order_id}/status", response_model=OrderResponse)
async def update_order_status(
    order_id: int,
    data: OrderStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    chef_statuses   = ("accepted", "preparing", "ready")
    waiter_statuses = ("delivering", "delivered")

    if data.status.value in chef_statuses:
        if current_user.role not in (RoleEnum.chef, RoleEnum.admin):
            raise HTTPException(status_code=403, detail="Bu holatni faqat oshpaz o'zgartira oladi")
    elif data.status.value in waiter_statuses:
        if current_user.role not in (RoleEnum.waiter, RoleEnum.admin):
            raise HTTPException(status_code=403, detail="Bu holatni faqat ofitsiant o'zgartira oladi")

    order = await crud.update_order_status(db, order_id, data)
    if not order:
        raise HTTPException(status_code=404, detail="Buyurtma topilmadi")

    await manager.notify_order(order_id, {
        "type":   "status_update",
        "status": order.status,
    })
    return order


@router.patch("/{order_id}/payment-request", response_model=OrderResponse)
async def request_payment(
    order_id: int,
    data: PaymentRequest,
    db: AsyncSession = Depends(get_db),
):
    order = await crud.request_payment(db, order_id, data)
    if not order:
        raise HTTPException(status_code=400, detail="To'lov so'rovi amalga oshmadi")
    return order


@router.patch("/{order_id}/payment-confirm", response_model=OrderResponse)
async def confirm_payment(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_waiter),
):
    order = await crud.confirm_payment(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Buyurtma topilmadi")
    await manager.notify_order(order_id, {"type": "payment_confirmed"})
    return order




@router.get("/admin/dashboard")
async def get_admin_dashboard(
    period: str = "today",       # today | month
    waiter_id: int = 0,          # 0 = hammasi
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    from datetime import datetime, timedelta, timezone
    import calendar

    TZ_UZB = timezone(timedelta(hours=5))
    now    = datetime.now(TZ_UZB)
    today  = now.date()

    def uzb_date(dt):
        if not dt: return None
        if dt.tzinfo is None: dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(TZ_UZB).date()

    # Sana oraligi
    if period == "today":
        date_from = today
        date_to   = today
    else:  # month
        date_from = today.replace(day=1)
        last_day  = calendar.monthrange(today.year, today.month)[1]
        date_to   = today.replace(day=last_day)

    # Barcha ofitsiantlar
    waiters_result = await db.execute(
        select(User).where(User.role == RoleEnum.waiter, User.is_active == True)
    )
    all_waiters = waiters_result.scalars().all()

    # Delivered/delivering zakazlar
    orders_result = await db.execute(
        select(Order).where(
            Order.status.in_([OrderStatus.DELIVERED.value, OrderStatus.DELIVERING.value])
        )
    )
    all_orders = orders_result.scalars().all()

    # Sana filtri
    def in_period(o):
        od = uzb_date(o.created_at)
        return od and date_from <= od <= date_to

    # Ofitsiant filtri
    if waiter_id > 0:
        target_waiter = next((w for w in all_waiters if w.id == waiter_id), None)
        if target_waiter:
            assigned = target_waiter.assigned_tables or []
            filtered_orders = [o for o in all_orders if in_period(o) and o.table_number in assigned]
        else:
            filtered_orders = []
    else:
        # Barcha ofitsiantlar — faqat biriktirilgan stollar
        all_assigned = []
        for w in all_waiters:
            all_assigned.extend(w.assigned_tables or [])
        filtered_orders = [o for o in all_orders if in_period(o) and o.table_number in all_assigned]

    total_revenue = round(sum(o.final_price for o in filtered_orders), 2)
    total_food = round(sum(o.total_price for o in filtered_orders), 2)
    total_service = round(sum(o.service_fee for o in filtered_orders), 2)
    total_count = len(filtered_orders)

    # Ofitsiantlar statistikasi
    waiter_stats = []
    for w in all_waiters:
        assigned = w.assigned_tables or []
        w_orders = [o for o in filtered_orders if o.table_number in assigned] if assigned else []
        if w_orders:
            waiter_stats.append({
                "id":           w.id,
                "full_name":    w.full_name,
                "tables":       assigned,
                "orders_count": len(w_orders),
                "food_total":   round(sum(o.total_price for o in w_orders), 2),
                "service_fee":  round(sum(o.service_fee for o in w_orders), 2),
                "revenue":      round(sum(o.final_price for o in w_orders), 2),
            })

    return {
        "period":        period,
        "date_from":     str(date_from),
        "date_to":       str(date_to),
        "waiter_id":     waiter_id,
        "total_revenue": total_revenue,
        "total_food":    total_food,
        "total_service": total_service,
        "total_count":   total_count,
        "waiter_stats":  waiter_stats,
        "waiters_list":  [{"id": w.id, "full_name": w.full_name} for w in all_waiters],
    }




@router.get("/admin/waiter-ratings/{waiter_id}")
async def get_waiter_ratings(
    waiter_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    from order.models import Rating

    waiter_result = await db.execute(select(User).where(User.id == waiter_id))
    waiter = waiter_result.scalar_one_or_none()
    if not waiter:
        raise HTTPException(status_code=404, detail="Ofitsiant topilmadi")

    ratings_result = await db.execute(
        select(Rating, Order)
        .join(Order, Rating.order_id == Order.id)
        .where(Rating.waiter_id == waiter_id)
        .order_by(Rating.created_at.desc())
    )
    rows = ratings_result.all()

    total     = len(rows)
    avg       = round(sum(r.Rating.rating for r in rows) / total, 1) if total else 0
    star_dist = {i: sum(1 for r in rows if r.Rating.rating == i) for i in range(1, 6)}

    return {
        "waiter_id":   waiter.id,
        "full_name":   waiter.full_name,
        "avg_rating":  avg,
        "total_count": total,
        "star_dist":   star_dist,
        "ratings": [
            {
                "id":           r.Rating.id,
                "rating":       r.Rating.rating,
                "comment":      r.Rating.comment,
                "order_id":     r.Rating.order_id,
                "table_number": r.Order.table_number,
                "created_at":   str(r.Rating.created_at),
            }
            for r in rows
        ],
    }



@router.get("/waiter-ratings")
async def get_my_ratings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in (RoleEnum.waiter, RoleEnum.admin):
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")

    from order.models import Rating

    ratings_result = await db.execute(
        select(Rating, Order)
        .join(Order, Rating.order_id == Order.id)
        .where(Rating.waiter_id == current_user.id)
        .order_by(Rating.created_at.desc())
    )
    rows = ratings_result.all()

    total = len(rows)
    avg   = round(sum(r.Rating.rating for r in rows) / total, 1) if total else 0

    return {
        "avg_rating":  avg,
        "total_count": total,
        "ratings": [
            {
                "id":           r.Rating.id,
                "rating":       r.Rating.rating,
                "comment":      r.Rating.comment,
                "order_id":     r.Rating.order_id,
                "table_number": r.Order.table_number,
                "created_at":   str(r.Rating.created_at),
            }
            for r in rows
        ],
    }



@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(order_id: int, db: AsyncSession = Depends(get_db)):
    order = await crud.get_order_by_id(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Buyurtma topilmadi")
    return order
