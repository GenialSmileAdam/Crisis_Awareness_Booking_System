from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm
import secrets
import base64
import hashlib
import logging
from urllib.parse import urlencode

from app.core.database import get_db
from app.core.limiter import limiter
from app.core.security import get_current_user, create_access_token
from app.schemas.auth import TokenResponse, RegisterRequest
from app.services.auth_service import AuthService
from app.services.campus_one_service import CampusOneService
from app.core.oidc import oidc_provider
from app.utils.response import success
from app.routers.dependencies import handle_idempotency, cache_idempotent_response

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
    response: Response = None,
    db = Depends(get_db),
):
    """Campus One OIDC callback handler."""
    from app.core.config import settings

    frontend_url = settings.FRONTEND_URL

    # Handle Campus One errors
    if error:
        error_msg = error_description or error
        logging.warning(f"Campus One OAuth error: {error_msg}")
        redirect_url = f"{frontend_url.rstrip('/')}/auth/callback?error={urlencode({'error': error_msg})}"
        response.status_code = 302
        response.headers["location"] = redirect_url
        return response

    if not code or not state:
        error_msg = "Missing authorization code or state"
        redirect_url = f"{frontend_url.rstrip('/')}/auth/callback?error={urlencode({'error': error_msg})}"
        response.status_code = 302
        response.headers["location"] = redirect_url
        return response

    try:
        # Verify state for CSRF protection
        stored_state = request.cookies.get("oidc_state")
        if not stored_state or stored_state != state:
            logging.warning("CSRF attack attempt detected: state mismatch")
            raise ValueError("State mismatch - possible CSRF attack")

        # Get code verifier for PKCE
        code_verifier = request.cookies.get("oidc_code_verifier")
        if not code_verifier:
            raise ValueError("Code verifier not found in session")

        # Exchange code for tokens
        token_response = await oidc_provider.exchange_code_for_token(
            code, code_verifier
        )
        id_token = token_response.get("id_token")

        if not id_token:
            raise ValueError("No ID token in Campus One response")

        # Verify and decode ID token
        claims = await oidc_provider.verify_id_token(id_token)

        # Get or create user from Campus One claims
        user, is_new = await CampusOneService.get_or_create_user_from_oidc_claims(
            db, claims
        )

        # Save Campus One tokens for later use (e.g. notifications)
        user.campus_one_access_token = token_response.get("access_token")
        if token_response.get("refresh_token"):
            user.campus_one_refresh_token = token_response.get("refresh_token")

        # Get identity claims (student_id, staff_id, etc.)
        from app.services.auth_service import AuthService
        identity = await AuthService._get_identity_claims(db, user)

        # Generate our own access token with user info
        our_access_token = create_access_token(
            user_id=str(user.id),
            user_type=identity["user_type"],
            full_name=user.full_name,
            is_admin=identity["is_admin"],
            staff_type=identity.get("staff_type"),
            staff_id=identity.get("staff_id"),
            student_id=identity.get("student_id"),
        )

        # Create and store refresh token
        from app.core.security import create_refresh_token, hash_token
        from datetime import datetime, timedelta, timezone
        from app.models.refresh_tokens import RefreshToken

        our_refresh_token = create_refresh_token(str(user.id))
        token_hash = hash_token(our_refresh_token)
        expires_at = datetime.now(timezone.utc) + timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS
        )

        db.add(
            RefreshToken(
                user_id=user.id,
                token_hash=token_hash,
                expires_at=expires_at,
            )
        )
        await db.commit()

        # Clear OIDC cookies
        response.delete_cookie("oidc_state", httponly=True, secure=True)
        response.delete_cookie("oidc_code_verifier", httponly=True, secure=True)

        # Set refresh token cookie for automatic token refresh
        response.set_cookie(
            key="refresh_token",
            value=our_refresh_token,
            httponly=True,
            secure=True,
            samesite="none",
            max_age=60 * 60 * 24 * 7,
        )

        # Redirect to frontend with access token
        redirect_params = urlencode({
            "access_token": our_access_token,
            "user_type": identity["user_type"],
        })
        redirect_url = f"{frontend_url.rstrip('/')}/auth/callback?{redirect_params}"
        response.status_code = 302
        response.headers["location"] = redirect_url
        return response

    except Exception as e:
        import logging
        logging.error(f"Campus One callback error: {type(e).__name__}: {str(e)}")
        error_msg = "Authentication failed. Please try again."
        redirect_url = f"{frontend_url.rstrip('/')}/auth/callback?error={urlencode({'error': error_msg})}"
        response.status_code = 302
        response.headers["location"] = redirect_url
        return response
