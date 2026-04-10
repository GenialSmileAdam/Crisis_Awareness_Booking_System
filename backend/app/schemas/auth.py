from email.utils import parseaddr
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, field_validator, model_validator

from app.models.staff import StaffType


class LoginRequest(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        _, parsed_email = parseaddr(value.strip())
        local_part, separator, domain = parsed_email.partition("@")
        if not (separator and local_part and domain and "." in domain):
            raise ValueError("Invalid email format")
        return parsed_email.lower()


class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str
    user_type: Literal["staff", "student"]
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
    def validate_identity_fields(self) -> "RegisterRequest":
        if self.user_type == "staff":
            if not self.staff_id or not self.staff_type:
                raise ValueError("staff_id and staff_type are required for staff registration")
        if self.user_type == "student" and not self.student_id:
            raise ValueError("student_id is required for student registration")
        return self


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class RefreshResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

    model_config = ConfigDict(from_attributes=True)
