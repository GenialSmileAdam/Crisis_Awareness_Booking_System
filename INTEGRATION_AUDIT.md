# Campus One Integration - Complete Audit & Rebuild Plan

**Date**: 2026-06-05  
**Status**: 🔴 CRITICAL - Fundamental Design Flaws Identified

---

## Issues Found

### 🔴 **CRITICAL ISSUES**

1. **Security Risk: Token in URL**
   - Current: Passes JWT access token in redirect URL query parameter
   - Issue: Tokens can be logged in browser history, server logs, CDN logs
   - Impact: Tokens exposed to network layer
   - Fix: Use secure HTTP-only cookies or POST redirect

2. **Role Mapping Built on Non-Existent Role**
   - Current: System expects "unit_head" role from Campus One
   - Issue: Campus One returns empty `roles: []` array
   - Root Cause: "unit_head" is a custom role that must be set up in Campus One dashboard, user hasn't done this
   - Impact: All admins get redirected to counselor view instead of admin view
   - Evidence: Admin user logs in with `roles: []`, `staff_type: "support_staff"`

3. **Wrong Authorization Model**
   - Current: Using `is_admin` flag + role checks
   - Issue: `is_admin` is set to false when "unit_head" role is missing
   - Should Be: Store admin status in database, use Campus One role only as input signal

4. **Overly Complex JWT Payload**
   - Current: Includes `roles`, `is_admin`, `staff_type`, `user_type`, `role` all at once
   - Issue: Multiple conflicting sources of truth
   - Should Be: Simple, single source of truth

5. **No Fallback for Missing Campus One Config**
   - Current: Assumes all fields will be present and valid
   - Issue: Crashes or behaves unexpectedly when Campus One returns incomplete data
   - Should Be: Validate and have sensible defaults

---

## Campus One Claims Audit

### What We Get from Campus One OIDC

**Current actual data from login:**

```json
{
  "sub": "user_id_123",
  "email": "user@university.edu.ng",
  "name": "John Doe",
  "role": "staff",                    // ← PRIMARY ROLE (always present)
  "roles": [],                        // ← CUSTOM ROLES (empty - not configured!)
  "custom_roles": [],                 // ← APP ROLES (empty)
  "student_id": null,                 // ← Present for students
  "iat": 1717507200,
  "exp": 1717510800
}
```

### What We Assumed Would Come

```json
{
  "role": "staff",
  "roles": ["staff", "unit_head"],    // ← NEVER HAPPENS (not set up)
  "custom_roles": ["unit_head"]       // ← NEVER HAPPENS
}
```

---

## Root Causes

| Problem | Cause | Solution |
|---------|-------|----------|
| Admins not redirected to admin view | "unit_head" role doesn't exist in Campus One | Store admin status in database |
| Empty roles array | User never assigned custom role in Campus One | Don't rely on Campus One for admin detection |
| Role mapping fails | Assuming fields that don't exist | Validate Campus One response, use database |
| Complex auth logic | Trying to map multiple role sources | Single source of truth: database |

---

## Current Flow (Broken)

```
Campus One Login
    ↓
Backend receives code
    ↓
Exchange code → get ID token
    ↓
Verify & decode JWT
    ↓
Map Claims to User (assumes "unit_head" role) ❌ FAILS
    ↓
Create internal JWT
    ↓
Redirect to frontend with token in URL ❌ SECURITY RISK
    ↓
Frontend decodes token from URL
    ↓
Routes based on roles[] (which is empty) ❌ WRONG ROUTE
```

---

## Proper Flow (To Build)

```
Campus One Login
    ↓
Backend receives code
    ↓
Exchange code → get ID token + access token
    ↓
Verify & decode JWT (validate signature)
    ↓
Get or create User in database
    ↓
Store Campus One tokens for later use
    ↓
Look up User role from DATABASE (not Campus One) ✅
    ↓
Create secure HTTP-only session cookie ✅
    ↓
Redirect to frontend with NO token in URL ✅
    ↓
Frontend loads from session (cookie) ✅
    ↓
Routes based on DATABASE role ✅
```

---

## Implementation Strategy

### Phase 1: Simplify Role Model
- Remove assumptions about Campus One roles
- Store user role (`admin`, `staff`, `student`) in database
- Use Campus One `primary role` only as input signal
- Seed admin user in database during setup

### Phase 2: Fix Security
- Remove token from redirect URL
- Use HTTP-only session cookies
- Implement proper cookie handling
- Add CSRF protection

### Phase 3: Remove Role Complexity
- Delete campus_one_roles from JWT
- Delete is_admin flag logic
- Use single role field from database
- Store staff_type in database, not derived from role

### Phase 4: Add Proper Error Handling
- Validate all Campus One claims
- Handle missing fields gracefully
- Log all authentication attempts
- Return clear error messages

### Phase 5: Test & Validate
- Test all three user types (student, staff, admin)
- Test Campus One token refresh
- Test local fallback for development
- Verify no tokens in logs/history

---

## Files to Rebuild

### Backend
- `backend/app/routers/auth.py` - Remove token from URL, use cookies
- `backend/app/services/campus_one_service.py` - Simplify role mapping
- `backend/app/core/security.py` - Simplify JWT, use database role
- Database migrations - Add user `role` field if missing

### Frontend
- `frontend/src/context/AuthContext.tsx` - Remove URL token handling
- `frontend/src/pages/AuthCallback.tsx` - Use session cookie instead
- `frontend/src/api/auth.ts` - Remove token decoding from URL
- `frontend/src/components/ProtectedRoute.tsx` - Use database role

### Config
- `.env` - Add DEFAULT_ADMIN_EMAIL for local development
- Database - Seed admin user

---

## Rollback Plan

If rebuild breaks anything:
```bash
git revert [commit-hash]  # Revert back to working state
```

Current working commit: `8b99812`

---

## Success Criteria

- ✅ Student logs in → redirected to `/student`
- ✅ Staff logs in → redirected to `/counselor`
- ✅ Admin logs in → redirected to `/admin` (stored in database)
- ✅ No tokens in browser history (not in URL)
- ✅ No tokens in server logs (using secure cookies)
- ✅ Tokens verified on every request
- ✅ Role comes from database, not Campus One
- ✅ Campus One tokens stored for notification use
- ✅ Admin can be set locally for development (no Campus One needed)

