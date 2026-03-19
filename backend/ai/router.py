from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional, List

from database import get_db
from ai.service import chat

router = APIRouter(prefix="/ai", tags=["AI"])


class ChatRequest(BaseModel):
    message:      str
    session_id:   Optional[str]       = "default"
    favorite_ids: Optional[List[int]] = []


class RecommendedItem(BaseModel):
    menu_item_id: int
    name:         str
    price:        float


class ChatResponse(BaseModel):
    message:           str
    recommended_items: List[RecommendedItem] = []


@router.post("/chat", response_model=ChatResponse)
async def ai_chat(data: ChatRequest, db: AsyncSession = Depends(get_db)):
    result = await chat(
        message      = data.message,
        db           = db,
        session_id   = data.session_id or "default",
        favorite_ids = data.favorite_ids or [],
    )
    return result
