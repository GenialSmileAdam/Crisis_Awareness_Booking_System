import { createContext, useContext, useState, ReactNode } from "react";

export type Role = "student" | "psychologist" | "admin";
export interface AuthUser {
  role: Role;
  name: string;
  email: string;
  initials: string;
}

export interface AuthContextState {
  user: AuthUser | null;
  tokenExpiry: number | null;
  setTokenExpiry: (expiry: number | null) => void;
  login: (role: Role, identifier: string, password: string) => boolean;
  logout: () => void;
}

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
  logout: () => {} 
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const raw = localStorage.getItem("ss_user");
    return raw ? JSON.parse(raw) : null;
  });
  const [tokenExpiry, setTokenExpiry] = useState<number | null>(() => {
    const raw = localStorage.getItem("ss_token_expiry");
    return raw ? parseInt(raw, 10) : null;
  });
  const login = (role: Role, identifier: string, password: string) => {
    const c = MOCK_CREDS[role];
    if (c.identifier.toLowerCase() === identifier.trim().toLowerCase() && c.password === password) {
      const expiry = Date.now() + 14 * 60 * 1000; // 14 mins from now
      setUser(c.user);
      setTokenExpiry(expiry);
      localStorage.setItem("ss_user", JSON.stringify(c.user));
      localStorage.setItem("ss_token_expiry", expiry.toString());
      return true;
    }
    return false;
  };
  const logout = () => {
    setUser(null);
    setTokenExpiry(null);
    localStorage.removeItem("ss_user");
    localStorage.removeItem("ss_token_expiry");
  };
  return <AuthContext.Provider value={{ user, tokenExpiry, setTokenExpiry, login, logout }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
