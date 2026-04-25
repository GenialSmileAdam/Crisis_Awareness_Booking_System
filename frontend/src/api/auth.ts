import { apiRequest } from "./client";

// ── Interfaces ──

export interface JWTPayload {
  sub: string;
  user_type: "student" | "staff";
  role: "student" | "psychologist" | "admin" | "staff";
  is_admin: boolean;
  staff_type: string | null;
  staff_id: string | null;
  student_id: string | null;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

// ── Helpers ──

const TOKEN_KEY = "safespace_access_token";

function encodeForm(fields: Record<string, string>): string {
  return Object.entries(fields)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
}

// ── Auth functions ──

/**
 * Authenticate a student using their student ID and password.
 * Stores the access token in localStorage on success.
 */
export async function loginStudent(
  studentId: string,
  password: string,
): Promise<AuthResponse> {
  const body = encodeForm({ username: studentId, password });
  const res = await apiRequest<AuthResponse>("POST", "/auth/login", body, true);
  localStorage.setItem(TOKEN_KEY, res.access_token);
  return res;
}

/**
 * Authenticate a staff member using their email and password.
 * Stores the access token in localStorage on success.
 */
export async function loginStaff(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const body = encodeForm({ username: email, password });
  const res = await apiRequest<AuthResponse>("POST", "/auth/login", body, true);
  localStorage.setItem(TOKEN_KEY, res.access_token);
  return res;
}

/**
 * Refresh the access token using the HTTP-only refresh cookie.
 */
export async function refreshToken(): Promise<{ access_token: string }> {
  return apiRequest<{ access_token: string }>("POST", "/auth/refresh");
}

/**
 * Log out — invalidate the session server-side and clear local token.
 */
export async function logout(): Promise<void> {
  try {
    await apiRequest<void>("POST", "/auth/logout");
  } finally {
    localStorage.removeItem(TOKEN_KEY);
  }
}
