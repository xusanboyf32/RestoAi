from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, insert, delete, and_, or_, func
from typing import Optional, List
from datetime import datetime

from menu.models import (
    MenuCategory,
    MenuItem,
    ComboSet,
    ComboItem,
    menu_item_tags,
    FoodAvailability as FoodAvailabilityEnum,
    Banner,
)
from menu.schemas import (
    CategoryCreate,
    CategoryUpdate,
    MenuItemCreate,
    MenuItemUpdate,
    ComboCreate,
    ComboUpdate,
    FoodAvailability,
    FoodTag,
    BannerCreate,
)


async def _set_tags(db: AsyncSession, item_id: int, tags: List[FoodTag]) -> None:
    await db.execute(
        delete(menu_item_tags).where(
            menu_item_tags.c.menu_item_id == item_id
        )
    )
    if tags:
        await db.execute(
            insert(menu_item_tags),
            [{"menu_item_id": item_id, "tag": tag.value} for tag in tags]
        )


async def _get_tags(db: AsyncSession, item_id: int) -> List[str]:
    result = await db.execute(
        select(menu_item_tags.c.tag).where(
            menu_item_tags.c.menu_item_id == item_id
        )
    )
    return [row[0] for row in result.fetchall()]


# ── Category ─────────────────────────────────────────────

async def create_category(db: AsyncSession, data: CategoryCreate) -> MenuCategory:
    category = MenuCategory(**data.model_dump())
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category


async def get_categories(db: AsyncSession, include_inactive: bool = False) -> List[MenuCategory]:
    query = select(MenuCategory).order_by(MenuCategory.sort_order, MenuCategory.id)
    if not include_inactive:
        query = query.where(MenuCategory.is_active == True)
    result = await db.execute(query)
    return result.scalars().all()


async def get_category_by_id(db: AsyncSession, category_id: int) -> Optional[MenuCategory]:
    result = await db.execute(
        select(MenuCategory).where(MenuCategory.id == category_id)
    )
    return result.scalar_one_or_none()


async def update_category(db: AsyncSession, category_id: int, data: CategoryUpdate) -> Optional[MenuCategory]:
    category = await get_category_by_id(db, category_id)
    if not category:
        return None
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(category, field, value)
    await db.commit()
    await db.refresh(category)
    return category


async def delete_category(db: AsyncSession, category_id: int) -> bool:
    category = await get_category_by_id(db, category_id)
    if not category:
        return False
    await db.delete(category)
    await db.commit()
    return True


# ── MenuItem ─────────────────────────────────────────────

async def create_menu_item(db: AsyncSession, data: MenuItemCreate) -> MenuItem:
    tags      = data.tags
    item_data = data.model_dump(exclude={"tags"})
    item      = MenuItem(**item_data)
    db.add(item)
    await db.flush()
    await _set_tags(db, item.id, tags)
    await db.commit()
    await db.refresh(item)
    item.tags = await _get_tags(db, item.id)
    return item


async def get_menu_items(
    db:               AsyncSession,
    page:             int            = 1,
    limit:            int            = 30,
    search:           Optional[str]  = None,
    category_id:      Optional[int]  = None,
    min_price:        Optional[float]= None,
    max_price:        Optional[float]= None,
    is_sale:          Optional[bool] = None,
    is_diabetes_safe: Optional[bool] = None,
    is_heart_safe:    Optional[bool] = None,
    is_gluten_free:   Optional[bool] = None,
    sort:             Optional[str]  = None,
) -> dict:
    query = select(MenuItem).where(
        MenuItem.is_active  == True,
        MenuItem.is_deleted == False,
    )

    if search:
        query = query.where(
            or_(
                MenuItem.name.ilike(f"%{search}%"),
                MenuItem.description.ilike(f"%{search}%"),
            )
        )
    if category_id:
        query = query.where(MenuItem.category_id == category_id)
    if min_price is not None:
        query = query.where(MenuItem.price >= min_price)
    if max_price is not None:
        query = query.where(MenuItem.price <= max_price)
    if is_sale is not None:
        query = query.where(MenuItem.is_sale == is_sale)
    if is_diabetes_safe is not None:
        query = query.where(MenuItem.is_diabetes_safe == is_diabetes_safe)
    if is_heart_safe is not None:
        query = query.where(MenuItem.is_heart_safe == is_heart_safe)
    if is_gluten_free is not None:
        query = query.where(MenuItem.is_gluten_free == is_gluten_free)

    if sort == "price_asc":
        query = query.order_by(MenuItem.price.asc())
    elif sort == "price_desc":
        query = query.order_by(MenuItem.price.desc())
    elif sort == "popular":
        query = query.order_by(MenuItem.order_count.desc())
    elif sort == "newest":
        query = query.order_by(MenuItem.created_at.desc())
    else:
        query = query.order_by(MenuItem.sort_order.asc())

    count_result = await db.execute(
        select(func.count()).select_from(query.subquery())
    )
    total = count_result.scalar()

    offset = (page - 1) * limit
    query  = query.offset(offset).limit(limit)

    result = await db.execute(query)
    items  = result.scalars().all()

    for item in items:
        item.tags = await _get_tags(db, item.id)

    return {
        "items":       items,
        "total":       total,
        "page":        page,
        "limit":       limit,
        "total_pages": (total + limit - 1) // limit,
    }


async def get_menu_item_by_id(db: AsyncSession, item_id: int) -> Optional[MenuItem]:
    result = await db.execute(
        select(MenuItem).where(MenuItem.id == item_id)
    )
    item = result.scalar_one_or_none()
    if item:
        item.tags = await _get_tags(db, item.id)
    return item


async def update_menu_item(db: AsyncSession, item_id: int, data: MenuItemUpdate) -> Optional[MenuItem]:
    item = await get_menu_item_by_id(db, item_id)
    if not item:
        return None
    for field, value in data.model_dump(exclude_none=True, exclude={"tags"}).items():
        setattr(item, field, value)
    if data.tags is not None:
        await _set_tags(db, item_id, data.tags)
    await db.commit()
    await db.refresh(item)
    item.tags = await _get_tags(db, item_id)
    return item


async def delete_menu_item(db: AsyncSession, item_id: int) -> bool:
    item = await get_menu_item_by_id(db, item_id)
    if not item:
        return False
    await db.delete(item)
    await db.commit()
    return True


async def set_availability(db: AsyncSession, item_id: int, availability: FoodAvailability) -> Optional[MenuItem]:
    item = await get_menu_item_by_id(db, item_id)
    if not item:
        return None
    item.availability = availability.value
    await db.commit()
    await db.refresh(item)
    item.tags = await _get_tags(db, item_id)
    return item


# ── Combo ────────────────────────────────────────────────

async def create_combo(db: AsyncSession, data: ComboCreate) -> ComboSet:
    combo_items_data = data.items
    combo_data       = data.model_dump(exclude={"items"})
    combo            = ComboSet(**combo_data)
    db.add(combo)
    await db.flush()
    for ci in combo_items_data:
        combo_item = ComboItem(combo_id=combo.id, **ci.model_dump())
        db.add(combo_item)
    await db.commit()
    await db.refresh(combo)
    return combo


async def get_combos(db: AsyncSession, only_active: bool = True) -> List[ComboSet]:
    query = select(ComboSet)
    if only_active:
        query = query.where(ComboSet.is_active == True)
    result = await db.execute(query)
    return result.scalars().all()


async def update_combo(db: AsyncSession, combo_id: int, data: ComboUpdate) -> Optional[ComboSet]:
    result = await db.execute(select(ComboSet).where(ComboSet.id == combo_id))
    combo  = result.scalar_one_or_none()
    if not combo:
        return None
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(combo, field, value)
    await db.commit()
    await db.refresh(combo)
    return combo


async def delete_combo(db: AsyncSession, combo_id: int) -> bool:
    result = await db.execute(select(ComboSet).where(ComboSet.id == combo_id))
    combo  = result.scalar_one_or_none()
    if not combo:
        return False
    await db.delete(combo)
    await db.commit()
    return True


async def get_full_menu(db: AsyncSession) -> dict:
    categories = await get_categories(db)
    for category in categories:
        result = await db.execute(
            select(MenuItem).where(
                MenuItem.category_id == category.id,
                MenuItem.is_active   == True,
                MenuItem.is_deleted  == False,
            ).order_by(MenuItem.sort_order)
        )
        items = result.scalars().all()
        for item in items:
            item.tags = await _get_tags(db, item.id)
        category.items = items
    combos = await get_combos(db)
    return {"categories": categories, "combos": combos}


# ── Banner ───────────────────────────────────────────────

async def create_banner(db: AsyncSession, data: BannerCreate) -> Banner:
    banner_data = data.model_dump()
    if banner_data.get("start_date"):
        banner_data["start_date"] = banner_data["start_date"].replace(tzinfo=None)
    if banner_data.get("end_date"):
        banner_data["end_date"] = banner_data["end_date"].replace(tzinfo=None)
    banner = Banner(**banner_data)
    db.add(banner)
    await db.commit()
    await db.refresh(banner)
    return banner


async def get_active_banners(db: AsyncSession) -> List[Banner]:
    now    = datetime.utcnow()
    result = await db.execute(
        select(Banner)
        .where(
            and_(
                Banner.is_active  == True,
                (Banner.start_date == None) | (Banner.start_date <= now),
                (Banner.end_date   == None) | (Banner.end_date   >= now),
            )
        )
        .order_by(Banner.sort_order)
    )
    return result.scalars().all()


async def delete_banner(db: AsyncSession, banner_id: int) -> bool:
    result = await db.execute(select(Banner).where(Banner.id == banner_id))
    banner = result.scalar_one_or_none()
    if not banner:
        return False
    await db.delete(banner)
    await db.commit()
    return True


"""

Saqlang, serverni ishga tushiring, test qiling:
```
GET /menu/items?search=lag
GET /menu/items?sort=price_asc&page=1&limit=30
GET /menu/items?is_sale=true

"""



## 3 fayl o'rtasida bog'lanish:
"""
MenuItemCreate (schemas)
       ↓
create_menu_item (crud)
       ↓
MenuItem (models) → menu_items jadvaliga yoziladi
menu_item_tags    → teglar yoziladi
"""