from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, model_validator

from app.models.staff import StaffType


class LoginRequest(BaseModel):
    user_id: str
    password: str


class RegisterRequest(BaseModel):
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