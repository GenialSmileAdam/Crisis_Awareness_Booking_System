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
