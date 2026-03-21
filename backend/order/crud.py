from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import Optional, List
from datetime import datetime, timedelta, timezone

from order.models import Order, OrderItem, Issue, Rating, OrderStatus, PaymentStatus, IssueStatus
from order.schemas import OrderCreate, OrderStatusUpdate, PaymentRequest, IssueCreate, RatingCreate
from menu.models import MenuItem
from auth.models import TableSession, Table
from websocket.manager import manager
from core.logger import setup_logger

logger = setup_logger("order")

TZ_UZB = timezone(timedelta(hours=5))


def _now() -> str:
    return datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")


def _uzb_date(dt) -> Optional[object]:
    if not dt:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(TZ_UZB).date()


async def get_table_number_by_session(db: AsyncSession, session_id: int) -> int:
    result = await db.execute(select(TableSession).where(TableSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        return 0
    result2 = await db.execute(select(Table).where(Table.id == session.table_id))
    table = result2.scalar_one_or_none()
    return table.number if table else 0


async def create_order(db: AsyncSession, data: OrderCreate) -> Order:
    total_price = 0.0
    order_items = []

    for item_data in data.items:
        result    = await db.execute(select(MenuItem).where(MenuItem.id == item_data.menu_item_id))
        menu_item = result.scalar_one_or_none()
        if not menu_item:
            logger.warning(f"⚠️ Taom topilmadi: id={item_data.menu_item_id}")
            continue
        total_price += menu_item.price * item_data.quantity
        order_items.append(OrderItem(
            menu_item_id = menu_item.id,
            name         = menu_item.name,
            price        = menu_item.price,
            quantity     = item_data.quantity,
            note         = item_data.note,
        ))

    service_fee  = round(total_price * 0.10, 2)
    final_price  = round(total_price + service_fee, 2)
    table_number = await get_table_number_by_session(db, data.table_session_id)

    order = Order(
        table_session_id = data.table_session_id,
        table_number     = table_number,
        note             = data.note,
        total_price      = total_price,
        service_fee      = service_fee,
        final_price      = final_price,
    )
    db.add(order)
    await db.flush()

    for item in order_items:
        item.order_id = order.id
        db.add(item)

    for item_data in data.items:
        result    = await db.execute(select(MenuItem).where(MenuItem.id == item_data.menu_item_id))
        menu_item = result.scalar_one_or_none()
        if menu_item:
            menu_item.order_count += item_data.quantity

    await db.commit()
    await db.refresh(order)

    logger.info(f"🛒 Yangi buyurtma #{order.id} | stol: #{table_number} | session: {data.table_session_id} | summa: {final_price}")

    await manager.notify_chef({
        "type":         "new_order",
        "order_id":     order.id,
        "table_number": table_number,
        "items":        [i.name for i in order_items],
        "time":         _now(),
    })

    return order


async def get_order_by_id(db: AsyncSession, order_id: int) -> Optional[Order]:
    result = await db.execute(select(Order).where(Order.id == order_id))
    return result.scalar_one_or_none()


async def get_orders_by_session(db: AsyncSession, table_session_id: int) -> List[Order]:
    result = await db.execute(
        select(Order).where(Order.table_session_id == table_session_id).order_by(Order.created_at.desc())
    )
    return result.scalars().all()


async def get_active_orders(db: AsyncSession) -> List[Order]:
    result = await db.execute(
        select(Order).where(
            and_(
                Order.status != OrderStatus.DELIVERED.value,
                Order.status != OrderStatus.CANCELLED.value,
            )
        ).order_by(Order.created_at.asc())
    )
    return result.scalars().all()


async def update_order_status(db: AsyncSession, order_id: int, data: OrderStatusUpdate) -> Optional[Order]:
    order = await get_order_by_id(db, order_id)
    if not order:
        logger.warning(f"⚠️ Buyurtma topilmadi: #{order_id}")
        return None

    order.status = data.status.value

    if data.status == OrderStatus.ACCEPTED:
        order.accepted_at = _now()
    elif data.status == OrderStatus.READY:
        order.ready_at = _now()
    elif data.status == OrderStatus.DELIVERED:
        order.delivered_at = _now()

    await db.commit()
    await db.refresh(order)

    logger.info(f"📦 Buyurtma #{order_id} → {data.status.value}")

    await manager.notify_order(order.id, {"type": "status_changed", "status": data.status.value})

    if data.status == OrderStatus.READY:
        table_number = await get_table_number_by_session(db, order.table_session_id)
        from sqlalchemy import select as sel
        from auth.models import User, RoleEnum
        result  = await db.execute(
            sel(User).where(User.role == "waiter").where(User.is_active == True)
        )
        waiters = result.scalars().all()
        await manager.notify_waiter_by_table(
            table_number=table_number,
            message={
                "type":         "order_ready",
                "order_id":     order_id,
                "table_number": table_number,
                "items":        [i.name for i in order.items],
                "ready_at":     _now(),
            },
            waiters=waiters,
        )

    if data.status == OrderStatus.DELIVERED:
        await manager.notify_all_waiters({"type": "order_delivered", "order_id": order_id})

    return order


async def request_payment(db: AsyncSession, order_id: int, data: PaymentRequest) -> Optional[Order]:
    order = await get_order_by_id(db, order_id)
    if not order:
        return None
    if data.payment_status not in (PaymentStatus.CASH, PaymentStatus.CARD):
        return None

    order.payment_status = data.payment_status.value
    await db.commit()
    await db.refresh(order)

    logger.info(f"💳 To'lov so'rovi #{order_id} | usul: {data.payment_status.value}")

    table_number = await get_table_number_by_session(db, order.table_session_id)
    from auth.models import User, RoleEnum
    from sqlalchemy import select as sel
    result  = await db.execute(
        sel(User).where(User.role == "waiter").where(User.is_active == True)
    )
    waiters = result.scalars().all()
    await manager.notify_waiter_by_table(
        table_number=table_number,
        message={
            "type":           "payment_requested",
            "order_id":       order_id,
            "payment_method": data.payment_status.value,
            "table_number":   table_number,
        },
        waiters=waiters,
    )
    return order


async def confirm_payment(db: AsyncSession, order_id: int) -> Optional[Order]:
    order = await get_order_by_id(db, order_id)
    if not order:
        return None
    order.payment_status = PaymentStatus.PAID.value
    await db.commit()
    await db.refresh(order)
    logger.info(f"💰 To'lov tasdiqlandi | buyurtma #{order_id}")
    await manager.notify_order(order_id, {"type": "payment_confirmed"})
    return order


async def create_issue(db: AsyncSession, data: IssueCreate) -> Issue:
    issue = Issue(**data.model_dump())
    db.add(issue)
    await db.commit()
    await db.refresh(issue)
    logger.info(f"🚨 Muammo #{issue.id} | buyurtma: {data.order_id} | tur: {data.issue_type.value}")
    await manager.notify_all_waiters({
        "type":       "new_issue",
        "order_id":   data.order_id,
        "issue_type": data.issue_type.value,
    })
    return issue


async def resolve_issue(db: AsyncSession, issue_id: int) -> Optional[Issue]:
    result = await db.execute(select(Issue).where(Issue.id == issue_id))
    issue  = result.scalar_one_or_none()
    if not issue:
        return None
    issue.status      = IssueStatus.RESOLVED.value
    issue.resolved_at = _now()
    await db.commit()
    await db.refresh(issue)
    logger.info(f"✅ Muammo #{issue_id} hal qilindi")
    return issue


async def get_open_issues(db: AsyncSession) -> List[Issue]:
    result = await db.execute(
        select(Issue).where(Issue.status == IssueStatus.OPEN.value).order_by(Issue.created_at.asc())
    )
    return result.scalars().all()





async def create_rating(db: AsyncSession, data: RatingCreate) -> Rating:
    # order dan table_number topamiz
    order_result = await db.execute(select(Order).where(Order.id == data.order_id))
    order = order_result.scalar_one_or_none()

    waiter_id = data.waiter_id

    # Agar waiter_id berilmagan bo'lsa — stol bo'yicha topamiz
    if not waiter_id and order:
        from auth.models import User, RoleEnum
        waiters_result = await db.execute(
            select(User).where(User.role == "waiter", User.is_active == True)
        )
        waiters = waiters_result.scalars().all()
        for w in waiters:
            if order.table_number in (w.assigned_tables or []):
                waiter_id = w.id
                break

    rating = Rating(
        order_id  = data.order_id,
        waiter_id = waiter_id,
        rating    = data.rating,
        comment   = data.comment,
    )
    db.add(rating)
    await db.commit()
    await db.refresh(rating)
    logger.info(f"⭐ Reyting #{rating.id} | buyurtma: {data.order_id} | ball: {data.rating} | ofitsiant: {waiter_id}")
    return rating




async def get_waiter_stats(db: AsyncSession, waiter_id: int) -> dict:
    from auth.models import User
    result = await db.execute(select(User).where(User.id == waiter_id))
    waiter = result.scalar_one_or_none()
    if not waiter:
        return {}

    assigned_tables = waiter.assigned_tables or []

    # Toshkent vaqti (UTC+5)
    today     = datetime.now(TZ_UZB).date()
    week_ago  = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)

    query = select(Order).where(
        Order.status.in_([OrderStatus.DELIVERED.value, OrderStatus.DELIVERING.value])
    )
    if assigned_tables:
        query = query.where(Order.table_number.in_(assigned_tables))

    result     = await db.execute(query)
    all_orders = result.scalars().all()

    # Oxirgi 7 kun tarixi — Toshkent vaqtida
    daily = {}
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        daily[str(day)] = {"date": str(day), "amount": 0.0, "orders": 0}

    for order in all_orders:
        od = _uzb_date(order.created_at)
        if od:
            day_str = str(od)
            if day_str in daily:
                daily[day_str]["amount"]  = round(daily[day_str]["amount"] + order.service_fee, 2)
                daily[day_str]["orders"] += 1

    # Bugun — Toshkent vaqtida
    today_orders   = [o for o in all_orders if _uzb_date(o.created_at) == today]
    daily_total    = round(sum(o.service_fee for o in today_orders), 2)
    daily_count    = len(today_orders)

    # Haftalik
    weekly_orders  = [o for o in all_orders if _uzb_date(o.created_at) and _uzb_date(o.created_at) >= week_ago]
    weekly_total   = round(sum(o.service_fee for o in weekly_orders), 2)
    weekly_count   = len(weekly_orders)

    # Oylik
    monthly_orders = [o for o in all_orders if _uzb_date(o.created_at) and _uzb_date(o.created_at) >= month_ago]
    monthly_total  = round(sum(o.service_fee for o in monthly_orders), 2)
    monthly_count  = len(monthly_orders)

    return {
        "daily":         daily_total,
        "daily_count":   daily_count,
        "weekly":        weekly_total,
        "weekly_count":  weekly_count,
        "monthly":       monthly_total,
        "monthly_count": monthly_count,
        "total_orders":  len(all_orders),
        "daily_history": list(daily.values()),
    }
