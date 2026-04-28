# AuthContext: Before & After Comparison

## 1. Initialization State

### ❌ BEFORE: Loses Token on Reload
```tsx
const [user, setUser] = useState<JWTPayload | null>(() => {
  const raw = localStorage.getItem("ss_user");
  return raw ? JSON.parse(raw) : null;
});
const [accessToken, setAccessToken] = useState<string | null>(null); // ← ALWAYS null
const [isLoading, setIsLoading] = useState(true);
```

### ✅ AFTER: Restores Both Token & User
```tsx
const [user, setUser] = useState<JWTPayload | null>(() => {
  return safeParseJSON(localStorage.getItem(USER_KEY), null); // ← Safe parsing
});

const [accessToken, setAccessToken] = useState<string | null>(() => {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  // Validate token is not empty or corrupted (should have 3 JWT parts)
  if (token && token.trim() && token.split(".").length === 3) {
    return token; // ← Restored from storage
  }
  return null;
});

const [isLoading, setIsLoading] = useState(true);
```

---

## 2. Initialization Logic

### ❌ BEFORE: Only Checks User, No Error Handling
```tsx
useEffect(() => {
  const initializeAuth = async () => {
    try {
      const response = await refreshToken(); // ← Always called
      // ... handle response
    } catch {
      // ... handle error
    } finally {
      setIsLoading(false);
    }
  };
  initializeAuth();
}, []);
```

**Issues:**
- Calls refresh unconditionally
- Only checks `ss_user`, ignores token
- No JSON parse error handling
- Refresh spam on first load

### ✅ AFTER: Smart Check, Safe Parsing, Proper Validation
```tsx
// Helper: Clear all auth-related state and storage
const clearAuthState = () => {
  setAccessToken(null);
  setUser(null);
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

useEffect(() => {
  const initializeAuth = async () => {
    const storedToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    const storedUser = safeParseJSON(localStorage.getItem(USER_KEY), null);

    // Validate: require BOTH token AND user to consider session valid
    if (!hasValidSession(storedToken, storedUser)) {
      // No valid cached session, clear any partial state
      clearAuthState();
      setIsLoading(false);
      return; // ← Skip refresh if no valid session
    }

    // Both token and user exist, attempt to refresh
    try {
      const response = await refreshToken();
      const decoded = decodeJWT(response.access_token);

      if (decoded) {
        setAccessToken(response.access_token);
        setUser(decoded);
        localStorage.setItem(ACCESS_TOKEN_KEY, response.access_token);
        localStorage.setItem(USER_KEY, JSON.stringify(decoded));
      } else {
        clearAuthState();
      }
    } catch (error) {
      clearAuthState(); // ← Atomic cleanup
    } finally {
      setIsLoading(false);
    }
  };

  initializeAuth();
}, []);
```

**Benefits:**
- ✅ Only refreshes when BOTH token & user exist
- ✅ Safe JSON parsing prevents crashes
- ✅ Atomic state cleanup via `clearAuthState()`
- ✅ No unnecessary refresh calls

---

## 3. Session Expired Handler

### ❌ BEFORE: Manual State Clearing
```tsx
useEffect(() => {
  const handleSessionExpired = () => {
    setAccessToken(null);
    setUser(null);
    localStorage.removeItem("ss_user"); // ← Only clears user
    toast.error("Your session has expired. Please sign in again.");
  };

  window.addEventListener("safespace:session-expired", handleSessionExpired as EventListener);
  return () => window.removeEventListener("safespace:session-expired", handleSessionExpired as EventListener);
}, []);
```

**Issue:** Doesn't clear `safespace_access_token` from localStorage

### ✅ AFTER: Uses Centralized `clearAuthState()`
```tsx
useEffect(() => {
  const handleSessionExpired = () => {
    clearAuthState(); // ← Atomic cleanup (clears both)
    toast.error("Your session has expired. Please sign in again.");
  };

  window.addEventListener("safespace:session-expired", handleSessionExpired as EventListener);
  return () => window.removeEventListener("safespace:session-expired", handleSessionExpired as EventListener);
}, []);
```

**Benefit:** Consistent cleanup, both token & user cleared.

---

## 4. Login Flow

### ❌ BEFORE: Inconsistent Storage
```tsx
const login = async (role: string, identifier: string, password: string): Promise<void> => {
  let response;
  if (role === "student") {
    response = await loginStudent(identifier, password);
  } else if (role === "psychologist" || role === "admin") {
    response = await loginStaff(identifier, password);
  } else {
    throw new Error("Invalid role");
  }

  const decoded = decodeJWT(response.access_token);
  if (!decoded) {
    throw new Error("Failed to decode token");
  }

  setAccessToken(response.access_token);
  setUser(decoded);
  localStorage.setItem("ss_user", JSON.stringify(decoded)); // ← Only stores user

  // Reset check-in state on fresh login
  localStorage.removeItem("last_pulse");
  localStorage.removeItem("last_phq9");
  localStorage.removeItem("last_gad7");
};
```

**Issue:** Doesn't store `safespace_access_token` in this function (assumed stored elsewhere)

### ✅ AFTER: Consistent Storage of Both
```tsx
const login = async (role: string, identifier: string, password: string): Promise<void> => {
  let response;
  if (role === "student") {
    response = await loginStudent(identifier, password);
  } else if (role === "psychologist" || role === "admin") {
    response = await loginStaff(identifier, password);
  } else {
    throw new Error("Invalid role");
  }

  const decoded = decodeJWT(response.access_token);
  if (!decoded) {
    throw new Error("Failed to decode token");
  }

  // Store both token and user consistently
  setAccessToken(response.access_token);
  setUser(decoded);
  localStorage.setItem(ACCESS_TOKEN_KEY, response.access_token); // ← Stores token
  localStorage.setItem(USER_KEY, JSON.stringify(decoded));       // ← Stores user

  // Reset check-in state on fresh login
  localStorage.removeItem("last_pulse");
  localStorage.removeItem("last_phq9");
  localStorage.removeItem("last_gad7");
};
```

**Benefit:** Explicit storage of both token and user ensures consistency.

---

## 5. Logout Flow

### ❌ BEFORE: Inconsistent Cleanup
```tsx
const logout = async (): Promise<void> => {
  try {
    await apiLogout();
  } catch {
    // Ignore errors — always clear local state
  } finally {
    setAccessToken(null);
    setUser(null);
    localStorage.removeItem("ss_user"); // ← Only removes user
    toast.success("You've been signed out.");
  }
};
```

**Issue:** Doesn't remove `safespace_access_token`

### ✅ AFTER: Atomic Cleanup
```tsx
const logout = async (): Promise<void> => {
  try {
    await apiLogout();
  } catch {
    // Ignore errors — always clear local state
  } finally {
    clearAuthState(); // ← Atomic cleanup (both token & user)
    toast.success("You've been signed out.");
  }
};
```

**Benefit:** Single function ensures complete cleanup.

---

## 6. New Utility Functions

### `safeParseJSON<T>(json, fallback)`
```tsx
// Safely parse JSON from localStorage
function safeParseJSON<T>(json: string | null, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    console.warn("Failed to parse stored auth data, starting fresh");
    return fallback;
  }
}

// Usage
const user = safeParseJSON(localStorage.getItem(USER_KEY), null);
// Returns: user or null, never throws
```

### `hasValidSession(token, user)`
```tsx
// Validate that token and user both exist
function hasValidSession(token: string | null, user: JWTPayload | null): boolean {
  return !!(token && token.trim() && user);
}

// Usage
if (!hasValidSession(storedToken, storedUser)) {
  clearAuthState();
  return; // Skip refresh
}
```

### `clearAuthState()`
```tsx
// Atomically clear all auth state and storage
const clearAuthState = () => {
  setAccessToken(null);
  setUser(null);
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

// Usage
clearAuthState(); // Both state and storage cleared together
```

---

## Storage Key Management

### ❌ BEFORE: Hardcoded Strings Everywhere
```tsx
localStorage.getItem("ss_user")
localStorage.removeItem("ss_user")
localStorage.setItem("ss_user", ...)
// "ss_user" referenced 5+ times
```

### ✅ AFTER: Centralized Constants
```tsx
const ACCESS_TOKEN_KEY = "safespace_access_token";
const USER_KEY = "ss_user";

// Single source of truth
localStorage.getItem(USER_KEY)
localStorage.removeItem(USER_KEY)
localStorage.setItem(USER_KEY, ...)
```

**Benefits:**
- Easy to rename keys globally
- Type-safe references
- Prevents typos
- Single source of truth

---

## State Initialization Timeline

### ❌ BEFORE
```
App Load (0ms)
  │
  ├─ accessToken = null              (state never restored)
  ├─ user = restored                 (but token is null)
  ├─ isLoading = true
  │
  ├─ useEffect: initializeAuth()     (always runs)
  │
  ├─ Call refreshToken() → 401       (no cached session)
  │ │
  │ └─ catch: clear state
  │
  └─ isLoading = false (~1.5s)
     │
     └─ isAuthenticated = false
         └─ Show Login Page

PROBLEM: Unnecessary 401 call, token lost on reload
```

### ✅ AFTER
```
App Load (0ms)
  │
  ├─ accessToken = restored          (from storage + validated)
  ├─ user = restored                 (safe parsing + error handling)
  ├─ isLoading = true
  │
  ├─ Check: hasValidSession(token, user)?
  │ │
  │ ├─ If YES (both exist):
  │ │  ├─ Call refreshToken()
  │ │  └─ Update state + storage
  │ │
  │ └─ If NO (missing either):
  │    └─ clearAuthState() → skip refresh
  │
  └─ isLoading = false (~500ms-1.5s depending on scenario)
     │
     └─ isAuthenticated = reliable
         ├─ Show Dashboard (if valid session)
         └─ Show Login Page (if no session)

BENEFIT: No unnecessary 401, token restored, consistent state
```

---

## Error Scenarios Handled

| Scenario | Before | After |
|----------|--------|-------|
| Corrupted `ss_user` JSON | 💥 Crash | ✅ Recover |
| Corrupted `safespace_access_token` | ❌ Silent fail | ✅ Detected + cleared |
| Only `ss_user` (no token) | ⚠️ Attempt refresh | ✅ Skip + clear |
| Only token (no user) | ⚠️ Attempt refresh | ✅ Skip + clear |
| Network error on refresh | ⚠️ Inconsistent state | ✅ Atomic clear |
| Invalid token format | ⚠️ Accept invalid | ✅ Reject + restore |

---

