# modeli esa auth/models da qoshib yozilgan model shart emas scheams yetarli 

# tables/schemas.py
from pydantic import BaseModel, Field
from typing import Optional


# ─── STOL ────────────────────────────────────────────────

class TableCreate(BaseModel):
    number: int = Field(..., ge=1, description="Stol raqami")


class TableResponse(BaseModel):
    id:        int
    number:    int
    qr_code:   str
    is_active: bool

    model_config = {"from_attributes": True}


# ─── SESSION ─────────────────────────────────────────────

class ScanRequest(BaseModel):
    qr_code: str = Field(..., description="QR kod qiymati")


class SessionResponse(BaseModel):
    id:            int
    table_id:      int
    table_number:  int        # mijozga stol raqami ko'rinadi
    session_token: str        # mijoz shu token bilan buyurtma beradi
    is_active:     bool

    model_config = {"from_attributes": True}

"""

---

## Qisqacha:
```
TableCreate   → admin stol yaratganda { number: 1 }
TableResponse → admin ga qaytadi { id, number, qr_code, is_active }

ScanRequest   → mijoz QR skaner qilganda { qr_code: "abc123" }
SessionResponse → mijozga qaytadi { session_token: "xyz..." }
                  mijoz shu token bilan buyurtma beradi

"""