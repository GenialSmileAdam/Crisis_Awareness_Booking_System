import BASE_URL from "./config";
import type { ApiError } from "./types";

export type { ApiError };

const TOKEN_KEY = "safespace_access_token";

/**
 * Core fetch wrapper for all API calls.
 *
 * - Attaches Bearer token from localStorage
 * - Handles form-urlencoded (login) vs JSON bodies
 * - Unwraps the backend { success, message, data } envelope
 * - On 401: attempts a single token refresh then retries
 * - Dispatches "safespace:session-expired" if refresh fails
 */
export async function apiRequest<T>(
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
  path: string,
  body?: unknown,
  isFormData?: boolean,
): Promise<T> {
  const execute = async (retry: boolean): Promise<T> => {
    const token = localStorage.getItem(TOKEN_KEY);

    const headers: Record<string, string> = {};

    if (token && token !== "null" && token !== "undefined" && token.trim() !== "") {
      headers["Authorization"] = `Bearer ${token}`;
    }

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
      credentials: "include", // send HTTP-only refresh cookie
    });

    // ── 401 → attempt token refresh once ──
    if (res.status === 401 && retry) {
      const refreshed = await attemptTokenRefresh();
      if (refreshed) {
        return execute(false);
      }
      // refresh failed — expire session
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new CustomEvent("safespace:session-expired"));
      throw { message: "Session expired", status: 401 } as ApiError;
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

    // Otherwise return the raw response (for endpoints like /auth/login)
    return json as T;
  };

  return execute(true);
}

/**
 * Attempt to refresh the access token using the HTTP-only refresh cookie.
 * Returns true if a new token was stored, false otherwise.
 */
async function attemptTokenRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });

    if (!res.ok) return false;

    const json = await res.json();
    const newToken: string | undefined =
      json?.data?.access_token ?? json?.access_token;

    if (newToken) {
      localStorage.setItem(TOKEN_KEY, newToken);
      return true;
    }

    return false;
  } catch {
    return false;
  }
}
