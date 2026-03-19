# search/router.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from typing import Optional

from database import get_db
from menu.models import MenuItem, MenuCategory, ComboSet
from menu.schemas import MenuItemResponse, CategoryResponse, ComboResponse
from pydantic import BaseModel
from typing import List

router = APIRouter(prefix="/search", tags=["Search"])


class SearchResponse(BaseModel):
    items:      List[MenuItemResponse]
    categories: List[CategoryResponse]
    combos:     List[ComboResponse]
    total:      int


@router.get("/", response_model=SearchResponse, summary="Umumiy qidiruv")
async def global_search(
    q:  str            = Query(..., min_length=1, description="Qidiruv so'zi"),
    db: AsyncSession   = Depends(get_db),
):
    q = q.strip()

    # Taomlar
    items_result = await db.execute(
        select(MenuItem).where(
            MenuItem.is_active  == True,
            MenuItem.is_deleted == False,
            or_(
                MenuItem.name.ilike(f"%{q}%"),
                MenuItem.description.ilike(f"%{q}%"),
            )
        ).limit(20)
    )
    items = items_result.scalars().all()

    # Kategoriyalar
    cats_result = await db.execute(
        select(MenuCategory).where(
            MenuCategory.is_active == True,
            MenuCategory.name.ilike(f"%{q}%"),
        ).limit(10)
    )
    categories = cats_result.scalars().all()

    # Combolar
    combos_result = await db.execute(
        select(ComboSet).where(
            ComboSet.is_active == True,
            ComboSet.name.ilike(f"%{q}%"),
        ).limit(10)
    )
    combos = combos_result.scalars().all()

    # Tags — item uchun
    from menu.crud import _get_tags
    for item in items:
        item.tags = await _get_tags(db, item.id)

    total = len(items) + len(categories) + len(combos)

    return {
        "items":      items,
        "categories": categories,
        "combos":     combos,
        "total":      total,
    }

