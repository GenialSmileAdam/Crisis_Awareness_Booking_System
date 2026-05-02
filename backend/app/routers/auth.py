from fastapi import APIRouter, Depends, Header, Request, Response
from fastapi.security import OAuth2PasswordRequestForm

from app.core.config import settings
from app.core.database import get_db
from app.core.limiter import limiter
from app.core.security import get_current_user
from app.routers.dependencies import cache_idempotent_response, handle_idempotency
from app.schemas.auth import RegisterRequest, TokenResponse
from app.services.auth_service import AuthService
from app.services.campus_sso_service import CampusSSOService
from app.utils.response import success

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


@router.get("/auth/campus/session")
@limiter.limit("10/minute")
async def campus_session(
    request: Request,
    response: Response,
    db=Depends(get_db),
):
    result = await CampusSSOService.sync_user_from_cookie(
        db,
        request.headers.get("cookie"),
    )
    set_refresh_cookie(response, result["refresh_token"])
    return success(
        "Campus One session validated successfully",
        {
            "access_token": result["access_token"],
            "token_type": result["token_type"],
            "sign_in_url": settings.CAMPUS_ONE_SIGN_IN_URL,
            "user": result["user"],
        },
    )


@router.get("/auth/campus/debug")
@limiter.limit("10/minute")
async def campus_debug(
    request: Request,
    db=Depends(get_db),
):
    diagnostics = await CampusSSOService.debug_cookie_state(
        db,
        request.headers.get("cookie"),
    )
    return success("Campus One debug information generated", diagnostics)


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

    email = form_data.username
    password = form_data.password

    tokens = await AuthService.login(db, email, password)
    set_refresh_cookie(response, tokens["refresh_token"])

    body = {
        "access_token": tokens["access_token"],
        "token_type": "bearer",
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
        result = await CampusSSOService.sync_user_from_cookie(
            db,
            request.headers.get("cookie"),
        )
        set_refresh_cookie(response, result["refresh_token"])
        body = {
            "access_token": result["access_token"],
            "token_type": result["token_type"],
        }
        return cache_idempotent_response(cache_key, body)

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
