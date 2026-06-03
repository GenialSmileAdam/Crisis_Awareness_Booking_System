# Authentication Flow: Current vs. Expected

---

## Current Authentication Architecture (BROKEN 🔴)

### Traditional Password Login (Works ✅)

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend                                 │
├─────────────────────────────────────────────────────────────────┤
│  Login.tsx                                                       │
│  ├─ Input: Student ID or Email                                  │
│  ├─ Input: Password                                             │
│  ├─ Button: "Sign In"                                           │
│  └─ On Click:                                                   │
│     ├─ POST /auth/login with credentials                        │
│     ├─ Backend returns: { access_token, token_type }           │
│     ├─ Frontend stores token in localStorage                    │
│     ├─ Decode JWT to get user info                             │
│     └─ Redirect to /student or /counselor or /admin            │
└─────────────────────────────────────────────────────────────────┘

Result: ✅ Works - User gets token and is logged in
```

### Campus One OIDC Login (Currently Broken 🔴)

```
┌──────────────────────────────────────┐
│ Frontend                             │
├──────────────────────────────────────┤
│ Login.tsx                            │
│ ❌ NO Campus One button              │
│ ❌ NO click handler                  │
└──────────────────────────────────────┘
        ↓
┌──────────────────────────────────────┐
│ Backend                              │
├──────────────────────────────────────┤
│ /auth/campus-one/authorize ✅        │
│ (exists but unreachable)            │
│        ↓                             │
│ Redirects to Campus One auth       │
│        ↓                             │
│ Campus One redirects back to:        │
│ /api/auth/callback ✅               │
│        ↓                             │
│ Tries to redirect to:                │
│ {FRONTEND}/auth/callback?token=...  │
└──────────────────────────────────────┘
        ↓
┌──────────────────────────────────────┐
│ Frontend                             │
├──────────────────────────────────────┤
│ ❌ /auth/callback route MISSING     │
│                                      │
│ Result: 404 or Redirect Loop ❌     │
└──────────────────────────────────────┘

Result: ❌ BROKEN - User can't complete sign-in
```

---

## Expected Authentication Architecture (After Fix ✅)

### Campus One OIDC Login (Correct Flow)

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Login Page                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────┬──────────────────────────────┐ │
│  │  Password Sign In       │  Campus One Sign In          │ │
│  │  ┌─────────────────┐   │  ┌───────────────────────┐   │ │
│  │  │ Student ID/Email│   │  │ Sign in with         │   │ │
│  │  └─────────────────┘   │  │ Campus One           │   │ │
│  │  ┌─────────────────┐   │  └───────────────────────┘   │ │
│  │  │ Password        │   │  On Click:                    │ │
│  │  └─────────────────┘   │  window.location.href =       │ │
│  │  ┌─────────────────┐   │    "/auth/campus-one/         │ │
│  │  │ Sign In ➜      │   │     authorize"                 │ │
│  │  └─────────────────┘   │                               │ │
│  └─────────────────────────┴──────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Redirect
                            ↓
┌─────────────────────────────────────────────────────────────┐
│               Backend: /auth/campus-one/authorize            │
├─────────────────────────────────────────────────────────────┤
│  ✅ Generate state (CSRF protection)                         │
│  ✅ Generate code_verifier (PKCE)                            │
│  ✅ Store in httponly, secure cookies                        │
│  ✅ Create authorization URL                                 │
│  ✅ Redirect to Campus One                                   │
│                                                              │
│  Authorization URL contains:                                │
│  - client_id                                                │
│  - scope: openid email profile academic notifications      │
│           offline_access ← CRITICAL (enables refresh token) │
│  - state (CSRF protection)                                  │
│  - code_challenge (PKCE)                                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Redirect
                            ↓
┌─────────────────────────────────────────────────────────────┐
│        Campus One OAuth2/OIDC Provider (auth.campusone.com) │
├─────────────────────────────────────────────────────────────┤
│  ✅ User sees Campus One login page                          │
│  ✅ User enters credentials                                  │
│  ✅ User grants permissions (scopes)                         │
│  ✅ Campus One generates authorization code                  │
│  ✅ Redirects back to callback URL with code               │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Redirect with code
                            ↓
┌─────────────────────────────────────────────────────────────┐
│            Backend: /api/auth/callback?code=...             │
├─────────────────────────────────────────────────────────────┤
│  ✅ Verify state matches stored value (CSRF)                 │
│  ✅ Get code_verifier from cookie                            │
│  ✅ Exchange code for tokens:                                │
│     POST to Campus One token endpoint with:                 │
│     - code                                                   │
│     - code_verifier (PKCE)                                  │
│     - client_id                                             │
│     - client_secret                                         │
│  ✅ Campus One returns:                                      │
│     - access_token (Campus One JWT)                         │
│     - id_token (OpenID Connect token with user info)        │
│     - refresh_token (for offline access)                    │
│  ✅ Verify id_token signature (EdDSA or RS256)              │
│  ✅ Extract user claims from id_token                        │
│  ✅ Get or create user in database                           │
│  ✅ Store Campus One tokens for later use                    │
│  ✅ Generate our own access_token (with identity claims)     │
│  ✅ Create refresh_token for this user                       │
│  ✅ Set refresh_token as httponly cookie                     │
│  ✅ Redirect to frontend callback with access_token         │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Redirect
                            ↓
┌─────────────────────────────────────────────────────────────┐
│        Frontend: /auth/callback?access_token=...            │
├─────────────────────────────────────────────────────────────┤
│ AuthCallback.tsx                                            │
│  ✅ Extract access_token from URL params                     │
│  ✅ Validate token format (JWT has 3 parts)                  │
│  ✅ Call loginFromCallback(token) on AuthContext             │
│  ✅ Decode JWT to get user info                              │
│  ✅ Store in localStorage:                                   │
│     - safespace_access_token                                │
│     - ss_user (decoded JWT)                                 │
│  ✅ AuthContext state updated                                │
│  ✅ Redirect to appropriate dashboard:                       │
│     - /student if student                                   │
│     - /counselor if psychologist                            │
│     - /admin if admin                                       │
│  ✅ Refresh token cookie set by backend                      │
│     (automatically sent on future requests)                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Redirect
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Frontend: /student (or /counselor)              │
├─────────────────────────────────────────────────────────────┤
│  ✅ User fully authenticated and logged in                   │
│  ✅ Access token available for API calls                     │
│  ✅ Refresh token cookie available for auto-refresh          │
│  ✅ User can access all resources                            │
│                                                              │
│  Backend can also:                                          │
│  ✅ Send notifications to Campus One dashboard (offline)     │
│  ✅ Refresh Campus One access token when needed              │
│  ✅ Access user's Campus One data                            │
└─────────────────────────────────────────────────────────────┘

Result: ✅ WORKS - User fully authenticated with Campus One
```

---

## Key Differences

| Aspect | Password Auth | Campus One OIDC |
|--------|---------------|-----------------|
| **Initiation** | Button click → POST | Button click → Redirect |
| **Where User Authenticates** | Your app | External provider |
| **Token Source** | Backend creates | Provider issues |
| **Flow Type** | Direct POST | Server-side redirect |
| **Frontend Involvement** | Form + POST | Redirect handling |
| **Backend Verification** | Check username/password | Verify signed JWT |
| **Scopes/Permissions** | N/A | User grants explicitly |
| **Refresh Token** | Always issued | Requires offline_access |
| **Security** | Password stored | Zero knowledge auth |

---

## Token Flow Detail

### Password Authentication Token Flow

```
Frontend               Backend                Database
├─ Form Input ────────→ /auth/login
│  (user, pass)        ├─ Query user by email
│                      ├─ Verify password hash
│                      ├─ Create JWT access_token
│                      ├─ Create refresh_token
│                      └─ Return { access_token }
├─ Store token ←──────────────────────────────┘
├─ Decode JWT
└─ Set auth state
```

### Campus One OIDC Token Flow

```
Frontend               Backend                Campus One
├─ Click button ───────────────────────→ GET /auth/campus-one/authorize
│                      ├─ Create state
│                      ├─ Create code_verifier
│                      ├─ Build auth URL
│                      └─ Redirect to Campus One
                                            ├─ User login page
                                            ├─ User grants permissions
                                            └─ Creates auth code
                       Redirect with code ←─────────────┤
                       ├─ Verify state
                       ├─ POST code_verifier + code
                       ├─ Receive tokens (access_token, id_token, refresh_token)
                       ├─ Verify id_token signature
                       ├─ Extract user claims
                       ├─ Create our access_token
                       ├─ Create our refresh_token
                       └─ Redirect to frontend
                                            Redirect with our access_token
                                            ↓
├─ /auth/callback ←──────────────────────────────────┘
├─ Extract token from URL
├─ Store in localStorage
├─ Decode JWT
├─ Set auth state
└─ Redirect to dashboard
```

---

## Security Comparison

### Password Authentication

| Aspect | Risk |
|--------|------|
| Password handling | Moderate - you store hashes |
| Network exposure | Password sent over HTTPS |
| Token theft | Medium - access token could be stolen |
| Account takeover | Full - if password compromised |

### Campus One OIDC

| Aspect | Risk |
|--------|------|
| Password handling | None - never see or store passwords |
| Network exposure | JWT tokens, not passwords |
| Token theft | Low - short-lived tokens, signature verified |
| Account takeover | Very low - requires compromising provider |
| Offline access | Requires explicit `offline_access` scope |

---

## Why Your System is Currently Broken

```
User tries Campus One login:
    ↓
Frontend has no button → No way to initiate
    ↓
If somehow reaches backend /auth/campus-one/authorize:
    ↓
Backend redirects to Campus One ✅
    ↓
User authenticates at Campus One ✅
    ↓
Campus One redirects back to /api/auth/callback ✅
    ↓
Backend processes callback ✅
    ↓
Backend tries to redirect to /auth/callback page
    ↓
Frontend route doesn't exist ❌
    ↓
User sees 404 or stays at Campus One website
    ↓
Authentication fails ❌
```

---

## Why This Isn't a "Button Issue"

You're right that OIDC doesn't use a traditional form button. Here's the distinction:

**Traditional Form Auth (Password):**
```
Button → Form submission → POST request → Synchronous response → Token in response body
```

**OIDC Auth (Campus One):**
```
Link/Button → window.location.href = redirect_url → Browser navigation → 
  Provider handles entire auth flow → Browser redirects back with code → 
  Backend exchanges code → Backend redirects again with token
```

Your form button on the password login is correct - it's a `<button type="submit">` that triggers the form.

For Campus One, you need a simple `<button>` that does:
```typescript
onClick={() => window.location.href = "/auth/campus-one/authorize"}
```

This is NOT a form submission - it's a simple redirect.

