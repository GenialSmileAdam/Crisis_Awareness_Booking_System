from pathlib import Path
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

# Resolve .env relative to the backend root (3 levels up from this file:
# config.py -> core/ -> app/ -> backend/)
_env_path = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(dotenv_path=_env_path, override=False)


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
        env_file = str(_env_path)
        env_file_encoding = "utf-8"


settings = Settings()