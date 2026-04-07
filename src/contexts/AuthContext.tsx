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
  student: { id: "s1", name: "Alex Rivera", email: "alex@uni.edu", role: "student", subtitle: "Student ID: 48291" },
  counselor: { id: "c1", name: "Dr. Sarah Jenkins", email: "sjenkins@uni.edu", role: "counselor", subtitle: "Lead Counselor" },
  admin: { id: "adm1", name: "Crisis Awareness", email: "admin@uni.edu", role: "admin", subtitle: "System Admin" },
  family: { id: "f1", name: "Eleanor Henderson", email: "eleanor@email.com", role: "family", subtitle: "Parent" },
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
