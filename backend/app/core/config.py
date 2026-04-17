from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    SUPABASE_URL: str
    SUPABASE_SERVICE_KEY: str

    GROQ_API_KEY: str

    
    AI_ENABLED: bool = False
    GCAL_ENABLED: bool = False
    SMS_ENABLED: bool = False
    EMAIL_ENABLED: bool = False

    class Config:
        env_file = ".env"

settings = Settings()