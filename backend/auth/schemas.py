from pydantic import BaseModel, Field
from enum import Enum
from typing import List


class RoleEnum(str, Enum):
    admin  = "admin"
    waiter = "waiter"
    chef   = "chef"


class UserCreate(BaseModel):
    full_name: str      = Field(..., min_length=3, max_length=100)
    username:  str      = Field(..., min_length=3, max_length=50)
    password:  str      = Field(..., min_length=6)
    role:      RoleEnum


class UserLogin(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)


class Token(BaseModel):
    access_token:  str
    refresh_token: str
    token_type:    str
    role:          str


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenData(BaseModel):
    username: str | None = None
    role:     str | None = None
    type:     str | None = None


class UserResponse(BaseModel):
    id:               int
    full_name:        str
    username:         str
    role:             RoleEnum
    is_active:        bool
    assigned_tables:  List[int] = []

    class Config:
        from_attributes = True


class AssignTablesRequest(BaseModel):
    table_ids: List[int]