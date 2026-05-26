from pathlib import Path
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

_backend_env_path = Path(__file__).resolve().parents[2] / ".env"
_repo_env_path = Path(__file__).resolve().parents[3] / ".env"

load_dotenv(dotenv_path=_repo_env_path, override=False)
load_dotenv(dotenv_path=_backend_env_path, override=True)


class Settings(BaseSettings):
    DATABASE_URL: str
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    SUPABASE_URL: str
    SUPABASE_SERVICE_KEY: str

    GROQ_API_KEY: str = ""
    AI_ENABLED: bool = False

    GCAL_ENABLED: bool = False
    SMS_ENABLED: bool = False

    EMAIL_ENABLED: bool = False
    RESEND_API_KEY: str = ""
    EMAIL_FROM: str = ""
    EMAIL_TO: str = ""

    # Campus One OIDC
    CAMPUS_ONE_CLIENT_ID: str = ""
    CAMPUS_ONE_CLIENT_SECRET: str = ""
    CAMPUS_ONE_WEBHOOK_SECRET: str = ""
    CAMPUS_ONE_ISSUER: str = "https://auth.campusone.com.ng"
    CAMPUS_ONE_DISCOVERY_URL: str = "https://auth.campusone.com.ng/api/auth/.well-known/openid-configuration"
    CAMPUS_ONE_JWKS_URL: str = "https://auth.campusone.com.ng/api/auth/jwks"
    CAMPUS_ONE_SCOPES: str = "openid email profile academic notifications"
    CAMPUS_ONE_REDIRECT_URI: str = ""

    # Deployment URLs
    FRONTEND_URL: str = "http://localhost:5173"
    BACKEND_URL: str = "http://localhost:8000"

    class Config:
        env_file = (str(_repo_env_path), str(_backend_env_path))
        env_file_encoding = "utf-8"


settings = Settings()
