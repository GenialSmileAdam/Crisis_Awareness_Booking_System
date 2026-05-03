import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { refreshToken } from "@/api/auth";

// Must match the TOKEN_KEY in auth.ts and client.ts
const TOKEN_KEY = "safespace_access_token";

// Helper: Decode JWT payload from token
function decodeJWT(token: string) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const decoded = JSON.parse(atob(parts[1]));
    return decoded;
  } catch {
    return null;
  }
}

export function useTokenRefresh() {
  const { accessToken } = useAuth();

  useEffect(() => {
    if (!accessToken) return;

    // Set up interval to refresh every 4 minutes
    const interval = setInterval(async () => {
      if (!accessToken) return;

      try {
        const response = await refreshToken();
        const decoded = decodeJWT(response.access_token);
        
        if (decoded) {
          // Store token in localStorage for API client to use
          localStorage.setItem(TOKEN_KEY, response.access_token);
          // Update user display data
          localStorage.setItem("ss_user", JSON.stringify(decoded));
        } else {
          window.dispatchEvent(new CustomEvent("safespace:session-expired"));
        }
      } catch {
        // Refresh failed — trigger session expiry
        window.dispatchEvent(new CustomEvent("safespace:session-expired"));
      }
    }, 4 * 60 * 1000); // 4 minutes

    return () => clearInterval(interval);
  }, [accessToken]);
}
