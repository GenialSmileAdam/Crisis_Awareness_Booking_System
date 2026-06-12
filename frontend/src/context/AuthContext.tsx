import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { toast } from "sonner";
import { logout as apiLogout, refreshToken, JWTPayload } from "@/api/auth";

export interface AuthContextState {
  user: JWTPayload | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (userInfo: any) => Promise<void>;  // Called from OIDC callback with decoded JWT
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextState>({
  user: null,
  accessToken: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
  isAuthenticated: false,
});

// ── Storage keys ──
const ACCESS_TOKEN_KEY = "safespace_access_token";
const USER_KEY = "ss_user";

// Helper: Safely parse JSON from localStorage
function safeParseJSON<T>(json: string | null, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    // Corrupted JSON in localStorage — silently ignore and use fallback
    console.warn("Failed to parse stored auth data, starting fresh");
    return fallback;
  }
}

// Helper: Decode JWT payload from token
function decodeJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    // JWT uses base64url (- and _ instead of + and /), without padding.
    // atob() requires standard base64 with padding.
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "==".slice(0, (4 - (base64.length % 4)) % 4);
    const decoded = JSON.parse(atob(padded));
    // Ensure roles is always an array
    if (!Array.isArray(decoded.roles)) {
      decoded.roles = [];
    }
    return decoded as JWTPayload;
  } catch {
    return null;
  }
}

// Helper: Returns true if the JWT is expired or within `thresholdSec` of expiry
function isTokenExpiredOrExpiring(token: string, thresholdSec = 120): boolean {
  try {
    const decoded = decodeJWT(token);
    if (!decoded || typeof (decoded as any).exp !== "number") return true;
    const expiresIn = (decoded as any).exp - Math.floor(Date.now() / 1000);
    return expiresIn < thresholdSec;
  } catch {
    return true;
  }
}

// Helper: Validate that token and user both exist
function hasValidSession(token: string | null, user: JWTPayload | null): boolean {
  return !!(token && token.trim() && user);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Always decode from the stored JWT so all fields (student_id, staff_id, etc.)
  // are present, even if the stored USER_KEY object is stale/incomplete.
  const [user, setUser] = useState<JWTPayload | null>(() => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (token && token.split(".").length === 3) {
      const decoded = decodeJWT(token);
      if (decoded) return decoded;
    }
    const stored = localStorage.getItem(USER_KEY);
    return safeParseJSON(stored, null);
  });

  const [accessToken, setAccessToken] = useState<string | null>(() => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    // Validate token is not empty or corrupted (should have 3 JWT parts)
    if (token && token.trim() && token.split(".").length === 3) {
      return token;
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState(true);

  // Helper: Clear all auth-related state and storage
  const clearAuthState = () => {
    setAccessToken(null);
    setUser(null);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem("checkin_gate_passed");
  };

  // On app mount: restore session, and ALWAYS attempt a silent cookie-refresh so
  // a user who already holds a valid SafeSpace session (the HTTP-only refresh
  // cookie) is logged in immediately — even when localStorage is empty, e.g. they
  // arrived from the Campus One app or opened a fresh tab. Only when the cookie
  // refresh fails do we treat them as logged out (AutoLogin then bounces them to
  // Campus One). This is the "are you already authenticated?" check on entry.
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem(ACCESS_TOKEN_KEY);
      const storedUser = safeParseJSON<JWTPayload | null>(localStorage.getItem(USER_KEY), null);

      // ── Fast path: a cached session whose JWT is still fresh — no round-trip ──
      if (
        hasValidSession(storedToken, storedUser) &&
        storedToken &&
        !isTokenExpiredOrExpiring(storedToken)
      ) {
        setAccessToken(storedToken);
        setUser(storedUser);
        setIsLoading(false);
        return;
      }

      // ── Otherwise (empty localStorage OR an expired/expiring token) attempt a
      //    silent refresh via the HTTP-only cookie. A 401 here is expected for a
      //    genuinely logged-out visitor and does NOT fire the session-expired
      //    toast (the client suppresses it for /api/auth/refresh). ──
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
      } catch {
        // No valid refresh cookie → genuinely logged out.
        clearAuthState();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Listen for session expired event
  useEffect(() => {
    const handleSessionExpired = () => {
      clearAuthState();
      toast.error("Your session has expired. Please sign in again.");
    };

    window.addEventListener("safespace:session-expired", handleSessionExpired as EventListener);
    return () => window.removeEventListener("safespace:session-expired", handleSessionExpired as EventListener);
  }, []);

  const login = async (userInfo: any): Promise<void> => {
    // Called from OIDC callback with decoded JWT payload
    const user: JWTPayload = {
      sub: userInfo.sub,
      user_type: userInfo.user_type,
      role: userInfo.role,
      is_admin: userInfo.is_admin,
      name: userInfo.name,
      roles: userInfo.roles || [],
      student_id: userInfo.student_id ?? null,
      staff_id: userInfo.staff_id ?? null,
    };

    // Get token from localStorage (set by AuthCallback)
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) {
      throw new Error("No access token found");
    }

    setAccessToken(token);
    setUser(user);
    localStorage.setItem(USER_KEY, JSON.stringify(user));

    // Reset check-in state on fresh login
    localStorage.removeItem("last_pulse");
    localStorage.removeItem("last_phq9");
    localStorage.removeItem("last_gad7");
  };

  const logout = async (): Promise<void> => {
    try {
      await apiLogout();
    } catch {
      // Ignore errors — always clear local state
    } finally {
      clearAuthState();

      // Clear ALL localStorage to ensure completely fresh state
      localStorage.clear();

      // Clear React Query cache by reloading
      // This ensures no stale data is shown on next login with different account
      toast.success("You've been signed out.");

      // Redirect to login page - Campus One session will be handled on next auth attempt
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
    }
  };

  const isAuthenticated = accessToken !== null && user !== null;

  // Show loading state while initializing
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-16 w-16 rounded-full border-2 border-muted border-t-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, accessToken, isLoading, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
