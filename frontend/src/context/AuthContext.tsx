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
  // Initialize state from localStorage with safe parsing
  const [user, setUser] = useState<JWTPayload | null>(() => {
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

  // On app mount: restore session and attempt refresh if both token and user exist
  useEffect(() => {
    const initializeAuth = async () => {
      // ── Restore from localStorage (already done in initial state) ──
      // ── But verify both exist for a valid session ──
      const storedToken = localStorage.getItem(ACCESS_TOKEN_KEY);
      const storedUser = safeParseJSON(localStorage.getItem(USER_KEY), null);

      // ── Validate: require BOTH token AND user to consider session valid ──
      if (!hasValidSession(storedToken, storedUser)) {
        // No valid cached session, clear any partial state
        setAccessToken(null);
        setUser(null);
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setIsLoading(false);
        return;
      }

      // ── If we have a token and user from localStorage, update state immediately ──
      if (storedToken && storedUser) {
        setAccessToken(storedToken);
        setUser(storedUser);
      }

      // ── If JWT is still valid for 2+ minutes, skip the refresh round-trip ──
      if (storedToken && !isTokenExpiredOrExpiring(storedToken)) {
        setIsLoading(false);
        return;
      }

      // ── Token expired or expiring soon — refresh via cookie ──
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
      roles: userInfo.roles || [],  // Store Campus One roles array
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
      toast.success("You've been signed out.");
      // Redirect to Campus One logout endpoint
      const CAMPUS_ONE_LOGOUT_URL = "https://auth.campusone.com.ng/api/auth/logout";
      window.location.href = CAMPUS_ONE_LOGOUT_URL;
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
