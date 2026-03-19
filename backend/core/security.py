# restaurant/backend/core/security.py

from datetime import datetime, timedelta
from jose import JWTError, jwt
from fastapi import HTTPException, status
import os

# ─────────────────────────────────────────
# SOZLAMALAR
# ─────────────────────────────────────────
SECRET_KEY            = os.getenv("SECRET_KEY", "your-secret-key")
ALGORITHM             = "HS256"
ACCESS_TOKEN_MINUTES  = 60   # 15 daqiqa — qisqa, xavfsiz
REFRESH_TOKEN_DAYS    = 7     # 7 kun


# ─────────────────────────────────────────
# ACCESS TOKEN YARATISH — 15 daqiqa
# ─────────────────────────────────────────
def create_access_token(username: str, role: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_MINUTES)
    payload = {
        "sub":  username,
        "role": role,
        "type": "access",    # ← token turi
        "exp":  expire
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


# ─────────────────────────────────────────
# REFRESH TOKEN YARATISH — 7 kun
# ─────────────────────────────────────────
def create_refresh_token(username: str, role: str) -> str:
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_DAYS)
    payload = {
        "sub":  username,
        "role": role,
        "type": "refresh",   # ← token turi
        "exp":  expire
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


# ─────────────────────────────────────────
# TOKEN DECODE — ichidan ma'lumot olish
# ─────────────────────────────────────────
def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token noto'g'ri yoki muddati o'tgan"
        )


# ─────────────────────────────────────────
# TOKEN QOLGAN VAQTI — blacklist uchun kerak
# ─────────────────────────────────────────
def get_token_remaining_seconds(token: str) -> int:
    payload = decode_token(token)
    expire  = datetime.utcfromtimestamp(payload["exp"])
    remaining = (expire - datetime.utcnow()).total_seconds()
    return max(0, int(remaining))
