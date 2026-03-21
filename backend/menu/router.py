from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional, List
from pydantic import BaseModel

from database import get_db
from auth.models import User, RoleEnum
from auth.router import get_current_user
from menu import crud
from menu.models import MenuItemReview, MenuItem
from menu.schemas import (
    CategoryCreate, CategoryUpdate, CategoryResponse,
    MenuItemCreate, MenuItemUpdate, MenuItemResponse, MenuItemListResponse,
    ComboCreate, ComboUpdate, ComboResponse,
    FullMenuResponse, FoodAvailability,
    BannerCreate, BannerResponse,
)

router = APIRouter(prefix="/menu", tags=["Menu"])


class ReviewCreate(BaseModel):
    comment: str
    rating:  Optional[int] = None


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Faqat admin uchun")
    return current_user


def require_chef_or_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in ("admin", "chef"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Faqat oshpaz yoki admin uchun")
    return current_user


async def _get_ratings_map(db: AsyncSession, item_ids: list) -> dict:
    if not item_ids:
        return {}
    result = await db.execute(
        select(
            MenuItemReview.menu_item_id,
            func.avg(MenuItemReview.rating).label("avg_rating"),
            func.count(MenuItemReview.id).label("review_count"),
        )
        .where(
            MenuItemReview.menu_item_id.in_(item_ids),
            MenuItemReview.rating > 0,
        )
        .group_by(MenuItemReview.menu_item_id)
    )
    rows = result.all()
    return {
        row.menu_item_id: {
            "avg_rating":   round(float(row.avg_rating), 1) if row.avg_rating else None,
            "review_count": row.review_count,
        }
        for row in rows
    }


# ── Public ───────────────────────────────────────────────

@router.get("/", response_model=FullMenuResponse, summary="To'liq menyu")
async def get_full_menu(db: AsyncSession = Depends(get_db)):
    return await crud.get_full_menu(db)


@router.get("/categories", response_model=List[CategoryResponse], summary="Barcha kategoriyalar")
async def list_categories(db: AsyncSession = Depends(get_db)):
    return await crud.get_categories(db)


@router.get("/items", response_model=MenuItemListResponse, summary="Taomlar")
async def list_items(
    page:        int             = Query(1, ge=1),
    limit:       int             = Query(30, ge=1, le=100),
    search:      Optional[str]   = Query(None),
    category_id: Optional[int]   = Query(None),
    min_price:   Optional[float] = Query(None),
    max_price:   Optional[float] = Query(None),
    is_sale:     Optional[bool]  = Query(None),
    is_diabetes_safe: Optional[bool] = Query(None),
    is_heart_safe:    Optional[bool] = Query(None),
    is_gluten_free:   Optional[bool] = Query(None),
    sort: Optional[str] = Query(None, enum=["price_asc", "price_desc", "popular", "newest"]),
    db: AsyncSession = Depends(get_db),
):
    res = await crud.get_menu_items(
        db=db, page=page, limit=limit, search=search,
        category_id=category_id, min_price=min_price, max_price=max_price,
        is_sale=is_sale, is_diabetes_safe=is_diabetes_safe,
        is_heart_safe=is_heart_safe, is_gluten_free=is_gluten_free, sort=sort,
    )

    # crud dict qaytaradi
    food_items  = res["items"]
    item_ids    = [i.id for i in food_items]
    ratings_map = await _get_ratings_map(db, item_ids)

    updated_items = []
    for item in food_items:
        info = ratings_map.get(item.id, {})
        # SQLAlchemy model ga to'g'ridan attribute set qilib bo'lmaydi,
        # shuning uchun MenuItemResponse orqali o'tamiz
        resp = MenuItemResponse.model_validate(item)
        resp.avg_rating   = info.get("avg_rating")
        resp.review_count = info.get("review_count", 0)
        updated_items.append(resp)

    return MenuItemListResponse(
        items=updated_items,
        total=res["total"],
        page=res["page"],
        limit=res["limit"],
        total_pages=res["total_pages"],
    )


@router.get("/items/{item_id}", response_model=MenuItemResponse, summary="Bitta taom")
async def get_item(item_id: int, db: AsyncSession = Depends(get_db)):
    item = await crud.get_menu_item_by_id(db, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Taom topilmadi")
    ratings_map = await _get_ratings_map(db, [item_id])
    resp = MenuItemResponse.model_validate(item)
    info = ratings_map.get(item_id, {})
    resp.avg_rating   = info.get("avg_rating")
    resp.review_count = info.get("review_count", 0)
    return resp


# ── Reviews ──────────────────────────────────────────────

@router.get("/items/{item_id}/reviews")
async def get_reviews(item_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(MenuItemReview)
        .where(MenuItemReview.menu_item_id == item_id)
        .order_by(MenuItemReview.likes.desc(), MenuItemReview.created_at.desc())
    )
    reviews = result.scalars().all()
    rated   = [r for r in reviews if r.rating and r.rating > 0]
    avg     = round(sum(r.rating for r in rated) / len(rated), 1) if rated else None

    return {
        "avg_rating":   avg,
        "review_count": len(rated),
        "reviews": [
            {
                "id":         r.id,
                "comment":    r.comment,
                "rating":     r.rating or 0,
                "likes":      r.likes,
                "created_at": str(r.created_at),
            }
            for r in reviews
        ]
    }


@router.post("/items/{item_id}/reviews", status_code=201)
async def add_review(
    item_id: int,
    data:    ReviewCreate,
    db:      AsyncSession = Depends(get_db),
):
    if not data.comment.strip():
        raise HTTPException(status_code=400, detail="Fikr bo'sh bo'lmasligi kerak")
    rating = None
    if data.rating is not None:
        if not (1 <= data.rating <= 5):
            raise HTTPException(status_code=400, detail="Reyting 1 dan 5 gacha bo'lishi kerak")
        rating = data.rating
    review = MenuItemReview(
        menu_item_id=item_id,
        comment=data.comment.strip(),
        rating=rating or 0,
    )
    db.add(review)
    await db.commit()
    await db.refresh(review)
    return {
        "id":         review.id,
        "comment":    review.comment,
        "rating":     review.rating,
        "likes":      review.likes,
        "created_at": str(review.created_at),
    }


@router.post("/items/{item_id}/reviews/{review_id}/like")
async def like_review(item_id: int, review_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(MenuItemReview).where(
            MenuItemReview.id == review_id,
            MenuItemReview.menu_item_id == item_id,
        )
    )
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Fikr topilmadi")
    review.likes += 1
    await db.commit()
    return {"likes": review.likes}


@router.delete("/items/{item_id}/reviews/{review_id}", status_code=204)
async def delete_review(
    item_id:   int,
    review_id: int,
    db:        AsyncSession = Depends(get_db),
    _:         User         = Depends(require_admin),
):
    result = await db.execute(
        select(MenuItemReview).where(
            MenuItemReview.id == review_id,
            MenuItemReview.menu_item_id == item_id,
        )
    )
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Fikr topilmadi")
    await db.delete(review)
    await db.commit()


# ── Combos & Banners ─────────────────────────────────────

@router.get("/combos", response_model=List[ComboResponse])
async def list_combos(db: AsyncSession = Depends(get_db)):
    return await crud.get_combos(db)


@router.get("/banners", response_model=List[BannerResponse])
async def get_banners(db: AsyncSession = Depends(get_db)):
    return await crud.get_active_banners(db)


# ── Admin ────────────────────────────────────────────────

@router.post("/categories", response_model=CategoryResponse, status_code=201)
async def create_category(data: CategoryCreate, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    return await crud.create_category(db, data)


@router.patch("/categories/{category_id}", response_model=CategoryResponse)
async def update_category(category_id: int, data: CategoryUpdate, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    category = await crud.update_category(db, category_id, data)
    if not category:
        raise HTTPException(status_code=404, detail="Kategoriya topilmadi")
    return category


@router.delete("/categories/{category_id}", status_code=204)
async def delete_category(category_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    deleted = await crud.delete_category(db, category_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Kategoriya topilmadi")


@router.post("/items", response_model=MenuItemResponse, status_code=201)
async def create_item(data: MenuItemCreate, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    return await crud.create_menu_item(db, data)


@router.patch("/items/{item_id}", response_model=MenuItemResponse)
async def update_item(item_id: int, data: MenuItemUpdate, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    item = await crud.update_menu_item(db, item_id, data)
    if not item:
        raise HTTPException(status_code=404, detail="Taom topilmadi")
    return item


@router.delete("/items/{item_id}", status_code=204)
async def delete_item(item_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    deleted = await crud.delete_menu_item(db, item_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Taom topilmadi")


@router.post("/combos", response_model=ComboResponse, status_code=201)
async def create_combo(data: ComboCreate, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    return await crud.create_combo(db, data)


@router.patch("/combos/{combo_id}", response_model=ComboResponse)
async def update_combo(combo_id: int, data: ComboUpdate, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    combo = await crud.update_combo(db, combo_id, data)
    if not combo:
        raise HTTPException(status_code=404, detail="Combo topilmadi")
    return combo


@router.delete("/combos/{combo_id}", status_code=204)
async def delete_combo(combo_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    deleted = await crud.delete_combo(db, combo_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Combo topilmadi")


@router.post("/banners", response_model=BannerResponse, status_code=201)
async def create_banner(data: BannerCreate, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    return await crud.create_banner(db, data)


@router.delete("/banners/{banner_id}", status_code=204)
async def delete_banner(banner_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    deleted = await crud.delete_banner(db, banner_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Banner topilmadi")


@router.patch("/items/{item_id}/availability", response_model=MenuItemResponse)
async def set_availability(
    item_id:      int,
    availability: FoodAvailability,
    db:           AsyncSession = Depends(get_db),
    _:            User         = Depends(require_chef_or_admin),
):
    item = await crud.set_availability(db, item_id, availability)
    if not item:
        raise HTTPException(status_code=404, detail="Taom topilmadi")
    return item


@router.post("/admin/reindex-ai", status_code=200)
async def reindex_ai(db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    from ai.rag import index_menu
    await index_menu(db)
    return {"message": "AI menyusi yangilandi"}