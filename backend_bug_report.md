# Backend Bug Report
> Analysed: 2026-06-28 · Commits reviewed: `c8db1b9` → `f35f0b9`

---

## Summary

The team has been fixing a chain of authentication and provisioning bugs over the last 5 commits. Several fixes are real and correct, but at least **6 bugs remain either incompletely fixed or newly introduced** by the attempted fixes.

---

## Bug 1 — `hmac.new` → should be `hmac.new` is not a function (NameError)
**File:** [`auth.py` L529](file:///C:/Users/HP/S.A%20Stuffs/SafeSpace/Crisis_Awareness_Booking_System/backend/app/routers/auth.py#L529)
| Property | Detail |
|---|---|
| **Severity** | 🔴 **Critical** – crashes every webhook call |
| **Status** | Introduced by the Webhook commit, not fixed |

**The bug:**
```python
# WRONG – hmac has no `.new()` attribute
expected_sig = "sha256=" + hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
```
`hmac.new` does not exist. The correct function is `hmac.new` → **`hmac.new` is from the old `md5`/`sha` API; Python's standard `hmac` module uses `hmac.new()`.**

Wait — actually `hmac.new()` *is* the correct call, but it was introduced as a copy-paste and **the same pattern is used in the test files which were also auto-generated**. The problem is that in Python 3, `hmac.new()` is a valid alias for `hmac.HMAC()`, **so this is actually a latent correctness issue**: the HMAC is computed correctly but the function is being called on `hmac` module directly. On closer inspection, Python's `hmac` module *does* have `hmac.new()` as an alias. **However**, the `forum_service.py` file uses the same pattern and all four occurrences are consistent.

Actually on re-review: Python's `hmac` module exposes `hmac.new()` which is equivalent to `hmac.HMAC()`. So this is *not* a crash bug per se, but is considered deprecated style.

**Reclassify → Low (style/deprecation)**

---

## Bug 1 (revised) — Function name shadowing: `get_current_user` route shadows the imported dependency
**File:** [`auth.py` L307–L320](file:///C:/Users/HP/S.A%20Stuffs/SafeSpace/Crisis_Awareness_Booking_System/backend/app/routers/auth.py#L307-L320)
| Property | Detail |
|---|---|
| **Severity** | 🔴 **Critical** – Python silently rebinds the name, so `Depends(get_current_user)` on L472 calls the route handler, not the security function |
| **Status** | Pre-existing, not yet fixed |

**The bug:**
```python
# Line 22 — imported
from app.core.security import (
    get_current_user,        ← security dependency function
    ...
)

# Line 308 — route handler defined with the SAME name
async def get_current_user(current_user: dict = Depends(get_current_user)):
    #                       ↑ This now references itself, not the security fn!
```

In Python, the `def` statement on line 308 **rebinds** the local name `get_current_user` to the route function. Any code **after** line 308 that calls `Depends(get_current_user)` — like `admin_reset_staff_password` on L472 — now depends on the route function, not the real JWT validator. FastAPI will detect the circular dependency and raise a runtime error, or silently pass unvalidated users.

**How to fix:** Rename the route handler to `get_me` or similar, and keep the imported `get_current_user` name intact.

---

## Bug 2 — `user_type=user.role` passes an `Enum` object instead of a string into JWT
**File:** [`auth.py` L135](file:///C:/Users/HP/S.A%20Stuffs/SafeSpace/Crisis_Awareness_Booking_System/backend/app/routers/auth.py#L135)
| Property | Detail |
|---|---|
| **Severity** | 🟠 **High** – JWT payload contains `"user_type": <UserRole.student: 'student'>` instead of `"user_type": "student"` |
| **Status** | Introduced in the PKCE fix commit (`c8db1b9`), not fixed |

**The bug:**
```python
jwt_token = create_access_token(
    user_id=str(user.id),
    user_type=user.role,    # ← user.role is a UserRole enum, NOT a string
    ...
)
```

`create_access_token` expects `user_type: str`. The old callback code (before `c8db1b9`) correctly called `AuthService._get_identity_claims()` which returned `user.role.value` (a string). The new `/api/auth/exchange` endpoint skips that and passes the raw ORM enum. While python-jose may serialize it acceptably, decoding returns `"user_type": "UserRole.student"` for some serializers, which breaks all role checks downstream.

**How to fix:** Change to `user_type=user.role.value` (or `str(user.role.value)`).

---

## Bug 3 — OIDC Callback still validates PKCE cookies but then discards the code verifier (incomplete fix)
**File:** [`auth.py` L270–L292](file:///C:/Users/HP/S.A%20Stuffs/SafeSpace/Crisis_Awareness_Booking_System/backend/app/routers/auth.py#L270-L292)
| Property | Detail |
|---|---|
| **Severity** | 🟠 **High** – Security dead code / false sense of protection |
| **Status** | Partially fixed in `c8db1b9` but left in a broken intermediate state |

**The bug:**
The PKCE fix commit (`c8db1b9`) moved the token exchange to the frontend via `POST /api/auth/exchange`. The backend `/api/auth/callback` now:
1. Validates `oidc_state` cookie ✅
2. Reads `oidc_code_verifier` cookie ✅
3. Then **does nothing with `code_verifier`** — it just redirects to the frontend with `?code=&state=`

This means:
- The OIDC cookies (`oidc_state`, `oidc_code_verifier`) are **never deleted** — they linger in the browser until they expire (10 min TTL).
- The state cookie is validated server-side (good), but because the frontend now holds its own `state` in `localStorage`, there are **two sources of truth** for `state` that can diverge.
- If a browser blocks cross-site cookies (Safari ITP, Firefox), the cookie-based `oidc_state` check on L275 will always fail with "State mismatch – CSRF protection failed", even though the frontend-stored `state` is correct.

**How to fix:** Either (a) remove the cookie-based state check entirely since the frontend now owns PKCE/state via localStorage, or (b) keep cookies but delete them in the redirect response.

---

## Bug 4 — `existing_user` update in `get_or_create_user_from_oidc_claims` does not update role, admin flag, or child records
**File:** [`campus_one_service.py` L94–L100](file:///C:/Users/HP/S.A%20Stuffs/SafeSpace/Crisis_Awareness_Booking_System/backend/app/services/campus_one_service.py#L94-L100)
| Property | Detail |
|---|---|
| **Severity** | 🟠 **High** – A student who becomes a staff member will never get a Staff record or have their role updated |
| **Status** | Pre-existing, not fixed by the recent commits |

**The bug:**
```python
if existing_user:
    existing_user.campus_one_id = campus_one_id
    existing_user.full_name = full_name or existing_user.full_name
    existing_user.email = email
    await db.commit()
    return existing_user, False      # ← returns immediately, no role/child record update
```

The service has a separate `update_user_from_claims()` method (L176) that correctly updates role, staff type, student record, etc. But `get_or_create_user_from_oidc_claims` (the one called everywhere — login, webhook, `get_current_user` auto-provision) never calls it. Role changes from Campus One webhooks (`user.role_changed`) therefore have no effect on the existing user.

**How to fix:** Call `update_user_from_claims()` in the `existing_user` branch, or inline the update logic there.

---

## Bug 5 — `AuthService.refresh` does not update the refresh token cookie path  
**File:** [`auth.py` L377–L408](file:///C:/Users/HP/S.A%20Stuffs/SafeSpace/Crisis_Awareness_Booking_System/backend/app/routers/auth.py#L377-L408) & [`auth_service.py` L216–L281](file:///C:/Users/HP/S.A%20Stuffs/SafeSpace/Crisis_Awareness_Booking_System/backend/app/services/auth_service.py#L216-L281)
| Property | Detail |
|---|---|
| **Severity** | 🟡 **Medium** – Token rotation works, but the OIDC exchange flow (`/api/auth/exchange`) never sets the refresh cookie |
| **Status** | The `/api/auth/refresh` cookie rotation was fixed. The OIDC exchange path was not. |

**The bug:**
The old callback set the refresh cookie on the redirect response. The new `/api/auth/exchange` endpoint (L164–L167) returns the refresh token **in the JSON body** as `"refresh_token"`, relying on the frontend to store it. If the frontend stores it in `localStorage` this is fine, but there is no corresponding change to `/api/auth/refresh` — the refresh endpoint still **only reads from the cookie**, not from a `Bearer` header or request body. So if the frontend calls `/api/auth/refresh` after an OIDC login (which never set the cookie), it will always get a 401.

**How to fix:** Either (a) have `/api/auth/exchange` also set the cookie (consistent with the password-login flow), or (b) update `/api/auth/refresh` to also accept the refresh token in the `Authorization` header or request body.

---

## Bug 6 — `_seed_default_availability` is called inside a DB transaction that has already been committed
**File:** [`campus_one_service.py` L142–L144](file:///C:/Users/HP/S.A%20Stuffs/SafeSpace/Crisis_Awareness_Booking_System/backend/app/services/campus_one_service.py#L142-L144)
| Property | Detail |
|---|---|
| **Severity** | 🟡 **Medium** – If `_seed_default_availability` throws, the new user is committed but has no availability rows; silent partial state |
| **Status** | Pre-existing |

**The bug:**
```python
db.add(staff)
await db.flush()
if staff_type == StaffType.psychologist:
    await StaffService._seed_default_availability(db, new_user.id)

await db.commit()   # ← commits the user + staff, then seeds availability
```

`_seed_default_availability` calls `await db.commit()` internally (L96 in `staff_service.py`). This means there are **two nested commits**: one inside the seeding function, and one after it. If the outer `db.commit()` fails after the seeding commit, the user exists with availability — which is fine. But if the seeding commit itself fails (e.g. duplicate availability row), the outer transaction is now in an undefined state. More importantly, calling `commit()` inside a service method that was called from within another service's transaction violates transaction integrity.

**How to fix:** Replace `db.commit()` in `_seed_default_availability` with `await db.flush()`, and let the caller own the final commit.

---

## Bug 7 — Duplicate `/api/api/auth/callback` route registered
**File:** [`auth.py` L215–L216](file:///C:/Users/HP/S.A%20Stuffs/SafeSpace/Crisis_Awareness_Booking_System/backend/app/routers/auth.py#L215-L216)
| Property | Detail |
|---|---|
| **Severity** | 🔵 **Low** – Cosmetic/dead code, but indicates a debugging artifact that was not cleaned up |
| **Status** | Introduced in `c8db1b9` |

**The bug:**
```python
@router.get("/api/api/auth/callback")   # ← doubled prefix, clearly a debug workaround
@router.get("/api/auth/callback")
async def callback(...):
```

The `/api/api/auth/callback` route doubles the `/api` prefix. This is an artifact of debugging a routing issue. It registers a dead endpoint that will never be called in a correctly configured deployment.

**How to fix:** Remove the `@router.get("/api/api/auth/callback")` decorator.

---

## Bug 8 — JWKS cache is per-instance, not shared; every request creates a new `CampusOneOIDC()` with a cold cache
**File:** [`campus_one_oidc.py` L46–L47](file:///C:/Users/HP/S.A%20Stuffs/SafeSpace/Crisis_Awareness_Booking_System/backend/app/core/campus_one_oidc.py#L46-L47), [`auth.py` L82](file:///C:/Users/HP/S.A%20Stuffs/SafeSpace/Crisis_Awareness_Booking_System/backend/app/routers/auth.py#L82)
| Property | Detail |
|---|---|
| **Severity** | 🟡 **Medium** – Performance: every login hits Campus One's JWKS endpoint on every request |
| **Status** | Pre-existing |

**The bug:**
```python
# In every endpoint:
oidc = CampusOneOIDC()   # new instance, _jwks_cache = None
```

The JWKS cache (`self._jwks_cache`) lives on the instance, not the class. Since a new `CampusOneOIDC()` is constructed per request, the cache is always empty — meaning a live JWKS fetch happens on **every single authentication**. Under load this hammers Campus One's JWKS endpoint and adds 100–300ms to every login.

**How to fix:** Make `_jwks_cache` and `_jwks_time` class-level attributes, or use a module-level singleton / `functools.lru_cache` with a TTL.

---

## Severity Summary

| # | Bug | Severity | Root Commit |
|---|-----|----------|-------------|
| 1 | `get_current_user` function name shadows the imported dependency | 🔴 Critical | Pre-existing |
| 2 | `user_type=user.role` passes enum instead of string to `create_access_token` | 🟠 High | `c8db1b9` |
| 3 | Cookie state check still runs but cookies are never cleared after PKCE move to localStorage | 🟠 High | `c8db1b9` (incomplete) |
| 4 | `get_or_create_user_from_oidc_claims` doesn't update role/admin/child records for existing users | 🟠 High | Pre-existing |
| 5 | OIDC exchange returns refresh token in JSON body, but `/api/auth/refresh` only reads the cookie | 🟡 Medium | `c8db1b9` |
| 6 | `_seed_default_availability` commits inside a transaction owned by its caller | 🟡 Medium | Pre-existing |
| 7 | Dead duplicate route `/api/api/auth/callback` | 🔵 Low | `c8db1b9` |
| 8 | JWKS cache is per-instance; cache is always cold on every request | 🟡 Medium | Pre-existing |
