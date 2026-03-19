from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from auth.models import User
from auth.schemas import UserCreate
import bcrypt


def hash_password(password: str) -> str:
    return bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8")
    )


async def get_user_by_username(db: AsyncSession, username: str) -> User | None:
    result = await db.execute(
        select(User)
        .where(User.username == username)
        .where(User.is_active == True)
    )
    return result.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: int) -> User | None:
    result = await db.execute(
        select(User)
        .where(User.id == user_id)
        .where(User.is_active == True)
    )
    return result.scalar_one_or_none()


async def create_user(db: AsyncSession, data: UserCreate) -> User:
    user = User(
        full_name        = data.full_name,
        username         = data.username,
        hashed_password  = hash_password(data.password),
        role             = data.role,
        is_active        = True,
        assigned_tables  = [],
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def authenticate_user(db: AsyncSession, username: str, password: str) -> User | None:
    user = await get_user_by_username(db, username)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


async def get_waiters(db: AsyncSession) -> list[User]:
    result = await db.execute(
        select(User)
        .where(User.role == "waiter")
        .where(User.is_active == True)
    )
    return result.scalars().all()