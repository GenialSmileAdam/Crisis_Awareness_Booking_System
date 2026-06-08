import { apiRequest } from "./client";

// ── Interfaces ──

export interface JWTPayload {
  id?: string;
  sub?: string;
  email?: string;
  name: string | null;
  user_type: "student" | "staff";
  role: "student" | "psychologist" | "admin" | "staff";
  is_admin: boolean;
  roles?: string[];  // Campus One roles array: "unit_head", "psychologist", "student"
  staff_type: string | null;
  staff_id: string | null;
  student_id: string | null;
}

// ── Helpers ──

const TOKEN_KEY = "safespace_access_token";

// ── Auth functions (Campus One OIDC only) ──

/**
 * Refresh the access token using the HTTP-only refresh cookie.
 *
 * IMPORTANT: This should only be called when a user session likely exists
 * (i.e., when localStorage has cached user data). Calling this without a valid
 * refresh cookie will cause a 401, which is treated as session expiry.
 *
 * @throws ApiError if refresh fails (e.g., cookie invalid, expired, or missing)
 */
export async function refreshToken(): Promise<{ access_token: string }> {
  return apiRequest<{ access_token: string }>("POST", "/api/auth/refresh");
}

/**
 * Log out — invalidate the session server-side and clear local token.
 */
export async function logout(): Promise<void> {
  try {
    await apiRequest<void>("POST", "/api/auth/logout");
  } finally {
    localStorage.removeItem(TOKEN_KEY);
  }
}
