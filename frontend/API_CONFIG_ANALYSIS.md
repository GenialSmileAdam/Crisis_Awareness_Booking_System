# API Configuration Analysis

## 1. `src/api/config.ts` — BASE_URL Construction

```typescript
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export default BASE_URL;
```

**BASE_URL is constructed as:** `import.meta.env.VITE_API_BASE_URL` with a fallback to `"http://localhost:8000"` if the env var is not set.

---

## 2. `src/api/client.ts` — Fetch URL Building

The fetch request URL is built at line 51:

```typescript
const res = await fetch(`${BASE_URL}${path}`, {
  method,
  headers,
  body: serialisedBody,
  credentials: "include",
});
```

**URL construction:** `${BASE_URL}${path}` (template literal concatenation)

**Double slash check:** No double slash issue. The BASE_URL value (`https://crisis-awareness-booking-system.onrender.com`) has no trailing slash, and the paths (like `/auth/login`) start with a slash, so concatenation produces: `https://crisis-awareness-booking-system.onrender.com/auth/login`

Also used in `attemptTokenRefresh()` at line 109:
```typescript
const res = await fetch(`${BASE_URL}/auth/refresh`, {
```

---

## 3. `src/api/auth.ts` — Login URLs

### loginStaff:
```typescript
export async function loginStaff(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const body = encodeForm({ username: email, password });
  const res = await apiRequest<AuthResponse>("POST", "/auth/login", body, true);
  localStorage.setItem(TOKEN_KEY, res.access_token);
  return res;
}
```

### loginStudent:
```typescript
export async function loginStudent(
  studentId: string,
  password: string,
): Promise<AuthResponse> {
  const body = encodeForm({ username: studentId, password });
  const res = await apiRequest<AuthResponse>("POST", "/auth/login", body, true);
  localStorage.setItem(TOKEN_KEY, res.access_token);
  return res;
}
```

**Both call:** `apiRequest<AuthResponse>("POST", "/auth/login", body, true)`

**Full constructed URL:** `https://crisis-awareness-booking-system.onrender.com/auth/login`

---

## 4. `.env` — Current Value

```
VITE_API_BASE_URL=https://crisis-awareness-booking-system.onrender.com
```

---

## 5. `.env.example` — Example Value

```
VITE_API_BASE_URL=http://localhost:8000
```

---

## 6. Network Request Logic — Login Button Click

When the login button is clicked:

1. `loginStudent()` or `loginStaff()` is called with credentials
2. These call: `apiRequest("POST", "/auth/login", body, true)`
3. In `client.ts`, the `apiRequest()` function constructs the URL via: `fetch(`${BASE_URL}${path}`)`
4. **Final URL sent to browser network:** `https://crisis-awareness-booking-system.onrender.com/auth/login`
5. **Method:** POST
6. **Body:** form-urlencoded (username + password)
7. **Headers:** `Content-Type: application/x-www-form-urlencoded`, `Authorization: Bearer <token>` (if logged in already)
