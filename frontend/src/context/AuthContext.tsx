import { createContext, useContext, useState, ReactNode } from "react";

export type Role = "student" | "counselor" | "admin";
export interface AuthUser {
  role: Role;
  name: string;
  email: string;
  initials: string;
}

const MOCK_CREDS: Record<Role, { email: string; password: string; user: AuthUser }> = {
  student: {
    email: "student@nileuni.edu",
    password: "ChangeMe123!",
    user: { role: "student", name: "Chidi Okafor", email: "student@nileuni.edu", initials: "CO" },
  },
  counselor: {
    email: "dr.amara@nileuni.edu",
    password: "counsel123",
    user: { role: "counselor", name: "Dr. Amara Obi", email: "dr.amara@nileuni.edu", initials: "AO" },
  },
  admin: {
    email: "admin@nileuni.edu",
    password: "admin123",
    user: { role: "admin", name: "Admin User", email: "admin@nileuni.edu", initials: "AU" },
  },
};

interface AuthCtx {
  user: AuthUser | null;
  login: (role: Role, email: string, password: string) => boolean;
  logout: () => void;
}
const AuthContext = createContext<AuthCtx>({ user: null, login: () => false, logout: () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const raw = localStorage.getItem("ss_user");
    return raw ? JSON.parse(raw) : null;
  });
  const login = (role: Role, email: string, password: string) => {
    const c = MOCK_CREDS[role];
    if (c.email === email.trim() && c.password === password) {
      setUser(c.user);
      localStorage.setItem("ss_user", JSON.stringify(c.user));
      return true;
    }
    return false;
  };
  const logout = () => {
    setUser(null);
    localStorage.removeItem("ss_user");
  };
  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
