import { Navigate } from "react-router-dom";
import { ReactNode } from "react";
import { useAuth, Role } from "@/context/AuthContext";

export function ProtectedRoute({ role, children }: { role: Role; children: ReactNode }) {
  const { user } = useAuth();
  if (!user || user.role !== role) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
