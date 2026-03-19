# tables/crud.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List
import secrets

from auth.models import Table, TableSession


async def create_table(
    db: AsyncSession,
    number: int
) -> Table:
    token = secrets.token_urlsafe(8)
    qr_code = f"table-{number}-{token}"

    table = Table(
        number=number,
        qr_code=qr_code,
    )
    db.add(table)
    await db.commit()
    await db.refresh(table)
    return table


async def get_table_by_number(
    db: AsyncSession,
    number: int
) -> Optional[Table]:
    result = await db.execute(
        select(Table).where(Table.number == number)
    )
    return result.scalar_one_or_none()


async def get_all_tables(
    db: AsyncSession,
) -> List[Table]:
    result = await db.execute(
        select(Table).order_by(Table.number)
    )
    return result.scalars().all()


async def get_table_by_qr(
    db: AsyncSession,
    qr_code: str
) -> Optional[Table]:
    result = await db.execute(
        select(Table).where(Table.qr_code == qr_code)
    )
    return result.scalar_one_or_none()


async def create_session(
    db: AsyncSession,
    table: Table
) -> TableSession:
    result = await db.execute(
        select(TableSession).where(
            TableSession.table_id == table.id,
            TableSession.is_active == True
        )
    )
    old_session = result.scalar_one_or_none()
    if old_session:
        old_session.is_active = False
        await db.flush()

    session = TableSession(
        table_id=table.id,
        session_token=secrets.token_urlsafe(32),
        is_active=True,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


async def close_session(
    db: AsyncSession,
    table_id: int
) -> Optional[TableSession]:
    result = await db.execute(
        select(TableSession).where(
            TableSession.table_id == table_id,
            TableSession.is_active == True
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        return None

    session.is_active = False
    await db.commit()
    await db.refresh(session)
    return session



import qrcode
import io

async def get_table_by_id(
    db: AsyncSession,
    table_id: int
) -> Optional[Table]:
    result = await db.execute(
        select(Table).where(Table.id == table_id)
    )
    return result.scalar_one_or_none()


def generate_qr_image(data: str) -> io.BytesIO:
    img = qrcode.make(data)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf

"""

---

## Qisqacha:
```
create_table  → stol yaratadi, qr_code avtomatik
get_all_tables → admin barcha stollarni ko'radi
get_table_by_qr → QR skaner qilganda stolni topadi

create_session → yangi session yaratadi
                 avvalgi sessiyani yopadi
close_session  → to'lovdan keyin sessiyani yopadi
"""