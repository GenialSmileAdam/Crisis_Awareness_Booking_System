import React, { createContext, useContext, useState, ReactNode } from "react";
import { User, UserRole } from "@/types";

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, role: UserRole) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

const roleUsers: Record<UserRole, User> = {
  student: { id: "s1", name: "Alex Johnson", email: "alex@uni.edu", role: "student" },
  counselor: { id: "c1", name: "Dr. Emily Carter", email: "ecarter@uni.edu", role: "counselor" },
  admin: { id: "adm1", name: "Admin User", email: "admin@uni.edu", role: "admin" },
  family: { id: "f1", name: "Maria Johnson", email: "maria@email.com", role: "family" },
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = (_email: string, _password: string, role: UserRole) => {
    setUser(roleUsers[role]);
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
