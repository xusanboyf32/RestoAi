from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from database import get_db
from auth.models import User
from auth.router import get_current_user
from tables import crud
from tables.schemas import TableCreate, TableResponse, ScanRequest, SessionResponse

router = APIRouter(prefix="/tables", tags=["Tables"])


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    from auth.models import RoleEnum
    if current_user.role != RoleEnum.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Faqat admin uchun")
    return current_user


@router.post("/", response_model=TableResponse, status_code=201, summary="Stol yaratish")
async def create_table(
    data: TableCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    existing = await crud.get_table_by_number(db, data.number)
    if existing:
        raise HTTPException(status_code=400, detail=f"{data.number}-stol allaqachon mavjud")
    return await crud.create_table(db, data.number)


@router.get("/", response_model=List[TableResponse], summary="Barcha stollar")
async def get_tables(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    return await crud.get_all_tables(db)


@router.patch("/{table_id}", response_model=TableResponse, summary="Stol raqamini o'zgartirish")
async def update_table(
    table_id: int,
    data: TableCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    from auth.models import Table
    result = await db.execute(select(Table).where(Table.id == table_id))
    table  = result.scalar_one_or_none()
    if not table:
        raise HTTPException(status_code=404, detail="Stol topilmadi")
    existing = await crud.get_table_by_number(db, data.number)
    if existing and existing.id != table_id:
        raise HTTPException(status_code=400, detail=f"{data.number}-stol allaqachon mavjud")
    table.number = data.number
    await db.commit()
    await db.refresh(table)
    return table


@router.delete("/{table_id}", summary="Stolni o'chirish")
async def delete_table(
    table_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    from auth.models import Table, TableSession
    from sqlalchemy import delete

    # Avval sessiyalarni o'chiramiz
    await db.execute(delete(TableSession).where(TableSession.table_id == table_id))

    # Keyin stolni o'chiramiz
    result = await db.execute(select(Table).where(Table.id == table_id))
    table  = result.scalar_one_or_none()
    if not table:
        raise HTTPException(status_code=404, detail="Stol topilmadi")

    await db.delete(table)
    await db.commit()
    return {"message": "Stol o'chirildi ✅"}




@router.delete("/{table_id}/session", summary="Sessiyani yopish")
async def close_session(
    table_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    session = await crud.close_session(db, table_id)
    if not session:
        raise HTTPException(status_code=404, detail="Aktiv sessiya topilmadi")
    return {"message": "Sessiya yopildi ✅"}


@router.post("/scan", response_model=SessionResponse, summary="QR skaner")
async def scan_qr(data: ScanRequest, db: AsyncSession = Depends(get_db)):
    table = await crud.get_table_by_qr(db, data.qr_code)
    if not table:
        raise HTTPException(status_code=404, detail="Stol topilmadi — QR kod noto'g'ri")
    if not table.is_active:
        raise HTTPException(status_code=400, detail="Bu stol hozir yopiq")
    session = await crud.create_session(db, table)
    return SessionResponse(
        id=session.id,
        table_id=table.id,
        table_number=table.number,
        session_token=session.session_token,
        is_active=session.is_active,
    )


@router.get("/{table_id}/qr", summary="QR kod rasmi")
async def get_qr_image(
    table_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    from tables.crud import get_table_by_id, generate_qr_image
    table = await get_table_by_id(db, table_id)
    if not table:
        raise HTTPException(status_code=404, detail="Stol topilmadi")
    buf = generate_qr_image(table.qr_code)
    return StreamingResponse(buf, media_type="image/png")