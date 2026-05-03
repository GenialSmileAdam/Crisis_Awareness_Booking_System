import BASE_URL from "./config";
import type { ApiError } from "./types";

export type { ApiError };

/**
 * Core fetch wrapper for all API calls.
 *
 * - Uses session cookie for auth (credentials: "include")
 * - Handles form-urlencoded vs JSON bodies
 * - Unwraps the backend { success, message, data } envelope
 * - On 401: redirects to Campus One SSO (session has expired or never existed)
 */

const SSO_SIGN_IN_URL = `https://portal.builtbysalih.com/sign-in?callbackURL=${encodeURIComponent("https://safespace.builtbysalih.com/dashboard")}`;

export async function apiRequest<T>(
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
  path: string,
  body?: unknown,
  isFormData?: boolean,
): Promise<T> {
  const headers: Record<string, string> = {};

  // Determine content type and serialised body
  let serialisedBody: BodyInit | undefined;

  if (body instanceof FormData) {
    // Multipart — let the browser set Content-Type with boundary
    serialisedBody = body;
  } else if (isFormData && body) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    serialisedBody = body as string;
  } else if (body) {
    headers["Content-Type"] = "application/json";
    serialisedBody = JSON.stringify(body);
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: serialisedBody,
    credentials: "include", // session cookie sent on every request
  });

  // ── 401 → session expired or not authenticated → redirect to SSO ──
  if (res.status === 401 && path !== "/auth/me") {
    window.location.href = SSO_SIGN_IN_URL;
    // Return a never-resolving promise — the redirect is already in flight
    return new Promise(() => {});
  }

  // ── Non-2xx errors ──
  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    try {
      const err = await res.json();
      message = err.message || err.detail || message;
    } catch {
      // body wasn't JSON — keep default message
    }
    throw { message, status: res.status } as ApiError;
  }

  // ── 204 No Content ──
  if (res.status === 204) {
    return undefined as T;
  }

  // ── Unwrap { success, message, data } envelope ──
  const json = await res.json();

  // If the backend wraps in an envelope, return the inner data
  if (json !== null && typeof json === "object" && "success" in json && "data" in json) {
    return json.data as T;
  }

  // Otherwise return the raw response
  return json as T;
}
