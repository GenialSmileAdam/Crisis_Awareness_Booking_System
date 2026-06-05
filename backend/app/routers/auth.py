"""
Authentication Router - Minimal Clean Implementation

Supports:
1. Campus One OIDC flow (preferred)
2. Password login (fallback)
"""

import logging
from datetime import datetime, timedelta, timezone
from uuid import UUID
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import (
    get_current_user,
    create_access_token,
    create_refresh_token,
    hash_token,
)
from app.core.campus_one_oidc import CampusOneOIDC
from app.core.config import settings
from app.models.users import User
from app.models.refresh_tokens import RefreshToken
from app.services.auth_service import AuthService
from app.services.campus_one_service import CampusOneService
from app.schemas.auth import TokenResponse, RegisterRequest
from app.utils.response import success

logger = logging.getLogger(__name__)
router = APIRouter(tags=["auth"])


# ============================================================================
# CAMPUS ONE OIDC FLOW
# ============================================================================

@router.get("/api/auth/authorize")
async def authorize(request: Request):
    """Initiate Campus One OIDC login.

    Generates PKCE parameters and redirects to Campus One.
    """
    oidc = CampusOneOIDC()
    auth_url, state, code_verifier = await oidc.generate_authorize_url()

    # Store PKCE params in secure cookies
    is_dev = request.url.hostname in ("localhost", "127.0.0.1")
    response = Response()
    response.set_cookie(
        key="oidc_state",
        value=state,
        httponly=True,
        secure=not is_dev,
        samesite="lax",
        max_age=600,
        path="/",
    )
    response.set_cookie(
        key="oidc_code_verifier",
        value=code_verifier,
        httponly=True,
        secure=not is_dev,
        samesite="lax",
        max_age=600,
        path="/",
    )
    response.status_code = 302
    response.headers["location"] = auth_url
    return response


@router.get("/api/auth/callback")
async def callback(
    code: str = None,
    state: str = None,
    error: str = None,
    request: Request = None,
    db: AsyncSession = Depends(get_db),
):
    """Handle Campus One OIDC callback.

    1. Validate state (CSRF protection)
    2. Exchange code for tokens
    3. Verify JWT signature
    4. Create/update user
    5. Create session
    6. Redirect to frontend
    """
    frontend_url = settings.FRONTEND_URL
    is_dev = request.url.hostname in ("localhost", "127.0.0.1")

    # Handle errors
    if error:
        return RedirectResponse(
            url=f"{frontend_url.rstrip('/')}/auth/error?{urlencode({'message': error})}",
            status_code=302,
        )

    if not code or not state:
        return RedirectResponse(
            url=f"{frontend_url.rstrip('/')}/auth/error?{urlencode({'message': 'Invalid request'})}",
            status_code=302,
        )

    try:
        logger.info(f"=" * 70)
        logger.info(f"🎯 STARTING OIDC CALLBACK FLOW")
        logger.info(f"=" * 70)

        # Step 1: Validate state
        logger.info(f"STEP 1️⃣: Validate CSRF state")
        stored_state = request.cookies.get("oidc_state")
        logger.info(f"   Stored state: {stored_state[:30]}..." if stored_state else "   Stored state: MISSING")
        logger.info(f"   Callback state: {state[:30]}...")
        if not stored_state or stored_state != state:
            raise ValueError("State mismatch - CSRF protection failed")
        logger.info(f"   ✅ State validated")

        # Step 2: Get code verifier
        logger.info(f"STEP 2️⃣: Get PKCE code verifier")
        code_verifier = request.cookies.get("oidc_code_verifier")
        logger.info(f"   Code verifier: {code_verifier[:30]}..." if code_verifier else "   Code verifier: MISSING")
        if not code_verifier:
            raise ValueError("Missing code verifier")
        logger.info(f"   ✅ Code verifier found")

        # Step 3: Exchange code for tokens
        logger.info(f"STEP 3️⃣: Exchange authorization code for tokens")
        logger.info(f"   Authorization code: {code[:30]}...")
        oidc = CampusOneOIDC()
        token_response = await oidc.exchange_code_for_tokens(code, code_verifier)
        id_token = token_response.get("id_token")
        access_token = token_response.get("access_token")
        refresh_token = token_response.get("refresh_token")

        if not id_token:
            raise ValueError("No ID token from Campus One")

        # Step 4: Verify ID token
        logger.info(f"STEP 4️⃣: Verify and decode ID token")
        claims = await oidc.verify_and_decode_id_token(id_token)
        logger.info(f"   ✅ Authentication successful: {claims.get('sub')} ({claims.get('email')})")

        # Step 5: Get or create user
        logger.info(f"STEP 5️⃣: Get or create user in database")
        user, is_new = await CampusOneService.get_or_create_user_from_oidc_claims(db, claims)
        logger.info(f"   User ID: {user.id}")
        logger.info(f"   Email: {user.email}")
        logger.info(f"   Role: {user.role}")
        logger.info(f"   Is Admin: {user.is_admin}")
        logger.info(f"   Status: {'✅ NEW USER CREATED' if is_new else '✅ EXISTING USER UPDATED'}")

        # Store Campus One tokens
        logger.info(f"STEP 6️⃣: Store Campus One tokens")
        user.campus_one_access_token = access_token
        if refresh_token:
            user.campus_one_refresh_token = refresh_token
        await db.commit()
        logger.info(f"   ✅ Tokens stored")

        # Step 7: Create our access token with roles from Campus One claims
        logger.info(f"STEP 7️⃣: Generate JWT access token")
        roles = claims.get("roles", [])
        logger.info(f"   Roles from Campus One: {roles}")
        jwt_token = create_access_token(
            user_id=str(user.id),
            user_type=user.role,
            full_name=user.full_name,
            roles=roles,
            is_admin=user.is_admin,
        )
        logger.info(f"   JWT Token: {jwt_token[:50]}...{jwt_token[-50:]}")
        logger.info(f"   ✅ JWT generated")

        # Build response with token in fragment (safer than query param)
        response = RedirectResponse(
            url=f"{frontend_url.rstrip('/')}/auth/callback#{urlencode({'token': jwt_token})}",
            status_code=302,
        )

        # Clean up OIDC cookies
        response.delete_cookie("oidc_state", path="/")
        response.delete_cookie("oidc_code_verifier", path="/")

        logger.info(f"✓ Auth successful for {user.email}")
        return response

    except Exception as e:
        error_msg = str(e)
        logger.error(f"Callback error: {error_msg}", exc_info=True)
        return RedirectResponse(
            url=f"{frontend_url.rstrip('/')}/auth/error?{urlencode({'message': error_msg})}",
            status_code=302,
        )


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.get("/auth/me")
async def get_current_user(current_user: dict = Depends(get_current_user)):
    """Return current user info from JWT."""
    return success(
        "User authenticated",
        {
            "id": str(current_user.get("id")),
            "user_type": current_user.get("user_type"),
            "role": current_user.get("role"),
            "is_admin": current_user.get("is_admin"),
            "roles": current_user.get("roles", []),  # Campus One roles array
            "name": current_user.get("name"),
        },
    )


@router.post("/api/auth/login", response_model=TokenResponse)
async def login(
    request: Request,
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    """Password-based login (fallback)."""
    tokens = await AuthService.login(db, form_data.username, form_data.password)
    return {
        "access_token": tokens["access_token"],
        "token_type": "bearer",
    }


@router.post("/api/auth/logout")
async def logout(
    response: Response,
    current_user: dict = Depends(get_current_user),
):
    """Logout (frontend clears token from localStorage)."""
    return success("Logged out")


@router.post("/api/auth/register")
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register new user (password-based)."""
    result = await AuthService.register(db, payload)
    return success("User registered successfully", result)


@router.post("/api/auth/refresh")
async def refresh(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """Refresh access token."""
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No refresh token",
        )

    tokens = await AuthService.refresh(db, refresh_token)
    return {
        "access_token": tokens["access_token"],
        "token_type": "bearer",
    }
