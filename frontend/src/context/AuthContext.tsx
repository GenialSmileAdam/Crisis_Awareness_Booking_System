import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { logout as apiLogout } from "@/api/auth";

export type Role = "student" | "psychologist" | "admin";

export interface AuthUser {
  role: Role;
  name: string;
  email: string;
  initials: string;
  /** Raw JWT payload stored on login */
  jwt?: Record<string, unknown>;
}

export interface AuthContextState {
  user: AuthUser | null;
  tokenExpiry: number | null;
  setTokenExpiry: (expiry: number | null) => void;
  login: (role: Role, identifier: string, password: string) => boolean;
  /** Set user directly from decoded JWT (used by the Login page after real API auth) */
  setAuthUser: (user: AuthUser) => void;
  logout: () => void;
}

const TOKEN_KEY = "safespace_access_token";
const USER_KEY = "safespace_user";

// Legacy mock credentials — kept so demo mode continues to work
const MOCK_CREDS: Record<Role, { identifier: string; password: string; user: AuthUser }> = {
  student: {
    identifier: "27001011",
    password: "StudentPass123!",
    user: { role: "student", name: "Chidi Okafor", email: "student@example.com", initials: "CO" },
  },
  psychologist: {
    identifier: "dr.amara@nileuni.edu",
    password: "counsel123",
    user: { role: "psychologist", name: "Dr. Amara Obi", email: "dr.amara@nileuni.edu", initials: "AO" },
  },
  admin: {
    identifier: "thisismymail014@gmail.com",
    password: "PsyUnitAdmin1",
    user: { role: "admin", name: "Admin User", email: "thisismymail014@gmail.com", initials: "AU" },
  },
};

const AuthContext = createContext<AuthContextState>({
  user: null,
  tokenExpiry: null,
  setTokenExpiry: () => {},
  login: () => false,
  setAuthUser: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    // Hydrate from the new key first, fall back to legacy key
    const raw = localStorage.getItem(USER_KEY) || localStorage.getItem("ss_user");
    return raw ? JSON.parse(raw) : null;
  });

  const [tokenExpiry, setTokenExpiry] = useState<number | null>(() => {
    const raw = localStorage.getItem("ss_token_expiry");
    return raw ? parseInt(raw, 10) : null;
  });

  /** Legacy mock-credential login — still used for demo mode */
  const login = (role: Role, identifier: string, password: string) => {
    const c = MOCK_CREDS[role];
    if (c.identifier.toLowerCase() === identifier.trim().toLowerCase() && c.password === password) {
      const expiry = Date.now() + 14 * 60 * 1000; // 14 mins from now
      setUser(c.user);
      setTokenExpiry(expiry);
      localStorage.setItem(USER_KEY, JSON.stringify(c.user));
      localStorage.setItem("ss_user", JSON.stringify(c.user)); // keep legacy
      localStorage.setItem("ss_token_expiry", expiry.toString());
      return true;
    }
    return false;
  };

  /** Set the authenticated user directly (called after real API login) */
  const setAuthUser = useCallback((u: AuthUser) => {
    setUser(u);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
  }, []);

  const logout = useCallback(async () => {
    // Attempt server-side logout (ignore errors — we clear local state regardless)
    try {
      await apiLogout();
    } catch {
      // best-effort
    }
    setUser(null);
    setTokenExpiry(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem("ss_user");
    localStorage.removeItem("ss_token_expiry");
  }, []);

  return (
    <AuthContext.Provider value={{ user, tokenExpiry, setTokenExpiry, login, setAuthUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
