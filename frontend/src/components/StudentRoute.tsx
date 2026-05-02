import { Navigate } from "react-router-dom";
import { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";

interface StudentRouteProps {
  children: ReactNode;
}

export function StudentRoute({ children }: StudentRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;

  if (!user || user.role !== "student") {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}