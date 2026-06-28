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


def _cookie_kwargs(max_age: int) -> dict:
    """Shared auth-cookie attributes.

    In production the frontend (e.g. Vercel) and the API are on different
    domains — a cross-site context. Browsers only send cookies on the
    credentialed XHR used by /api/auth/refresh when they are
    ``SameSite=None; Secure``. Using ``lax`` there silently drops the cookie,
    which is what caused login to never persist in the deployed app.
    """
    return {
        "httponly": True,
        "secure": settings.cookie_secure,
        "samesite": settings.cookie_samesite,
        "max_age": max_age,
        "path": "/",
    }


# ============================================================================
# CAMPUS ONE OIDC FLOW
# ============================================================================

@router.get("/api/auth/authorize")
async def authorize(request: Request, silent: bool = False):
    """Initiate Campus One OIDC login.

    Generates PKCE parameters and redirects to Campus One.

    When ``silent=true`` the request uses ``prompt=none`` so that a user who
    already has an active Campus One session is signed in WITHOUT seeing a login
    screen (seamless SSO). If there is no active Campus One session, Campus One
    returns a ``login_required`` error which the callback turns into a redirect
    to the interactive sign-in page.
    """
    oidc = CampusOneOIDC()
    auth_url, state, code_verifier = await oidc.generate_authorize_url(
        prompt="none" if silent else "login"
    )

    # Store PKCE params in secure cookies. These must survive the cross-site
    # top-level redirect back from Campus One, so use the shared cookie policy
    # (SameSite=None; Secure in production).
    response = Response()
    response.set_cookie(key="oidc_state", value=state, **_cookie_kwargs(max_age=600))
    response.set_cookie(key="oidc_code_verifier", value=code_verifier, **_cookie_kwargs(max_age=600))
    response.status_code = 302
    response.headers["location"] = auth_url
    return response


from pydantic import BaseModel

class TokenExchangeRequest(BaseModel):
    code: str
    state: str
    code_verifier: str

@router.post("/api/auth/exchange")
async def exchange(
    payload: TokenExchangeRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """Exchange code for tokens directly using PKCE parameters."""
    try:
        logger.info("=" * 70)
        logger.info("🎯 STARTING OIDC EXCHANGE FLOW")
        logger.info("=" * 70)

        # Step 3: Exchange code for tokens
        logger.info("STEP 3️⃣: Exchange authorization code for tokens")
        oidc = CampusOneOIDC()
        token_response = await oidc.exchange_code_for_tokens(payload.code, payload.code_verifier)
        id_token = token_response.get("id_token")
        access_token = token_response.get("access_token")
        refresh_token = token_response.get("refresh_token")

        if not id_token:
            raise ValueError("No ID token from Campus One")

        # Step 4: Verify ID token
        logger.info("STEP 4️⃣: Verify and decode ID token")
        claims = await oidc.verify_and_decode_id_token(id_token)

        # Step 5: Get or create user
        logger.info("STEP 5️⃣: Get or create user in database")
        user, is_new = await CampusOneService.get_or_create_user_from_oidc_claims(db, claims)

        # Store Campus One tokens
        logger.info("STEP 6️⃣: Store Campus One tokens")
        user.campus_one_access_token = access_token
        if refresh_token:
            user.campus_one_refresh_token = refresh_token
        await db.commit()

        # Step 7: Generate JWT access token
        logger.info("STEP 7️⃣: Generate JWT access token")
        campus_roles = claims.get("roles", []) or []

        from app.models.staff import Staff as StaffModel
        staff_record = (await db.execute(
            select(StaffModel).where(StaffModel.user_id == user.id)
        )).scalar_one_or_none()
        staff_type_val = staff_record.staff_type.value if staff_record and staff_record.staff_type else None
        staff_id_val = staff_record.staff_id if staff_record else None

        from app.models.students import Student as StudentModel
        student_record = (await db.execute(
            select(StudentModel).where(StudentModel.user_id == user.id)
        )).scalar_one_or_none()
        student_id_val = student_record.student_id if student_record else None

        if user.is_admin or staff_type_val == "administrator":
            db_roles = ["unit_head"]
        elif staff_type_val in ("psychologist", "counselor"):
            db_roles = ["psychologist"]
        elif user.role.value == "student":
            db_roles = ["student"]
        else:
            db_roles = []
        roles = list(dict.fromkeys([*campus_roles, *db_roles]))

        jwt_token = create_access_token(
            user_id=str(user.id),
            user_type=user.role,
            full_name=user.full_name,
            roles=roles,
            is_admin=user.is_admin,
            staff_type=staff_type_val,
            staff_id=staff_id_val,
            student_id=student_id_val,
        )

        # Step 8: Create SafeSpace refresh token
        logger.info("STEP 8️⃣: Create SafeSpace refresh token")
        ss_refresh_token = create_refresh_token(str(user.id))
        tok_hash = hash_token(ss_refresh_token)
        tok_expires = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

        from sqlalchemy import update as sa_update
        await db.execute(
            sa_update(RefreshToken)
            .where(RefreshToken.user_id == user.id, RefreshToken.revoked == False)
            .values(revoked=True)
        )
        db.add(RefreshToken(
            user_id=user.id,
            token_hash=tok_hash,
            expires_at=tok_expires,
        ))
        await db.commit()

        # Set refresh token as HTTP-only cookie
        response.set_cookie(
            "refresh_token",
            ss_refresh_token,
            **_cookie_kwargs(max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600),
        )

        logger.info(f"✓ Exchange successful for {user.email}")
        return success("Exchange successful", {
            "token": jwt_token,
        })

    except Exception as e:
        error_msg = str(e)
        logger.error(f"Exchange error: {error_msg}", exc_info=True)
        raise HTTPException(status_code=400, detail=error_msg)


@router.get("/api/auth/pkce")
async def generate_pkce():
    """Return PKCE parameters as JSON."""
    oidc = CampusOneOIDC()
    auth_url, state, code_verifier = await oidc.generate_authorize_url()
    return success("PKCE parameters generated", {
        "auth_url": auth_url,
        "state": state,
        "code_verifier": code_verifier
    })


@router.get("/api/api/auth/callback")
@router.get("/api/auth/callback")
async def callback(
    code: str = None,
    state: str = None,
    error: str = None,
    request: Request = None,
    db: AsyncSession = Depends(get_db),
):
    """Handle Campus One OIDC callback by redirecting to frontend callback page."""
    frontend_url = settings.FRONTEND_URL

    # Handle errors
    if error:
        SILENT_NEEDS_INTERACTION = {
            "login_required",
            "interaction_required",
            "consent_required",
            "account_selection_required",
        }
        if error in SILENT_NEEDS_INTERACTION:
            logger.info(f"Silent auth returned '{error}' → redirecting to interactive login")
            return RedirectResponse(
                url=f"{frontend_url.rstrip('/')}/login",
                status_code=302,
            )
        return RedirectResponse(
            url=f"{frontend_url.rstrip('/')}/auth/error?{urlencode({'message': error})}",
            status_code=302,
        )

    if not code or not state:
        return RedirectResponse(
            url=f"{frontend_url.rstrip('/')}/auth/error?{urlencode({'message': 'Invalid request'})}",
            status_code=302,
        )

    # Redirect back to frontend callback with code and state
    logger.info(f"   ✅ Redirecting to frontend callback")
    return RedirectResponse(
        url=f"{frontend_url.rstrip('/')}/auth/callback?{urlencode({'code': code, 'state': state})}",
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
    response.set_cookie(
        "refresh_token",
        tokens["refresh_token"],
        **_cookie_kwargs(max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600),
    )
    return {
        "access_token": tokens["access_token"],
        "token_type": "bearer",
    }


@router.post("/api/auth/logout")
async def logout(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """
    Logout: revoke the SafeSpace refresh token and clear the cookie.
    Does NOT require a valid access token — logout must work even when the
    access token has already expired.
    """
    refresh_token_val = request.cookies.get("refresh_token")
    if refresh_token_val:
        await AuthService.logout(db, refresh_token_val)

    # Match the attributes the cookie was set with, otherwise browsers won't
    # clear a SameSite=None; Secure cookie in a cross-site context.
    response.delete_cookie(
        "refresh_token",
        path="/",
        httponly=True,
        samesite=settings.cookie_samesite,
        secure=settings.cookie_secure,
    )
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

    # AuthService.refresh ROTATES the refresh token (old one is revoked). We must
    # write the new token back to the cookie, otherwise the browser keeps sending
    # the revoked token and the next refresh trips reuse-detection — forcing the
    # user back through Campus One. (The entry-check on app mount relies on this.)
    new_refresh = tokens.get("refresh_token")
    if new_refresh:
        response.set_cookie(
            "refresh_token",
            new_refresh,
            **_cookie_kwargs(max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600),
        )

    return {
        "access_token": tokens["access_token"],
        "token_type": "bearer",
    }


# ============================================================================
# PUBLIC CONFIG
# ============================================================================

@router.get("/api/public/crisis-hotline")
async def get_crisis_hotline_config():
    """Get crisis hotline configuration (public, no auth required)."""
    return success(
        "Crisis hotline configuration",
        {
            "number": settings.CRISIS_HOTLINE_NUMBER,
            "name": settings.CRISIS_HOTLINE_NAME,
            "description": settings.CRISIS_HOTLINE_DESCRIPTION,
        }
    )


# ============================================================================
# PASSWORD RESET
# ============================================================================

@router.post("/api/auth/request-password-reset")
async def request_password_reset(
    payload: dict,
    db: AsyncSession = Depends(get_db),
):
    """Request password reset email. Public endpoint."""
    email = payload.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    await AuthService.request_password_reset(db, email)
    return success(
        "If an account exists with that email, a password reset link has been sent",
        None
    )


@router.post("/api/auth/reset-password")
async def reset_password(
    payload: dict,
    db: AsyncSession = Depends(get_db),
):
    """Reset password using token from email."""
    token = payload.get("token")
    new_password = payload.get("new_password")

    if not token or not new_password:
        raise HTTPException(status_code=400, detail="Token and new password are required")

    result = await AuthService.reset_password(db, token, new_password)
    if not result:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    return success("Password reset successfully", None)


@router.post("/api/auth/admin/reset-staff-password")
async def admin_reset_staff_password(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Admin: Send password reset email to staff member."""
    # Check if admin - accept is_admin flag or unit_head role
    user_roles = current_user.get("roles", [])
    is_admin = current_user.get("is_admin", False)
    if not (is_admin or "unit_head" in user_roles or "unit_admin" in user_roles):
        raise HTTPException(status_code=403, detail="Admin only")

    staff_id = payload.get("staff_id")
    if not staff_id:
        raise HTTPException(status_code=400, detail="Staff ID is required")

    # Find user by staff_id
    from app.models.staff import Staff

    staff = (await db.execute(
        select(Staff).where(Staff.staff_id == staff_id)
    )).scalar_one_or_none()

    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")

    # Get the user
    user = (await db.execute(
        select(User).where(User.id == staff.user_id)
    )).scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Request password reset
    await AuthService.request_password_reset(db, user.email)

    return success(
        f"Password reset link sent to {user.email}",
        None
    )


import hmac
import hashlib
import json

@router.post("/api/webhooks/campus-one")
@router.post("/webhooks/campus-one")
async def campus_one_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
    x_campus_one_signature: str = Header(None, alias="X-Campus-One-Signature")
):
    """Receive real-time user and session lifecycle events from Campus One."""
    raw_body = await request.body()
    secret = settings.CAMPUS_ONE_WEBHOOK_SECRET

    if secret:
        # Verify webhook signature using HMAC-SHA256
        expected_sig = "sha256=" + hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
        if not x_campus_one_signature or not hmac.compare_digest(x_campus_one_signature, expected_sig):
            logger.warning("Webhook signature verification failed.")
            raise HTTPException(status_code=401, detail="Invalid signature")
    else:
        logger.warning("CAMPUS_ONE_WEBHOOK_SECRET not set, signature validation bypassed.")

    try:
        payload = json.loads(raw_body.decode())
    except Exception as e:
        logger.error(f"Failed to parse webhook JSON body: {e}")
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    event_type = payload.get("event")
    data = payload.get("data", {})
    occurred_at = payload.get("occurredAt")

    logger.info(f"Received webhook event '{event_type}' (id: {payload.get('id')}, occurredAt: {occurred_at})")

    # Map Campus One webhook events
    if event_type in ("user.created", "user.updated", "user.role_changed"):
        # Map webhook fields to OIDC claims format
        campus_one_id = data.get("user_id") or data.get("id")
        email = data.get("email")
        if not campus_one_id or not email:
            logger.error(f"Missing required fields user_id/email in webhook data: {data}")
            raise HTTPException(status_code=400, detail="Missing user_id or email in data")

        # Map webhook data to OIDC claims schema
        claims = {
            "sub": campus_one_id,
            "email": email,
            "name": data.get("name") or data.get("full_name") or data.get("name", ""),
            "role": data.get("role") or data.get("new_role") or "student",
            "roles": data.get("roles") or ([data.get("new_role")] if data.get("new_role") else []),
            "custom_roles": data.get("custom_roles", []),
            "student_id": data.get("student_id"),
            "staff_id": data.get("staff_id"),
            "faculty_id": data.get("faculty_id"),
            "department_id": data.get("department_id"),
            "level": data.get("level"),
            "year_of_study": data.get("year_of_study"),
            "programme": data.get("programme") or data.get("program"),
            "study_level": data.get("study_level")
        }

        # Safe defaults if roles are empty
        if not claims["roles"] and claims["role"]:
            claims["roles"] = [claims["role"]]

        try:
            # Re-use our robust OIDC provisioning/update logic
            user, is_new = await CampusOneService.get_or_create_user_from_oidc_claims(db, claims)
            logger.info(f"Webhook successfully processed '{event_type}' for user {user.email} (is_new={is_new})")
        except Exception as exc:
            logger.error(f"Error provisioning user in webhook: {exc}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Database synchronization failed: {exc}")

    elif event_type == "user.deleted":
        campus_one_id = data.get("user_id") or data.get("id")
        if not campus_one_id:
            raise HTTPException(status_code=400, detail="Missing user_id in data")

        user = (await db.execute(
            select(User).where(User.campus_one_id == campus_one_id)
        )).scalar_one_or_none()

        if user:
            user.is_active = False
            # Revoke all refresh tokens for this user (Single Logout)
            from sqlalchemy import update as sa_update
            await db.execute(
                sa_update(RefreshToken)
                .where(RefreshToken.user_id == user.id, RefreshToken.revoked == False)
                .values(revoked=True)
            )
            await db.commit()
            logger.info(f"Webhook deactivated user {user.email} and revoked all sessions.")
        else:
            logger.warning(f"User with campus_one_id {campus_one_id} not found to delete.")

    elif event_type == "session.signed_out":
        campus_one_id = data.get("user_id")
        if not campus_one_id:
            raise HTTPException(status_code=400, detail="Missing user_id in data")

        user = (await db.execute(
            select(User).where(User.campus_one_id == campus_one_id)
        )).scalar_one_or_none()

        if user:
            # Revoke all active refresh tokens for Single Logout (SLO)
            from sqlalchemy import update as sa_update
            await db.execute(
                sa_update(RefreshToken)
                .where(RefreshToken.user_id == user.id, RefreshToken.revoked == False)
                .values(revoked=True)
            )
            await db.commit()
            logger.info(f"Webhook logged out user {user.email} (Single Logout).")
        else:
            logger.warning(f"User with campus_one_id {campus_one_id} not found to logout.")

    return success("Webhook processed successfully", None)
