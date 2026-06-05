from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
import secrets
import base64
import hashlib
import logging
from urllib.parse import urlencode
from uuid import UUID
from sqlalchemy import select

from app.core.database import get_db
from app.core.limiter import limiter
from app.core.security import get_current_user, create_access_token
from app.schemas.auth import TokenResponse, RegisterRequest
from app.services.auth_service import AuthService
from app.services.campus_one_service import CampusOneService
from app.core.oidc import oidc_provider
from app.utils.response import success
from app.routers.dependencies import handle_idempotency, cache_idempotent_response
from app.models.users import User

router = APIRouter(tags=["auth"])

def set_refresh_cookie(response: Response, refresh_token: str) -> None:
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="none",
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


@router.get("/auth/me")
async def get_current_user_endpoint(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current user info (used by frontend after OIDC callback)."""
    from app.services.auth_service import AuthService

    try:
        # Get identity claims from database
        user = await db.execute(
            select(User).where(User.id == UUID(current_user["id"]))
        )
        user_obj = user.scalar_one_or_none()

        if not user_obj:
            raise HTTPException(status_code=401, detail="User not found")

        # Get extended identity information
        identity = await AuthService._get_identity_claims(db, user_obj)

        return success("User authenticated", {
            "id": str(user_obj.id),
            "email": user_obj.email,
            "name": user_obj.full_name,
            "user_type": identity["user_type"],
            "role": current_user["role"],
            "is_admin": user_obj.is_admin,
            "staff_type": identity.get("staff_type"),
            "staff_id": identity.get("staff_id"),
            "student_id": identity.get("student_id"),
        })
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Failed to get user: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get user info")


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
        samesite="none",
    )

    body = success("Logged out")
    return cache_idempotent_response(cache_key, body)


@router.get("/auth/campus-one/authorize")
async def campus_one_authorize(request: Request):
    """Initiate Campus One OIDC login flow."""
    state = secrets.token_urlsafe(32)
    code_verifier = secrets.token_urlsafe(32)
    code_challenge = base64.urlsafe_b64encode(
        hashlib.sha256(code_verifier.encode()).digest()
    ).decode().rstrip("=")

    # Store in session (use secure, httponly cookie)
    response = Response()

    # Determine if we're in development (localhost)
    is_dev = request.url.hostname == "localhost" or request.url.hostname == "127.0.0.1"

    response.set_cookie(
        key="oidc_state",
        value=state,
        httponly=True,
        secure=not is_dev,  # Only require secure in production
        samesite="lax",
        max_age=600,  # 10 min expiry
        path="/",
    )
    response.set_cookie(
        key="oidc_code_verifier",
        value=code_verifier,
        httponly=True,
        secure=not is_dev,  # Only require secure in production
        samesite="lax",
        max_age=600,
        path="/",
    )

    auth_url = oidc_provider.get_authorization_url(state, code_challenge)
    response.status_code = 302
    response.headers["location"] = auth_url
    return response


@router.get("/api/auth/callback")
async def auth_callback(
    code: str = None,
    state: str = None,
    error: str = None,
    error_description: str = None,
    request: Request = None,
    db = Depends(get_db),
):
    """Campus One OIDC callback handler - REBUILT for security and simplicity."""
    from app.core.config import settings
    from app.core.security import create_refresh_token, hash_token
    from datetime import datetime, timedelta, timezone
    from app.models.refresh_tokens import RefreshToken

    frontend_url = settings.FRONTEND_URL
    is_dev = request.url.hostname in ("localhost", "127.0.0.1")

    # Handle Campus One errors
    if error:
        error_msg = error_description or error
        logging.warning(f"Campus One OAuth error: {error_msg}")
        return RedirectResponse(
            url=f"{frontend_url.rstrip('/')}/auth/error?message={error_msg}",
            status_code=302
        )

    if not code or not state:
        logging.error("Missing authorization code or state")
        return RedirectResponse(
            url=f"{frontend_url.rstrip('/')}/auth/error?message=Invalid+request",
            status_code=302
        )

    try:
        # 1. Verify state for CSRF protection
        stored_state = request.cookies.get("oidc_state")
        if not stored_state or stored_state != state:
            logging.warning("CSRF attack detected: state mismatch")
            raise ValueError("CSRF validation failed")

        # 2. Get code verifier for PKCE
        code_verifier = request.cookies.get("oidc_code_verifier")
        if not code_verifier:
            raise ValueError("PKCE code verifier missing")

        # 3. Exchange authorization code for tokens
        token_response = await oidc_provider.exchange_code_for_token(code, code_verifier)
        id_token = token_response.get("id_token")
        access_token = token_response.get("access_token")
        refresh_token = token_response.get("refresh_token")

        if not id_token:
            raise ValueError("No ID token from Campus One")

        # 4. Verify and decode ID token signature
        claims = await oidc_provider.verify_id_token(id_token)
        logging.info(f"Authenticated user: {claims.get('sub')} ({claims.get('email')})")

        # 5. Get or create user in database
        user, is_new = await CampusOneService.get_or_create_user_from_oidc_claims(db, claims)

        if is_new:
            logging.info(f"New user created: {user.id} ({user.email})")

        # 6. Store Campus One tokens for later use (notifications, etc.)
        user.campus_one_access_token = access_token
        if refresh_token:
            user.campus_one_refresh_token = refresh_token
        await db.commit()

        # 7. Create our internal refresh token (HTTP-only cookie)
        our_refresh_token = create_refresh_token(str(user.id))
        token_hash = hash_token(our_refresh_token)
        expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

        db.add(RefreshToken(user_id=user.id, token_hash=token_hash, expires_at=expires_at))
        await db.commit()

        # 8. Build response - redirect WITHOUT token in URL (security!)
        response = RedirectResponse(url=f"{frontend_url.rstrip('/')}/auth/callback", status_code=302)

        # 9. Set refresh token as HTTP-only cookie (secure by default)
        response.set_cookie(
            key="refresh_token",
            value=our_refresh_token,
            httponly=True,
            secure=not is_dev,
            samesite="lax",
            max_age=60 * 60 * 24 * 7,
            path="/",
        )

        # 10. Clean up OIDC session cookies
        response.delete_cookie("oidc_state", httponly=True, secure=not is_dev, samesite="lax", path="/")
        response.delete_cookie("oidc_code_verifier", httponly=True, secure=not is_dev, samesite="lax", path="/")

        return response

    except Exception as e:
        logging.error(f"Auth callback failed: {type(e).__name__}: {str(e)}", exc_info=True)
        return RedirectResponse(
            url=f"{frontend_url.rstrip('/')}/auth/error?message=Authentication+failed",
            status_code=302
        )
