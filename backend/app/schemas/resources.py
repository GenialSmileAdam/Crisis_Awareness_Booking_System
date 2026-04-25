from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.resources import ResourceType


class ResourceBase(BaseModel):
    title: str
    type: ResourceType
    topic: str
    url: str


class ResourceCreate(ResourceBase):
    approved_by: Optional[UUID] = None


class ResourceUpdate(BaseModel):
    title: Optional[str] = None
    type: Optional[ResourceType] = None
    topic: Optional[str] = None
    url: Optional[str] = None
    approved_by: Optional[UUID] = None


class ResourceResponse(ResourceBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    approved_by: Optional[UUID] = None
    created_at: datetime
