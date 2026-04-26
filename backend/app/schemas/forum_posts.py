from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ForumPostBase(BaseModel):
    content: str


class ForumPostCreate(ForumPostBase):
    encrypted_student_id: str


class ForumPostUpdate(BaseModel):
    content: Optional[str] = None
    deleted_at: Optional[datetime] = None
    delete_reason: Optional[str] = None


class ForumPostResponse(ForumPostBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    created_at: datetime
    deleted_at: Optional[datetime] = None
    delete_reason: Optional[str] = None
