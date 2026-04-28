# **CRISIS AWARENESS BOOKING SYSTEM - BACKEND CODEBASE REPORT**

## **1. PROJECT STRUCTURE**

### Full Folder Tree

```
backend/
├── alembic.ini
├── requirements.txt
├── test.http
├── .env.example
├── .gitignore
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── core/
│   │   ├── config.py           (Environment variables & settings)
│   │   ├── database.py          (Database connection)
│   │   ├── limiter.py           (Rate limiting)
│   │   └── security.py          (JWT, password hashing)
│   ├── models/
│   │   ├── __init__.py
│   │   ├── base.py
│   │   ├── users.py             (User model)
│   │   ├── students.py          (Student model)
│   │   ├── staff.py
│   │   ├── appointments.py
│   │   ├── audit_logs.py
│   │   ├── consent.py
│   │   ├── crisis_logs.py
│   │   ├── forum_posts.py
│   │   ├── notifications.py
│   │   ├── refresh_tokens.py    (Refresh token storage)
│   │   ├── resources.py
│   │   ├── risk_overrides.py
│   │   ├── risk_scores.py
│   │   ├── tables.py
│   │   └── wellness_checkins.py
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── auth.py              (Authentication endpoints)
│   │   ├── appointments.py      (Appointment management)
│   │   ├── checkins.py          (Wellness check-ins)
│   │   ├── consent.py           (Consent management)
│   │   ├── dependencies.py      (Dependency injection helpers)
│   │   ├── notifications.py
│   │   ├── risk_scores.py       (Risk assessment)
│   │   ├── session_ai.py        (AI sessions)
│   │   ├── staff.py             (Staff management)
│   │   ├── students.py          (Student management)
│   │   └── users.py             (User management)
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── appointments.py
│   │   ├── auth.py
│   │   ├── consent.py
│   │   ├── forum_posts.py
│   │   ├── resources.py
│   │   ├── risk_overrides.py
│   │   ├── risk_scores.py
│   │   ├── staff.py
│   │   ├── students.py
│   │   ├── users.py
│   │   └── wellness_checkins.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── appointment_service.py
│   │   ├── audit_service.py
│   │   ├── auth_service.py      (Authentication logic)
│   │   ├── notification_service.py
│   │   ├── session_ai_service.py
│   │   ├── staff_service.py
│   │   ├── student_service.py
│   │   └── user_service.py
│   └── utils/
│       ├── __init__.py
│       ├── idempotency.py       (Idempotency tracking)
│       ├── notification_stub.py
│       ├── pagination.py
│       └── response.py
├── migrations/
│   ├── env.py
│   ├── README
│   ├── script.py.mako
│   └── versions/
│       ├── 1e6c4a7b2d9f_add_v2_schema_expansion.py
│       └── f53b96401f6b_initial.py
```

---

### **Router Files & Endpoints Summary**

| Router File | Endpoints |
|-------------|-----------|
| **auth.py** | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout` |
| **users.py** | `POST /users`, `GET /users`, `GET /users/{user_id}`, `PATCH /users/{user_id}`, `PATCH /users/{user_id}/password` |
| **students.py** | `POST /students/upload-csv`, `GET /students`, `GET /students/search`, `GET /students/{id}`, `PATCH /students/{id}`, `DELETE /students/{id}`, `GET /students/{id}/sessions`, `GET /students/{id}/crisis-logs` |
| **staff.py** | `POST /staff`, `GET /staff`, `GET /staff/psychologists`, `GET /staff/{id}`, `PATCH /staff/{id}`, `DELETE /staff/{id}` |
| **appointments.py** | `POST /appointments` + additional CRUD endpoints |
| **checkins.py** | `POST /checkins/{path}`, `GET /checkins/{path}` |
| **consent.py** (prefix `/consent`) | `POST /consent`, `GET /consent/{student_id}` |
| **risk_scores.py** (prefix `/risk-scores`) | Multiple risk assessment endpoints |
| **session_ai.py** | `POST /sessions`, `POST /sessions/{session_id}/audio` |

---

## **2. AUTH ROUTER - COMPLETE CODE**

**File: app/routers/auth.py**

```python
from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm

from app.core.database import get_db
from app.core.limiter import limiter
from app.core.security import get_current_user
from app.schemas.auth import TokenResponse, RegisterRequest
from app.services.auth_service import AuthService
from app.utils.response import success
from app.routers.dependencies import handle_idempotency, cache_idempotent_response

router = APIRouter(tags=["auth"])

def set_refresh_cookie(response: Response, refresh_token: str) -> None:
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="strict",
        max_age=60 * 60 * 24 * 7,
    )

@router.post("/auth/register")
async def register(payload: RegisterRequest, db=Depends(get_db)):
    result = await AuthService.register(db, payload)
    return success("User registered successfully", result)

# ✅ OAuth2-compatible login (Swagger works)
@router.post("/auth/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(
    request: Request,
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
    db=Depends(get_db),
):
    cache_key, cached = await handle_idempotency(request, idempotency_key)
    if cached:
        return cached

    # ⚠️ Swagger sends "username", map it to email
    email = form_data.username
    password = form_data.password

    tokens = await AuthService.login(db, email, password)

    # Set refresh token cookie
    set_refresh_cookie(response, tokens["refresh_token"])

    body = {
        "access_token": tokens["access_token"],
        "token_type": "bearer",  # 🔥 REQUIRED for Swagger
    }

    return cache_idempotent_response(cache_key, body)


@router.post("/auth/refresh")
async def refresh(
    request: Request,
    response: Response,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
    db=Depends(get_db),
):
    cache_key, cached = await handle_idempotency(request, idempotency_key)
    if cached:
        return cached

    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing",
        )

    tokens = await AuthService.refresh(db, refresh_token)

    set_refresh_cookie(response, tokens["refresh_token"])

    body = {
        "access_token": tokens["access_token"],
        "token_type": "bearer",
    }

    return cache_idempotent_response(cache_key, body)


@router.post("/auth/logout")
async def logout(
    request: Request,
    response: Response,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    cache_key, cached = await handle_idempotency(request, idempotency_key)
    if cached:
        return cached

    refresh_token = request.cookies.get("refresh_token")
    if refresh_token:
        await AuthService.logout(db, refresh_token)

    response.delete_cookie(
        key="refresh_token",
        httponly=True,
        secure=True,
        samesite="strict",
    )

    body = success("Logged out")
    return cache_idempotent_response(cache_key, body)
```

---

## **3. /auth/login ENDPOINT - STEP-BY-STEP ANALYSIS**

### **What Does It Do?**

1. **Rate Limiting**: Limited to 10 requests per minute (`@limiter.limit("10/minute")`)
2. **Idempotency Check**: Returns cached response if same idempotency key exists
3. **Email/Password Validation**: Maps OAuth2 form data (username → email, password → password)
4. **Database Authentication**: Calls `AuthService.login()` which:
   - Queries DB for user by email
   - Verifies password using bcrypt
   - Checks if user is active
   - Fetches identity claims (staff_type, student_id, etc.)
   - Creates JWT access token
   - Creates and stores refresh token hash
5. **Cookie Setting**: Sets HTTP-only secure refresh token cookie
6. **Response**: Returns access token and token type

---

### **Database Calls Made in /auth/login**

**Service: app/services/auth_service.py**

```python
@staticmethod
async def login(db: AsyncSession, email: str, password: str) -> Dict[str, str]:
    # 1. Query user by email (excluding deleted)
    stmt = select(User).where(
        User.email == email,
        User.deleted_at.is_(None),
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    # 2. Verify password & check active status
    if user is None or not user.password_hash or not security.verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is inactive",
        )

    # 3. Get identity claims (queries Staff or Student table based on role)
    identity = await AuthService._get_identity_claims(db, user)
    
    # 4. Create access token & refresh token
    access_token = security.create_access_token(...)
    refresh_token = security.create_refresh_token(str(user.id))
    token_hash = security.hash_token(refresh_token)
    
    # 5. Store refresh token hash in DB
    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        )
    )
    await db.commit()

    return {"access_token": access_token, "refresh_token": refresh_token}
```

**Database Operations:**
1. `SELECT * FROM users WHERE email = ? AND deleted_at IS NULL` → 1 query
2. `SELECT * FROM staff WHERE user_id = ?` OR `SELECT * FROM students WHERE user_id = ?` → 1 query (based on role)
3. `INSERT INTO refresh_tokens (...) VALUES (...)` → 1 query

---

### **What Could Cause a 500 Internal Server Error on /auth/login?**

| Issue | Root Cause | Symptom |
|-------|-----------|---------|
| **Database Connection Failure** | DATABASE_URL misconfigured or DB unreachable | SQLAlchemy connection timeout, unhandled exception |
| **Missing JWT_SECRET** | JWT_SECRET not in .env | `KeyError` or invalid token creation |
| **Unhandled Exception in _get_identity_claims** | Staff/Student record missing unexpectedly | No exception handling for queries returning None |
| **Database Session Not Closed** | Async session handling issue | "Session already exhausted" or connection pool exhaustion |
| **Invalid State in RefreshToken Insert** | FK constraint violation on user_id | Integrity constraint error |
| **bcrypt Library Issue** | bcrypt.checkpw() exception | ValueError not caught in verify_password |
| **Timeout on DB Commit** | Long query or DB lock | Async timeout, hangs indefinitely |

**Current Code Vulnerability**: The `_get_identity_claims()` method doesn't handle the case where a Staff/Student record is missing:

```python
@staticmethod
async def _get_identity_claims(db: AsyncSession, user: User) -> dict:
    staff = None
    student = None
    if user.role == UserRole.staff:
        staff = (
            await db.execute(select(Staff).where(Staff.user_id == user.id))
        ).scalar_one_or_none()  # ← Returns None if not found (no exception)
    # ... rest of code assumes staff/student exists or is None gracefully
```

If a user record exists but the corresponding Staff/Student record doesn't, the method won't crash, but identity claims will have null values.

---

## **4. DATABASE CONNECTION**

**File: app/core/database.py**

```python
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
# from app.core.config import settings
import os
from dotenv import load_dotenv

import app.models  # noqa: F401

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_async_engine(
    DATABASE_URL,
    echo=True,
    connect_args={"ssl": "require"}
)

AsyncSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
```

### **Database URL: Hardcoded or Environment Variables?**

✅ **From Environment Variables** — Uses `os.getenv("DATABASE_URL")`

- Loaded from `.env` file via `load_dotenv()`
- Expected format: `postgresql://user:password@host:port/database`

### **What Happens If Database Connection Fails?**

1. **At Startup**: FastAPI app starts, but engine creation doesn't fail immediately (lazy connection)
2. **First Request**: When `get_db()` is called on first request:
   - `AsyncSessionLocal()` attempts to connect
   - If connection fails → `sqlalchemy.exc.OperationalError` or `asyncpg.exceptions.CannotConnectNowError`
   - **No global error handler** → 500 Internal Server Error
3. **Connection Pool Exhaustion**: If too many concurrent requests → "QueuePool timeout" error
4. **SSL Certificate Error**: `ssl: "require"` might fail if:
   - CA certificates not installed
   - Server cert invalid
   - SSL version mismatch

---

## **5. ENVIRONMENT VARIABLES**

**File: app/core/config.py**

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str                           # REQUIRED
    JWT_SECRET: str                             # REQUIRED
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    SUPABASE_URL: str                           # REQUIRED
    SUPABASE_SERVICE_KEY: str                   # REQUIRED
    GROQ_API_KEY: str                           # REQUIRED (even if not used)
    
    AI_ENABLED: bool = False
    GCAL_ENABLED: bool = False
    SMS_ENABLED: bool = False
    EMAIL_ENABLED: bool = False

    class Config:
        env_file = ".env"

settings = Settings()
```

### **Environment Variables Summary**

| Variable | Required | Purpose | Type | Default |
|----------|----------|---------|------|---------|
| `DATABASE_URL` | ✅ Yes | PostgreSQL async connection string | string | None |
| `JWT_SECRET` | ✅ Yes | Secret key for signing JWT tokens | string | None |
| `JWT_ALGORITHM` | ✅ Yes | Algorithm for JWT (should be HS256) | string | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | JWT access token TTL | int | `15` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | No | Refresh token TTL | int | `7` |
| `SUPABASE_URL` | ✅ Yes | Supabase project URL | string | None |
| `SUPABASE_SERVICE_KEY` | ✅ Yes | Supabase service key | string | None |
| `GROQ_API_KEY` | ✅ Yes | Groq AI API key | string | None |
| `AI_ENABLED` | No | Enable AI features | bool | `false` |
| `GCAL_ENABLED` | No | Enable Google Calendar | bool | `false` |
| `SMS_ENABLED` | No | Enable SMS notifications | bool | `false` |
| `EMAIL_ENABLED` | No | Enable email notifications | bool | `false` |

### **Variables Required for /auth/login to Work**

✅ **CRITICAL:**
- `DATABASE_URL` — Must connect to valid PostgreSQL DB
- `JWT_SECRET` — Must be set (any string ≥ 1 char)
- `JWT_ALGORITHM` — Default is `HS256` (safe)

⚠️ **Not directly used in /auth/login**, but required on app startup:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `GROQ_API_KEY`

### **Missing/Misconfigured Variables That Could Cause 500 Errors**

```
❌ If DATABASE_URL is missing:
   → Pydantic validation error on app startup
   → App fails to start

❌ If JWT_SECRET is missing:
   → Pydantic validation error on app startup
   → App fails to start

❌ If DATABASE_URL is invalid format:
   → SQLAlchemy creation_engine() fails silently
   → First request to /auth/login gets connection error → 500

❌ If JWT_SECRET is empty string:
   → Token creation succeeds but tokens are predictable
   → Security issue (not a 500, but a vulnerability)

❌ If SUPABASE_URL or SUPABASE_SERVICE_KEY missing:
   → App won't start (required by Settings class)
```

---

## **6. MODELS - USER AND STUDENT**

### **User Model**

**File: app/models/users.py**

```python
from __future__ import annotations

import enum
from datetime import date, datetime
from uuid import uuid4

from sqlalchemy import Boolean, Date, DateTime, Enum, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class UserRole(str, enum.Enum):
    staff = "staff"
    student = "student"


class User(Base):
    __tablename__ = "users"

    id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    email: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    gender: Mapped[str | None] = mapped_column(String(20), nullable=True)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, native_enum=False, validate_strings=True), nullable=False, index=True
    )
    is_admin: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    notifications: Mapped[list["Notification"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    audit_logs: Mapped[list["AuditLog"]] = relationship(back_populates="user")
```

### **Student Model**

**File: app/models/students.py**

```python
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Student(Base):
    __tablename__ = "students"

    student_id: Mapped[str] = mapped_column(String(50), primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    class_level: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    assigned_psychologist_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("staff.user_id"),
        nullable=True,
    )
    guidance_counselor: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    emergency_contact: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    emergency_phone: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    crisis_flag: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    appointments: Mapped[list["Appointment"]] = relationship("Appointment", back_populates="student")
    crisis_logs: Mapped[list["CrisisLog"]] = relationship("CrisisLog", back_populates="student")
    assigned_psychologist: Mapped[Optional["Staff"]] = relationship(
        "Staff",
        foreign_keys=[assigned_psychologist_id],
        back_populates="assigned_students",
    )
```

---

## **7. PASSWORD HASHING & VERIFICATION**

**File: app/core/security.py**

```python
import bcrypt

def hash_password(password: str) -> str:
    """Hash password with bcrypt cost factor 12."""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Verify plain password against bcrypt hash."""
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        return False
```

### **Password Hashing Flow**

1. **During Registration**: `hash_password(password)` is called
   - Generates random bcrypt salt with cost factor 12 (slow, secure)
   - Hashes password + salt using bcrypt
   - Stores hash in `users.password_hash`

2. **During Login**: `verify_password(plain_text, stored_hash)` is called
   - Encodes both to UTF-8 bytes
   - Calls `bcrypt.checkpw()` which extracts salt from hash and re-hashes input
   - Compares hashes
   - Returns `True` if match, `False` otherwise
   - Catches `ValueError` exceptions (e.g., invalid hash format) and returns `False`

**Security Notes:**
- ✅ Cost factor 12 is strong (slows down brute-force attacks)
- ✅ Salt is cryptographically random
- ✅ Timing-safe comparison (bcrypt handles this)
- ✅ Exception handling prevents crashes on corrupted hashes

---

## **8. THE 500 ERROR IN /auth/login**

### **Analyzing for Unhandled Exceptions**

Looking at the `/auth/login` endpoint flow:

```python
@router.post("/auth/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(
    request: Request,
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),  # ← Can raise 422 if invalid form
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
    db=Depends(get_db),  # ← Can raise 500 if DB connection fails
):
    cache_key, cached = await handle_idempotency(request, idempotency_key)
    if cached:
        return cached

    email = form_data.username
    password = form_data.password

    tokens = await AuthService.login(db, email, password)  # ← Can raise HTTPException or unhandled error

    set_refresh_cookie(response, tokens["refresh_token"])

    body = {
        "access_token": tokens["access_token"],
        "token_type": "bearer",
    }

    return cache_idempotent_response(cache_key, body)
```

### **Sources of 500 Errors**

| Code Section | Error Type | Cause | Result |
|--------------|-----------|-------|--------|
| `db=Depends(get_db)` | `OperationalError` | DB connection fails | 500 ❌ |
| `await AuthService.login()` | `KeyError` | JWT_SECRET not set | 500 ❌ |
| `await AuthService.login()` | `AttributeError` | Staff/Student model missing attribute | 500 ❌ |
| `tokens["access_token"]` | `KeyError` | login() returns wrong dict structure | 500 ❌ |
| `set_refresh_cookie()` | `TypeError` | refresh_token is None | 500 ❌ |

### **Database Session Handling Issues**

Looking at `get_db()`:

```python
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session  # ← Session stays open during request
        # ← Auto-closes after endpoint returns
```

**Potential Issues:**
1. **Connection Pool Exhaustion**: If too many concurrent requests → "QueuePool limit exceeded"
2. **Uncaught Exception During Commit**: If `await db.commit()` in AuthService fails → exception not caught
3. **Session Timeout**: If database query takes too long → timeout exception propagates as 500

**Current Fix**: No try-catch in endpoint, so DB errors bubble up as 500.

---

## **9. THE 401 ON /auth/refresh**

### **Complete /auth/refresh Endpoint Code**

```python
@router.post("/auth/refresh")
async def refresh(
    request: Request,
    response: Response,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
    db=Depends(get_db),
):
    cache_key, cached = await handle_idempotency(request, idempotency_key)
    if cached:
        return cached

    refresh_token = request.cookies.get("refresh_token")  # ← Get token from cookie
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing",
        )

    tokens = await AuthService.refresh(db, refresh_token)  # ← Can also raise 401

    set_refresh_cookie(response, tokens["refresh_token"])

    body = {
        "access_token": tokens["access_token"],
        "token_type": "bearer",
    }

    return cache_idempotent_response(cache_key, body)
```

### **Service Logic: AuthService.refresh()**

```python
@staticmethod
async def refresh(db: AsyncSession, refresh_token: str) -> Dict[str, str]:
    token_hash = security.hash_token(refresh_token)
    
    # 1. Look up token hash in database
    stmt = select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    result = await db.execute(stmt)
    token = result.scalar_one_or_none()

    # 2. Token not found
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    # 3. Reuse detection (token already used)
    if token.revoked:
        await db.execute(
            update(RefreshToken)
            .where(RefreshToken.user_id == token.user_id)
            .values(revoked=True)  # Revoke all tokens for user
        )
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Security violation detected",
        )

    # 4. Token expiration check
    now = datetime.now(timezone.utc)
    if token.expires_at < now:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    # 5. Get user (soft-deleted check)
    user = await db.get(User, token.user_id)
    if user is None or user.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    # 6. Revoke current token and create new one
    token.revoked = True
    identity = await AuthService._get_identity_claims(db, user)
    new_access = security.create_access_token(...)
    new_refresh = security.create_refresh_token(str(user.id))
    new_hash = security.hash_token(new_refresh)
    new_expires = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    db.add(RefreshToken(...))
    await db.commit()

    return {"access_token": new_access, "refresh_token": new_refresh}
```

### **What Causes 401 on /auth/refresh?**

| Scenario | Cause | Status |
|----------|-------|--------|
| No `refresh_token` cookie | Client didn't send cookie or cookie expired | **401** ✓ Expected |
| Token hash not in DB | Token never existed or was invalidated | **401** ✓ Expected |
| Token already revoked | Token was already used (security violation) | **401** ✓ Expected |
| Token expired | `expires_at < now` | **401** ✓ Expected |
| User deleted | `user is None or user.deleted_at is not None` | **401** ✓ Expected |

### **Is 401 on /auth/refresh Expected Behavior?**

✅ **YES — This is correct behavior!**

- Frontend should expect 401 when:
  - Refresh token cookie missing/expired (browser cleared it)
  - Refresh token is invalid or was revoked
  - Refresh token TTL exceeded (default 7 days)
  - User account was deleted
  
- **Correct Frontend Response**:
  1. Catch 401 from `/auth/refresh`
  2. Clear localStorage (remove access_token)
  3. Redirect to login page
  4. Prompt user to log in again

---

## **10. KEY FINDINGS & VULNERABILITIES**

### ✅ **Strengths**

- ✅ Bcrypt password hashing with cost factor 12 (strong)
- ✅ Rate limiting on `/auth/login` (10 req/min)
- ✅ HTTP-only secure cookies for refresh tokens (CSRF-safe)
- ✅ Idempotency support (prevents duplicate registrations)
- ✅ Soft-delete support (users not permanently deleted)
- ✅ Reuse detection on refresh tokens (security violation detected)
- ✅ Async database operations (non-blocking)

### ⚠️ **Potential Issues**

| Issue | Severity | Recommendation |
|-------|----------|-----------------|
| No global error handler for DB failures | High | Add middleware to catch `OperationalError` → return 503 |
| No logging of auth failures | Medium | Add audit logging for login attempts |
| Missing type hints in some functions | Low | Add return type hints for consistency |
| `_get_identity_claims()` doesn't validate Staff/Student existence | Medium | Should raise error if Staff/Student record missing |
| No password complexity validation on registration | Medium | Enforce minimum password strength (length, chars) |
| Refresh token TTL is 7 days (consider shorter) | Low | Consider 30 days for better UX, or 3 days for security |
| No IP-based rate limiting (only global 10/min) | Medium | Consider per-IP rate limiting |

---

## **SUMMARY TABLE**

| Component | Status | Details |
|-----------|--------|---------|
| **Database** | PostgreSQL (Async) | URL from env var, SSL required |
| **Authentication** | JWT + Refresh Tokens | 15-min access, 7-day refresh |
| **Password Hashing** | Bcrypt (rounds=12) | Industry standard, secure |
| **Rate Limiting** | 10 req/min on login | Basic but effective |
| **Error Handling** | Partial | Missing global DB error handler |
| **Logging** | Minimal | No audit trail for auth events |
| **Security** | Good | HTTP-only cookies, reuse detection |
| **API Docs** | Swagger available | `/docs` endpoint |
