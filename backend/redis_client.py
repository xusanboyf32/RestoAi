# restaurant/backend/redis_client.py

import redis.asyncio as redis
import os

# Redis ulanish
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

redis_client = redis.from_url(REDIS_URL, decode_responses=True)


async def add_to_blacklist(token: str, expire_seconds: int):
    """
    Logout bo'lganda token blacklistga tushadi
    expire_seconds = tokenning qolgan vaqti
    vaqti tugagach Redis o'zi o'chiradi
    """
    await redis_client.setex(
        f"blacklist:{token}",  # kalit
        expire_seconds,         # qancha vaqt saqlanadi
        "true"                  # qiymat (muhim emas)
    )


async def is_blacklisted(token: str) -> bool:
    """
    Token blacklistda bormi?
    """
    result = await redis_client.get(f"blacklist:{token}")
    return result is not None