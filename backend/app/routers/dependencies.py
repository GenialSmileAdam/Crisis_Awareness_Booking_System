from fastapi import Depends, Header, HTTPException, Request

from app.core.security import get_current_user
from app.utils.idempotency import idempotency_store


def require_roles(*roles: str):
    def dependency(current_user: dict = Depends(get_current_user)) -> dict:
        is_allowed = current_user["role"] in roles
        if "admin" in roles and current_user.get("is_admin"):
            is_allowed = True
        if "staff" in roles and current_user.get("user_type") == "staff":
            is_allowed = True
        if not is_allowed:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user

    return Depends(dependency)


async def handle_idempotency(
    request: Request,
    idempotency_key: str | None = Header(default=None),
) -> tuple[str | None, dict | None]:
    if not idempotency_key:
        return None, None
    cache_key = f"{request.method}:{request.url.path}:{idempotency_key}"
    return cache_key, idempotency_store.get(cache_key)

def cache_idempotent_response(cache_key: str | None, payload: dict) -> dict:
    if cache_key:
        idempotency_store[cache_key] = payload
    return payload
