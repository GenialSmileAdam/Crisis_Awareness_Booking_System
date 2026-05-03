import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { getCurrentUser, JWTPayload, SSO_SIGN_IN_URL, SSO_SIGN_OUT_URL } from "@/api/auth";

export type { JWTPayload };

export interface AuthContextState {
  user: JWTPayload | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextState>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<JWTPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // On mount: fetch the current user from backend session cookie.
    // If 401 (not authenticated), getCurrentUser() returns null —
    // the route guards will handle the SSO redirect.
    getCurrentUser()
      .then(setUser)
      .finally(() => setIsLoading(false));
  }, []);

  /**
   * Logout: redirect to Campus One sign-out page.
   * Campus One clears the session cookie and redirects back to SafeSpace home.
   */
  const logout = () => {
    window.location.href = SSO_SIGN_OUT_URL;
  };

  // Show a neutral loading state while session is being resolved
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
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: user !== null,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
