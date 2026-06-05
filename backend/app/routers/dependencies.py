from fastapi import Depends, Header, HTTPException, Request

from app.core.security import get_current_user
from app.utils.idempotency import idempotency_store


def require_roles(*allowed_roles: str):
    def dependency(current_user: dict = Depends(get_current_user)) -> dict:
        # Authorization based on Campus One roles array
        user_roles = current_user.get("roles", [])

        # Map Campus One roles to required permission roles
        role_mapping = {
            "unit_head": ["admin", "staff"],  # unit_head can access admin/staff routes
            "psychologist": ["psychologist", "admin", "staff"],  # psychologist can access their routes + staff
            "student": ["student"],  # students can only access student routes
        }

        # Check if user's Campus One roles satisfy any of the required roles
        is_allowed = False
        for user_role in user_roles:
            allowed_for_role = role_mapping.get(user_role, [])
            if any(req_role in allowed_for_role for req_role in allowed_roles):
                is_allowed = True
                break

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
