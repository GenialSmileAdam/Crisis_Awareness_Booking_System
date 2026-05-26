import { Navigate, useNavigate } from "react-router-dom";
import { ReactNode, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTokenRefresh } from "@/hooks/useTokenRefresh";

type Role = "student" | "psychologist" | "admin" | "staff";

export function ProtectedRoute({ role, children }: { role: Role | Role[]; children: ReactNode }) {
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

  const allowed = Array.isArray(role) ? role : [role];
  if (!user || !allowed.includes(user.role as Role)) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
