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
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60  # 1 hour - standard for OIDC systems
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30  # 30 days - align with Campus One standards
    SUPABASE_URL: str
    SUPABASE_SERVICE_KEY: str

    GROQ_API_KEY: str = ""
    AI_ENABLED: bool = False

    GCAL_ENABLED: bool = False
    SMS_ENABLED: bool = False

    # Crisis Hotline Configuration
    CRISIS_HOTLINE_NUMBER: str = "0800-SAFESPACE (0800-723-373)"
    CRISIS_HOTLINE_NAME: str = "24/7 Crisis Support"
    CRISIS_HOTLINE_DESCRIPTION: str = "Free. Confidential. Available now."

    EMAIL_ENABLED: bool = False
    RESEND_API_KEY: str = ""
    EMAIL_FROM: str = ""
    EMAIL_TO: str = ""

    SAFESPACE_NOTIF: bool = True
    SAFESPACE_CAMPUS_ONE_NOTIF: bool = True

    # Campus One OIDC
    CAMPUS_ONE_CLIENT_ID: str = ""
    CAMPUS_ONE_CLIENT_SECRET: str = ""
    CAMPUS_ONE_WEBHOOK_SECRET: str = ""
    CAMPUS_ONE_ISSUER: str = "https://auth.campusone.com.ng"
    CAMPUS_ONE_DISCOVERY_URL: str = "https://auth.campusone.com.ng/api/auth/.well-known/openid-configuration"
    CAMPUS_ONE_JWKS_URL: str = "https://auth.campusone.com.ng/api/auth/jwks"
    CAMPUS_ONE_SCOPES: str = "openid email profile academic roles notifications events offline_access"
    CAMPUS_ONE_REDIRECT_URI: str = ""

    # Deployment URLs
    FRONTEND_URL: str = "http://localhost:5173"
    BACKEND_URL: str = "http://localhost:8000"

    # Extra CORS origins (comma-separated) beyond the built-in defaults, e.g.
    # a custom domain. Vercel preview URLs are matched by regex automatically.
    CORS_ORIGINS: str = ""

    # Cookie behaviour. Leave blank for auto: in a non-localhost (production)
    # deployment the frontend and API are cross-site, which REQUIRES
    # SameSite=None; Secure so the refresh cookie is sent on credentialed XHR.
    # Override only if you know your frontend and API share a registrable domain.
    COOKIE_SAMESITE: str = ""   # "" => auto ("none" in prod, "lax" in dev)
    COOKIE_SECURE: str = ""     # "" => auto (True in prod, False in dev)

    @property
    def is_production(self) -> bool:
        fu = self.FRONTEND_URL or ""
        return "localhost" not in fu and "127.0.0.1" not in fu

    @property
    def cookie_samesite(self) -> str:
        if self.COOKIE_SAMESITE:
            return self.COOKIE_SAMESITE.lower()
        return "none" if self.is_production else "lax"

    @property
    def cookie_secure(self) -> bool:
        # SameSite=None is invalid without Secure, so force it on.
        if self.cookie_samesite == "none":
            return True
        if self.COOKIE_SECURE:
            return self.COOKIE_SECURE.lower() == "true"
        return self.is_production

    @property
    def cors_origins_list(self) -> list[str]:
        defaults = [
            "http://localhost:5173",
            "http://localhost:8080",
            "https://crisis-awareness-booking-system.vercel.app",
            "https://www.crisis-awareness-booking-system.vercel.app",
        ]
        extra = [o.strip() for o in (self.CORS_ORIGINS or "").split(",") if o.strip()]
        if self.FRONTEND_URL and self.FRONTEND_URL not in defaults:
            extra.append(self.FRONTEND_URL.rstrip("/"))
        # de-dupe, preserve order
        seen, out = set(), []
        for o in defaults + extra:
            if o not in seen:
                seen.add(o); out.append(o)
        return out

    class Config:
        env_file = (str(_repo_env_path), str(_backend_env_path))
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
