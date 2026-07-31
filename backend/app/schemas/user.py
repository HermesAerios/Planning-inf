from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from .skill import Skill

class UserBase(BaseModel):
    username: str
    email: Optional[EmailStr] = None
    role: str

class UserCreate(UserBase):
    password: str
    skill_ids: list[int] = []

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    skill_ids: Optional[list[int]] = None

class UserInDB(UserBase):
    id: int
    created_at: datetime
    last_login: Optional[datetime] = None
    skills: list[Skill] = []

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None
