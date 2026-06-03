# Campus One OIDC Integration - Implementation Guide

**Status**: Ready to implement  
**Priority**: 🔴 Critical - System currently cannot sign in via Campus One

---

## Critical Configuration Bug Found 🐛

### Issue: Missing `offline_access` Scope

**Current `.env` (Line 21):**
```
CAMPUS_ONE_SCOPES=openid email profile academic notifications
```

**Should Be:**
```
CAMPUS_ONE_SCOPES=openid email profile academic notifications offline_access
```

**Impact**: Without `offline_access`, Campus One won't issue a refresh token, and your backend **cannot send notifications when users are offline**.

---

## Step-by-Step Implementation

### Step 1: Fix Backend Configuration

**File**: `.env`

Update line 21:
```diff
- CAMPUS_ONE_SCOPES=openid email profile academic notifications
+ CAMPUS_ONE_SCOPES=openid email profile academic notifications offline_access
```

### Step 2: Create Frontend Callback Handler

**Create new file**: `frontend/src/pages/AuthCallback.tsx`

```typescript
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { accessToken, isAuthenticated } = useAuth();
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Extract token from URL
        const params = new URLSearchParams(window.location.search);
        const token = params.get("access_token");
        const error = params.get("error");

        if (error) {
          toast.error(`Authentication failed: ${error}`);
          navigate("/login");
          return;
        }

        if (!token) {
          toast.error("No authentication token received");
          navigate("/login");
          return;
        }

        // Validate token format (JWT has 3 parts)
        if (token.split(".").length !== 3) {
          toast.error("Invalid token format");
          navigate("/login");
          return;
        }

        // Call new method in AuthContext to handle callback login
        await useAuth().loginFromCallback(token);

        // Token is set, redirect based on user role
        const user = useAuth().user;
        if (user?.user_type === "student") {
          navigate("/student");
        } else if (user?.user_type === "staff") {
          if (user?.role === "admin") {
            navigate("/admin");
          } else if (user?.role === "psychologist") {
            navigate("/counselor");
          }
        }
      } catch (err) {
        console.error("Callback processing failed:", err);
        toast.error("Failed to process authentication");
        navigate("/login");
      } finally {
        setIsProcessing(false);
      }
    };

    processCallback();
  }, [navigate]);

  if (isProcessing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-16 w-16 rounded-full border-2 border-muted border-t-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Completing sign-in...</p>
        </div>
      </div>
    );
  }

  return null;
}
```

### Step 3: Update AuthContext with Callback Handler

**File**: `frontend/src/context/AuthContext.tsx`

Add this method to the `AuthProvider` component:

```typescript
// Helper: Decode JWT payload from token
function decodeJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const decoded = JSON.parse(atob(parts[1]));
    return decoded as JWTPayload;
  } catch {
    return null;
  }
}

// Add this to the login object in your provider:
const loginFromCallback = async (accessToken: string): Promise<void> => {
  const decoded = decodeJWT(accessToken);
  if (!decoded) {
    throw new Error("Failed to decode token from callback");
  }

  // Store token and user
  setAccessToken(accessToken);
  setUser(decoded);
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(decoded));

  // Reset check-in state on fresh login (same as password login)
  localStorage.removeItem("last_pulse");
  localStorage.removeItem("last_phq9");
  localStorage.removeItem("last_gad7");
};
```

Then update the context export to include this:

```typescript
export interface AuthContextState {
  user: JWTPayload | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (role: string, identifier: string, password: string) => Promise<void>;
  loginFromCallback: (accessToken: string) => Promise<void>;  // ← Add this
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

// ... in the provider value:
<AuthContext.Provider value={{ user, accessToken, isLoading, login, loginFromCallback, logout, isAuthenticated }}>
```

### Step 4: Add Route for Callback

**File**: `frontend/src/App.tsx`

Add this import at the top:
```typescript
import AuthCallback from "./pages/AuthCallback";
```

Add this route inside the `<Routes>`:
```typescript
<Route path="/auth/callback" element={<AuthCallback />} />
```

**Complete updated Routes section example:**
```typescript
<Routes>
  <Route path="/" element={<Landing />} />
  <Route path="/login" element={<Login />} />
  <Route path="/auth/callback" element={<AuthCallback />} />  {/* ← NEW */}
  {/* ... rest of routes ... */}
</Routes>
```

### Step 5: Update Login Page with Campus One Button

**File**: `frontend/src/pages/Login.tsx`

Find the form section (around line 170) and add a Campus One sign-in section **before** the password form:

```typescript
// Add this import at the top
import { useCallback } from "react";

// Add this handler in the component
const handleCampusOneSignIn = useCallback(() => {
  // Redirect to backend OIDC initiation endpoint
  window.location.href = `${import.meta.env.VITE_API_BASE_URL || ""}/auth/campus-one/authorize`;
}, []);

// Add this section in the JSX, before the form (after the role selector):
<div className="mt-6 space-y-4">
  <Button
    type="button"
    onClick={handleCampusOneSignIn}
    className="w-full h-11 border border-primary/30 bg-transparent text-primary hover:bg-primary/5"
    disabled={isSubmitting}
  >
    <span>Sign in with Campus One</span>
  </Button>
  
  <div className="relative">
    <div className="absolute inset-0 flex items-center">
      <div className="w-full border-t border-border"></div>
    </div>
    <div className="relative flex justify-center text-xs">
      <span className="px-2 bg-background text-muted-foreground">Or sign in with password</span>
    </div>
  </div>
</div>

{/* Then keep existing form */}
<form onSubmit={submit} className="mt-6 space-y-4">
  {/* ... existing form code ... */}
</form>
```

### Step 6: Security Fix - Move Token Out of URL (Backend)

**File**: `backend/app/routers/auth.py`

This is a medium-term fix. Currently, tokens are passed in URL parameters (insecure). 

**Current (Insecure):**
```python
redirect_params = urlencode({
    "access_token": our_access_token,
    "user_type": identity["user_type"],
})
redirect_url = f"{frontend_url.rstrip('/')}/auth/callback?{redirect_params}"
```

**Better Approach** (but keep existing for now):
```python
# Option 1: Use existing refresh_token cookie for transport, put access token in response body
# (requires frontend to have a receiving endpoint that reads the response)

# Option 2: Use a temporary session cache
# Store token in Redis/cache with expiry
# Return a callback_session_id in the URL
# Frontend trades callback_session_id for access_token via an API call

# For now, the current URL approach will work but should be refactored
```

**For immediate implementation**: Keep the current approach but add validation on frontend.

---

## Testing Checklist

### Before Testing
- [ ] Updated `.env` with correct scopes (added `offline_access`)
- [ ] Created `AuthCallback.tsx` page
- [ ] Updated `AuthContext.tsx` with `loginFromCallback` method
- [ ] Added `/auth/callback` route to App.tsx
- [ ] Updated Login.tsx with Campus One button
- [ ] Restarted backend (to load new `.env`)
- [ ] Restarted frontend dev server

### Development Testing (localhost)

```bash
# 1. Start both frontend and backend
npm run dev  # frontend
python -m uvicorn app.main:app --reload  # backend

# 2. Visit login page
# http://localhost:5173/login

# 3. Click "Sign in with Campus One"
# Should redirect to Campus One login page

# 4. After authentication at Campus One
# Should return to http://localhost:5173/auth/callback?access_token=...
# Should show loading state briefly
# Should redirect to /student or /counselor or /admin based on role

# 5. Check browser console
# Should not show JWT errors
# Should show successful token storage
```

### Production Testing (after deploy)

```bash
# 1. Visit production login
# https://crisis-awareness-booking-system.vercel.app/login

# 2. Click "Sign in with Campus One"
# Should use production URLs from .env:
# - BACKEND_URL=https://crisis-awareness-booking-system.onrender.com
# - CAMPUS_ONE_REDIRECT_URI=https://crisis-awareness-booking-system.onrender.com/api/auth/callback

# 3. After Campus One authentication
# Should redirect to: https://crisis-awareness-booking-system.vercel.app/auth/callback?access_token=...
# Should properly set session and redirect to dashboard
```

---

## Debugging Guide

### Symptom: "Callback route not found"
- **Cause**: `/auth/callback` route not added to App.tsx
- **Fix**: Add the route to App.tsx and restart dev server

### Symptom: "No authentication token received"
- **Cause**: Token not in URL from backend
- **Check**: 
  - Backend console for errors in callback handler
  - Network tab: Is the redirect from `/api/auth/callback` including `access_token` param?

### Symptom: "Invalid token format"
- **Cause**: Token doesn't have 3 JWT parts (header.payload.signature)
- **Check**: 
  - Is backend creating tokens correctly?
  - Is `JWT_ALGORITHM` and `JWT_SECRET` set in `.env`?

### Symptom: "Failed to decode token"
- **Cause**: JWT decoding issue
- **Fix**: Open console, paste token, run:
  ```javascript
  const parts = "YOUR_TOKEN_HERE".split(".");
  console.log(JSON.parse(atob(parts[1])));
  ```

### Symptom: "Sign-in works but no refresh token cookie"
- **Cause**: Missing `offline_access` scope
- **Fix**: Update `.env` CAMPUS_ONE_SCOPES

### Symptom: User redirects to wrong dashboard
- **Cause**: `user.user_type` or `user.role` wrong in JWT
- **Fix**: Check what Campus One is sending in claims, verify mapping in backend

---

## Expected JWT Payload (After Successful Sign-In)

When you decode the access token, you should see:

```json
{
  "sub": "user-id-from-campus-one",
  "name": "Student Name",
  "user_type": "student",        // or "staff"
  "role": "student",              // or "psychologist", "admin"
  "is_admin": false,
  "student_id": "27001011",       // if student
  "staff_id": null,
  "staff_type": null,
  "iat": 1234567890,
  "exp": 1234571490
}
```

---

## Files Changed Summary

| File | Change | Status |
|------|--------|--------|
| `.env` | Add `offline_access` to CAMPUS_ONE_SCOPES | ✅ 1 line |
| `frontend/src/pages/AuthCallback.tsx` | Create new callback handler | ✅ ~90 lines |
| `frontend/src/context/AuthContext.tsx` | Add loginFromCallback method | ✅ ~30 lines |
| `frontend/src/App.tsx` | Add /auth/callback route | ✅ 3 lines |
| `frontend/src/pages/Login.tsx` | Add Campus One button | ✅ ~30 lines |

**Total Changes**: ~150 lines of code + 1 env variable

---

## Next Steps (Post-Implementation)

1. ✅ Test Campus One sign-in works
2. 📋 Remove password login form (once Campus One stable)
3. 🔐 Move token from URL to secure session cookie
4. 📊 Monitor Campus One authentication errors in production
5. 🔄 Verify offline_access scope enables notification queue
6. 📝 Update documentation for team

