from pydantic import BaseModel, EmailStr

class FeedbackRequest(BaseModel):
    name: str
    email: EmailStr
    message: str
    rating: int | None = None