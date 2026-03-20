from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from core.limiter import limiter

from database import get_db
from redis_client import add_to_blacklist, is_blacklisted
from core.security import (
    create_access_token, create_refresh_token,
    decode_token, get_token_remaining_seconds
)
from core.logger import setup_logger
from auth import crud
from auth.models import User
from auth.schemas import UserCreate, UserLogin, Token, RefreshRequest, UserResponse, AssignTablesRequest

router        = APIRouter(prefix="/auth", tags=["auth"])
bearer_scheme = HTTPBearer()
logger        = setup_logger("auth")


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db)
) -> UserResponse:
    token = credentials.credentials
    if await is_blacklisted(token):
        raise HTTPException(status_code=401, detail="Token bekor qilingan")
    payload = decode_token(token)
    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Access token kerak")
    user = await crud.get_user_by_username(db, payload["sub"])
    if not user:
        raise HTTPException(status_code=401, detail="Foydalanuvchi topilmadi")
    return user


# @router.post("/register", response_model=UserResponse)
# async def register(data: UserCreate, db: AsyncSession = Depends(get_db)):
#     existing = await crud.get_user_by_username(db, data.username)
#     if existing:
#         raise HTTPException(status_code=400, detail="Bu username band")
#     user = await crud.create_user(db, data)
#     logger.info(f"✅ Yangi user: {user.username} | role: {user.role}")
#     return user


@router.post("/login", response_model=Token)
@limiter.limit("5/minute")
async def login(request: Request, data: UserLogin, db: AsyncSession = Depends(get_db)):
    user = await crud.authenticate_user(db, data.username, data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Username yoki parol noto'g'ri")
    access_token  = create_access_token(user.username, user.role)
    refresh_token = create_refresh_token(user.username, user.role)
    logger.info(f"✅ Login: {user.username} | role: {user.role}")
    return Token(access_token=access_token, refresh_token=refresh_token, token_type="bearer", role=user.role)


@router.post("/refresh", response_model=Token)
async def refresh(data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    if await is_blacklisted(data.refresh_token):
        raise HTTPException(status_code=401, detail="Token bekor qilingan")
    payload = decode_token(data.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Refresh token kerak")
    user = await crud.get_user_by_username(db, payload["sub"])
    if not user:
        raise HTTPException(status_code=401, detail="Foydalanuvchi topilmadi")
    new_access_token  = create_access_token(user.username, user.role)
    new_refresh_token = create_refresh_token(user.username, user.role)
    return Token(access_token=new_access_token, refresh_token=new_refresh_token, token_type="bearer", role=user.role)


@router.post("/logout")
async def logout(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
    token     = credentials.credentials
    remaining = get_token_remaining_seconds(token)
    await add_to_blacklist(token, remaining)
    return {"message": "Muvaffaqiyatli chiqildi ✅"}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: UserResponse = Depends(get_current_user)):
    return current_user


@router.post("/admin/create-user", response_model=UserResponse)
async def admin_create_user(
    data: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Faqat admin uchun")
    if data.role == "admin":  # ← shu qatorni qo'shing
        raise HTTPException(status_code=403, detail="Admin yarata olmaysiz")
    existing = await crud.get_user_by_username(db, data.username)
    if existing:
        raise HTTPException(status_code=400, detail="Bu username band")
    user = await crud.create_user(db, data)
    logger.info(f"✅ Admin user yaratdi: {user.username} | role: {user.role}")
    return user


@router.get("/admin/users", response_model=list[UserResponse])
async def admin_get_users(
    db: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Faqat admin uchun")
    result = await db.execute(
        select(User).where(
            User.is_active == True,
            User.role != "admin"  # ← shu qator qo'shildi
        )
    )
    return result.scalars().all()


@router.patch("/admin/users/{user_id}", response_model=UserResponse)
async def admin_update_user(
    user_id: int,
    data: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Faqat admin uchun")
    if user_id == current_user.id:  # ← shu qator qo'shildi
        raise HTTPException(status_code=400, detail="O'zingizni edit qila olmaysiz")
    result = await db.execute(select(User).where(User.id == user_id))
    user   = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")
    if data.username != user.username:
        existing = await crud.get_user_by_username(db, data.username)
        if existing:
            raise HTTPException(status_code=400, detail="Bu username band")
    user.full_name = data.full_name
    user.username  = data.username
    user.role      = data.role
    if data.password:
        from auth.crud import hash_password
        user.hashed_password = hash_password(data.password)
    await db.commit()
    await db.refresh(user)
    logger.info(f"✅ User yangilandi: {user.username}")
    return user


@router.delete("/admin/users/{user_id}")
async def admin_delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Faqat admin uchun")
    result = await db.execute(select(User).where(User.id == user_id))
    user   = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="O'zingizni o'chira olmaysiz")
    user.is_active = False
    await db.commit()
    logger.info(f"🗑️ User o'chirildi: {user.username}")
    return {"message": "Foydalanuvchi o'chirildi ✅"}


@router.patch("/admin/users/{user_id}/assign-tables", response_model=UserResponse)
async def assign_tables(
    user_id: int,
    data: AssignTablesRequest,
    db: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Faqat admin uchun")
    result = await db.execute(select(User).where(User.id == user_id))
    user   = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")
    if user.role != "waiter":
        raise HTTPException(status_code=400, detail="Faqat ofitsianlarga stol biriktiriladi")
    user.assigned_tables = data.table_ids
    await db.commit()
    await db.refresh(user)
    logger.info(f"✅ Stollar biriktirildi: {user.username} → {data.table_ids}")
    return user