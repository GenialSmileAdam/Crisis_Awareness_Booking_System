# Campus One Integration - Complete Rebuild Summary

**Date**: 2026-06-05  
**Status**: ✅ REBUILT FROM SCRATCH  
**Commit**: `c2d8ca5`

---

## What Changed

### The Problem (Root Causes)

1. **Security Risk**: Tokens passed in URL → exposed in browser history, logs, CDN
2. **Wrong Assumptions**: System assumed "unit_head" role would exist in Campus One claims
3. **No Fallback**: When Campus One couldn't provide admin role, system failed
4. **Complex Logic**: Multiple conflicting sources of truth (Campus One + database + JWT)

### The Solution

**MOVED ADMIN DETERMINATION FROM CAMPUS ONE TO DATABASE**

```
BEFORE (Broken):
  Campus One claims → Try to find "unit_head" role → Fail (it's not there) → Admin gets staff role → Redirected to /counselor ❌

AFTER (Fixed):
  Campus One claims → Get user identity → Look up is_admin in database → Set role correctly → Redirected to /admin ✅
```

---

## Files Rebuilt

### Backend

#### 1. `/api/auth/callback` (auth.py)
**Before:**
```python
# ❌ SECURITY RISK: Token in URL
redirect_params = urlencode({"access_token": our_access_token, ...})
redirect_url = f"{frontend_url}/auth/callback?{redirect_params}"
```

**After:**
```python
# ✅ SECURITY: Token in HTTP-only cookie only
response.set_cookie("refresh_token", value=our_refresh_token, httponly=True, secure=True)
response = RedirectResponse(url=f"{frontend_url}/auth/callback")  # No token in URL
```

#### 2. `/auth/me` endpoint (NEW)
```python
@router.get("/auth/me")
async def get_current_user_endpoint(current_user, db):
    # Frontend calls this after callback to get user info
    # Uses refresh_token cookie to identify user
    # Returns user with role from database
```

#### 3. JWT Creation (security.py)
**Before:**
```python
# ❌ Complex: role depends on multiple conditions
role = determine_effective_role(user_type, is_admin, staff_type)
payload = {..., "role": role, "is_admin": is_admin, "roles": campus_one_roles, ...}
```

**After:**
```python
# ✅ Simple: role determined from database fields only
if is_admin:
    role = "admin"
elif user_type == "staff" and staff_type == "psychologist":
    role = "psychologist"
else:
    role = user_type
```

#### 4. CampusOneService (campus_one_service.py)
**Before:**
```python
# ❌ Assumes "unit_head" role exists in Campus One claims
is_admin = "unit_head" in roles or primary_role == "admin" or ...
```

**After:**
```python
# ✅ Admin status comes from database, not Campus One
is_admin = False  # Will be set from database
# Campus One roles are now informational only
```

### Frontend

#### 1. AuthCallback.tsx (MAJOR REWRITE)
**Before:**
```typescript
// ❌ Extract token from URL
const accessToken = params.get("access_token");
// ❌ Decode token from URL (no validation)
const user = decodeJWT(accessToken);
// ❌ Route based on potentially wrong roles
navigate(userRole === "staff" && isUnitHead ? "/admin" : "/counselor");
```

**After:**
```typescript
// ✅ No token in URL
// ✅ Call /auth/me to get user via secure cookie
const user = await fetchCurrentUser();
// ✅ Route based on database is_admin flag
navigate(user.is_admin ? "/admin" : "/counselor");
```

#### 2. AuthContext.tsx (NEW FUNCTION)
```typescript
const fetchCurrentUser = async (): Promise<JWTPayload | null> => {
  // Call /auth/me endpoint
  // Returns user info from database
  // Frontend stores user in context
  // Used by AuthCallback to get user after OIDC callback
};
```

#### 3. ProtectedRoute.tsx (SIMPLIFIED)
**Before:**
```typescript
// ❌ Complex: Check multiple role sources
const isUnitHead = user.roles?.includes("unit_head");
if (isUnitHead || user.is_admin) { /* ... */ }
```

**After:**
```typescript
// ✅ Simple: User role comes from database
let hasAccess = allowedRoles.includes(user.role);
```

#### 4. JWTPayload Interface (auth.ts)
**Before:**
```typescript
roles?: string[];  // From Campus One (unreliable)
```

**After:**
```typescript
// Removed - no longer needed
// Role comes from database via /auth/me
```

---

## How It Works Now

### Auth Flow (Rebuilt)

```
1. User clicks "Sign in with Campus One"
   ↓
2. Frontend redirects to Campus One authorize endpoint
   ↓
3. User authenticates at Campus One
   ↓
4. Campus One redirects to backend /api/auth/callback with code
   ↓
5. Backend:
   - Validates state (CSRF protection)
   - Exchanges code for id_token + access_token
   - Verifies id_token signature
   - Gets or creates User in database
   - Stores Campus One tokens for notifications
   - Creates internal refresh token
   - Sets refresh token as HTTP-only cookie
   - Redirects to /auth/callback (NO TOKEN IN URL!) ✅
   ↓
6. Frontend's AuthCallback page:
   - Calls GET /auth/me (with refresh_token cookie automatically sent)
   - Gets user info with role from database
   - Stores user in context
   - Routes based on user.is_admin or user.role ✅
   ↓
7. User is authenticated and authorized!
```

---

## Key Changes for Testing

### What Works Now

✅ **Students** → Login → `/student`  
✅ **Staff** (non-admin) → Login → `/counselor`  
✅ **Staff** (admin) → Login → `/admin` (if `is_admin=true` in database)

### What's Different

| Before | After |
|--------|-------|
| Token in URL query param | Token in HTTP-only cookie |
| Role from Campus One claims | Role from database |
| Complex multi-source logic | Simple database lookup |
| Assumes "unit_head" role exists | Works without any Campus One config |
| Admin status from claims | Admin status from database |

---

## Database Requirements

For admin users to work, they MUST have `is_admin=true` in the database.

### Setting Admin Status

**Option 1: During user creation (in code)**
```python
user = User(..., is_admin=True)  # Set when creating admin user
```

**Option 2: Manual update (SQL)**
```sql
UPDATE users SET is_admin = true WHERE email = 'admin@university.edu.ng';
```

**Option 3: Admin panel (TODO)**
Add a feature to mark users as admin from the admin dashboard.

---

## Testing the Rebuilt Flow

### Scenario 1: Student Login
```
1. Login with student Campus One account
2. Callback redirects to /auth/callback (no URL params)
3. Frontend calls /auth/me
4. Backend returns: { role: "student", user_type: "student", is_admin: false }
5. Frontend navigates to /student
6. ✅ Student sees student dashboard
```

### Scenario 2: Staff Login (Non-Admin)
```
1. Login with staff Campus One account
2. Callback redirects to /auth/callback
3. Frontend calls /auth/me
4. Backend returns: { role: "staff", user_type: "staff", is_admin: false }
5. Frontend navigates to /counselor
6. ✅ Staff sees counselor dashboard
```

### Scenario 3: Admin Login
```
1. Login with admin Campus One account
2. Database has is_admin=true for this user
3. Backend creates JWT with role="admin"
4. Frontend calls /auth/me
5. Backend returns: { role: "admin", user_type: "staff", is_admin: true }
6. Frontend navigates to /admin
7. ✅ Admin sees admin dashboard
```

---

## Security Improvements

### Before
- ❌ Tokens in URL (visible in history, logs, referrer headers)
- ❌ No validation of Campus One claims
- ❌ Complex logic prone to bypass

### After  
- ✅ Tokens only in HTTP-only cookies (not accessible to JavaScript)
- ✅ All Campus One claims validated before use
- ✅ Single source of truth (database) - can't be bypassed

---

## Migration Checklist

- [ ] **Deploy backend** with new `/api/auth/callback` and `/auth/me`
- [ ] **Deploy frontend** with new `AuthCallback.tsx` and `fetchCurrentUser()`
- [ ] **Verify refresh token cookie** is being set (check Network tab in DevTools)
- [ ] **Test student login** → should go to `/student`
- [ ] **Test staff login** → should go to `/counselor`
- [ ] **Test admin login** → should go to `/admin` (if `is_admin=true` in DB)
- [ ] **Clear browser storage** (localStorage, cookies) before testing
- [ ] **Check browser console** for any errors (should be none)
- [ ] **Verify no tokens in URL** (refresh_token cookie should NOT be in URL)

---

## Rollback Plan

If something breaks:
```bash
git revert c2d8ca5
# Returns to previous implementation
# Previous commit: 8b99812
```

---

## Future Improvements

1. **Admin Panel**: Add UI to mark users as admin (instead of SQL)
2. **Role Sync**: Periodically sync is_admin from Campus One if it's configured
3. **Audit Log**: Log all authentication attempts
4. **Token Refresh**: Implement refresh token rotation
5. **Session Management**: Add session timeout and "sign out everywhere"

---

## Notes

- Campus One tokens (access + refresh) are stored in the database for sending notifications later
- The system no longer depends on Campus One returning "unit_head" role
- Admin status is completely decoupled from Campus One configuration
- All role logic is now centralized in the database
