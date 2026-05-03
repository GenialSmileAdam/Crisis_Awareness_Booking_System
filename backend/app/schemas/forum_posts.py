from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ForumPostBase(BaseModel):
    content: str = Field(min_length=1, max_length=2000)

    @field_validator("content")
    @classmethod
    def validate_content(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Post content cannot be empty")
        return stripped


class ForumPostCreate(ForumPostBase):
    pass


class ForumPostUpdate(BaseModel):
    content: Optional[str] = Field(default=None, min_length=1, max_length=2000)
    deleted_at: Optional[datetime] = None
    delete_reason: Optional[str] = Field(default=None, max_length=500)


class ForumPostDelete(BaseModel):
    reason: str = Field(min_length=1, max_length=500)

    @field_validator("reason")
    @classmethod
    def validate_reason(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Removal reason is required")
        return stripped


class ForumPostResponse(ForumPostBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    created_at: datetime
    deleted_at: Optional[datetime] = None
    delete_reason: Optional[str] = None
