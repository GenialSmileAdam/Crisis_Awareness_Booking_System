import { apiRequest } from "./client";

// ── User Profile ──
// Shape returned by GET /auth/me — mirrors the old JWTPayload fields
// so that all consumer components require zero changes.

export interface JWTPayload {
  sub: string;
  name: string | null;
  user_type: "student" | "staff";
  role: "student" | "psychologist" | "admin" | "staff";
  is_admin: boolean;
  staff_type: string | null;
  staff_id: string | null;
  student_id: string | null;
}

// ── Campus One SSO URLs ──
const SSO_BASE = "https://portal.builtbysalih.com";
const APP_BASE = "https://safespace.builtbysalih.com";

export const SSO_SIGN_IN_URL = `${SSO_BASE}/sign-in?callbackURL=${encodeURIComponent(`${APP_BASE}/dashboard`)}`;
export const SSO_SIGN_OUT_URL = `${SSO_BASE}/sign-out?callbackURL=${encodeURIComponent(APP_BASE)}`;

// ── Auth functions ──

/**
 * Fetch the currently authenticated user from the backend.
 * Uses the session cookie (set by Campus One SSO).
 * Returns null if the user is not authenticated (401).
 *
 * NOTE: Requires backend to implement GET /auth/me
 * returning the user profile from the session cookie.
 */
export async function getCurrentUser(): Promise<JWTPayload | null> {
  try {
    return await apiRequest<JWTPayload>("GET", "/auth/me");
  } catch {
    return null;
  }
}
