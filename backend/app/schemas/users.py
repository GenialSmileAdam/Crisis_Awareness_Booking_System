from datetime import date, datetime
from email.utils import parseaddr
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_validator, model_validator

from app.models.staff import StaffType


class UserCreate(BaseModel):
    email: str
    password: Optional[str] = None
    full_name: str
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    user_type: Literal["staff", "student"]
    is_admin: bool = False
    staff_id: Optional[str] = None
    student_id: Optional[str] = None
    staff_type: Optional[StaffType] = None
    class_level: Optional[str] = None
    guidance_counselor: Optional[str] = None
    emergency_contact: Optional[str] = None
    emergency_phone: Optional[str] = None

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        _, parsed_email = parseaddr(value.strip())
        local_part, separator, domain = parsed_email.partition("@")
        if not (separator and local_part and domain and "." in domain):
            raise ValueError("Invalid email format")
        return parsed_email.lower()

    @model_validator(mode="after")
    def validate_identity_fields(self) -> "UserCreate":
        if self.user_type == "staff":
            if not self.staff_id or not self.staff_type:
                raise ValueError("staff_id and staff_type are required for staff users")
        if self.user_type == "student" and not self.student_id:
            raise ValueError("student_id is required for student users")
        if self.user_type != "staff" and self.is_admin:
            raise ValueError("Only staff users can have admin privileges")
        return self


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None

    @field_validator("email")
    @classmethod
    def validate_optional_email(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        _, parsed_email = parseaddr(value.strip())
        local_part, separator, domain = parsed_email.partition("@")
        if not (separator and local_part and domain and "." in domain):
            raise ValueError("Invalid email format")
        return parsed_email.lower()


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


class UserResponse(BaseModel):
    id: UUID
    email: str
    full_name: str
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    user_type: str
    is_admin: bool
    effective_role: str
    staff_id: Optional[str] = None
    student_id: Optional[str] = None
    staff_type: Optional[str] = None
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
