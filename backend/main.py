from fastapi import FastAPI
from fastapi.responses import RedirectResponse, JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from core.logger import setup_logger
from fastapi.staticfiles import StaticFiles
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import datetime, timedelta
from sqlalchemy import delete
import time

from database import engine, AsyncSessionLocal
from auth.router import router as auth_router
from redis_client import redis_client
from menu.router import router as menu_router
from order.router import router as order_router
from tables.router import router as tables_router
from websocket.router import router as ws_router
from ai.router import router as ai_router
from search.router import router as search_router
from upload.router import router as upload_router
from ai.rag import index_menu

logger    = setup_logger("main")
limiter   = Limiter(key_func=get_remote_address)
scheduler = AsyncIOScheduler()


async def cleanup_old_orders():
    from order.models import Order
    cutoff = datetime.utcnow() - timedelta(hours=72)
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            delete(Order).where(
                Order.status == "delivered",
                Order.updated_at < cutoff,
            )
        )
        await db.commit()
        deleted = result.rowcount
        if deleted:
            logger.info(f"🗑️ {deleted} ta eski buyurtma o'chirildi")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await redis_client.ping()
    logger.info("✅ Redis ulandi")
    logger.info("✅ PostgreSQL ulandi")

    async with AsyncSessionLocal() as db:
        await index_menu(db)
        logger.info("✅ AI menyu indexed")

    scheduler.add_job(cleanup_old_orders, "interval", hours=6)
    scheduler.start()
    logger.info("✅ Scheduler ishga tushdi")

    yield

    scheduler.shutdown()
    await redis_client.aclose()
    await engine.dispose()
    logger.info("🔴 Server yopildi")


app = FastAPI(
    title="RestoAI",
    description="Restaurant AI tizimi",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.include_router(auth_router)
app.include_router(menu_router)
app.include_router(order_router)
app.include_router(tables_router)
app.include_router(ws_router)
app.include_router(ai_router)
app.include_router(search_router)
app.include_router(upload_router)


@app.middleware("http")
async def log_requests(request, call_next):
    start    = time.time()
    response = await call_next(request)
    duration = round((time.time() - start) * 1000, 2)
    logger.info(f"{request.method} {request.url.path} → {response.status_code} | {duration}ms")
    return response


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request, exc):
    logger.warning(f"⚠️ Validation xato: {exc.errors()}")
    return JSONResponse(status_code=422, content={"detail": "Ma'lumotlar noto'g'ri"})


@app.exception_handler(Exception)
async def global_error_handler(request, exc):
    logger.error(f"❌ Server xato: {exc}")
    return JSONResponse(status_code=500, content={"detail": "Server xatosi"})


@app.get("/")
async def root():
    return RedirectResponse(url="/docs")


app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
