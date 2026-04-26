import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { toast } from "sonner";
import { loginStudent, loginStaff, logout as apiLogout, refreshToken, JWTPayload } from "@/api/auth";

export interface AuthContextState {
  user: JWTPayload | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (role: string, identifier: string, password: string) => Promise<void>;
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

// Helper: Decode JWT payload from token
function decodeJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const decoded = JSON.parse(atob(parts[1]));
    return decoded as JWTPayload;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<JWTPayload | null>(() => {
    const raw = localStorage.getItem("ss_user");
    return raw ? JSON.parse(raw) : null;
  });
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On app mount: attempt to refresh token from HTTP-only cookie
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const response = await refreshToken();
        const decoded = decodeJWT(response.access_token);
        if (decoded) {
          setAccessToken(response.access_token);
          setUser(decoded);
          localStorage.setItem("ss_user", JSON.stringify(decoded));
        } else {
          setAccessToken(null);
          setUser(null);
          localStorage.removeItem("ss_user");
        }
      } catch {
        setAccessToken(null);
        setUser(null);
        localStorage.removeItem("ss_user");
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Listen for session expired event
  useEffect(() => {
    const handleSessionExpired = () => {
      setAccessToken(null);
      setUser(null);
      localStorage.removeItem("ss_user");
      toast.error("Your session has expired. Please sign in again.");
    };

    window.addEventListener("safespace:session-expired", handleSessionExpired as EventListener);
    return () => window.removeEventListener("safespace:session-expired", handleSessionExpired as EventListener);
  }, []);

  const login = async (role: string, identifier: string, password: string): Promise<void> => {
    let response;
    if (role === "student") {
      response = await loginStudent(identifier, password);
    } else if (role === "psychologist" || role === "admin") {
      response = await loginStaff(identifier, password);
    } else {
      throw new Error("Invalid role");
    }

    const decoded = decodeJWT(response.access_token);
    if (!decoded) {
      throw new Error("Failed to decode token");
    }

    setAccessToken(response.access_token);
    setUser(decoded);
    localStorage.setItem("ss_user", JSON.stringify(decoded));

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
      setAccessToken(null);
      setUser(null);
      localStorage.removeItem("ss_user");
      toast.success("You've been signed out.");
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
