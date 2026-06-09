import { Navigate, useNavigate } from "react-router-dom";
import { ReactNode, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTokenRefresh } from "@/hooks/useTokenRefresh";

type CampusOneRole = "unit_head" | "unit_admin" | "psychologist" | "student";

export function ProtectedRoute({
  role,
  children
}: {
  role: CampusOneRole | CampusOneRole[];
  children: ReactNode
}) {
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

  if (!user) return <Navigate to="/login" replace />;

  const allowedRoles = Array.isArray(role) ? role : [role];
  const userRoles = user.roles || [];

  // unit_admin is treated as equivalent to unit_head for all access checks
  const effectiveRoles = userRoles.includes("unit_admin") && !userRoles.includes("unit_head")
    ? [...userRoles, "unit_head"]
    : userRoles;

  const hasAccess = allowedRoles.some(allowedRole => effectiveRoles.includes(allowedRole));

  if (!hasAccess) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
