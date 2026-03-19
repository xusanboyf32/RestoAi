import asyncio
from database import AsyncSessionLocal
from auth.models import User, RoleEnum
from auth.crud import hash_password


async def create_admin():
    async with AsyncSessionLocal() as db:
        admin = User(
            full_name="Admin",
            username="admin",
            hashed_password=hash_password("admin123"),
            role=RoleEnum.admin
        )
        db.add(admin)
        await db.commit()
        print("✅ Admin yaratildi — username: admin, password: admin123")


asyncio.run(create_admin())