import { Navigate, useNavigate } from "react-router-dom";
import { ReactNode, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTokenRefresh } from "@/hooks/useTokenRefresh";

type Role = "student" | "psychologist" | "admin" | "staff";

export function ProtectedRoute({ role, children }: { role: Role; children: ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  useTokenRefresh();

  useEffect(() => {
    const handleSessionExpired = () => {
      navigate("/login");
    };

    window.addEventListener("safespace:session-expired", handleSessionExpired as EventListener);
    return () => window.removeEventListener("safespace:session-expired", handleSessionExpired as EventListener);
  }, [navigate]);

  if (!user || user.role !== role) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
