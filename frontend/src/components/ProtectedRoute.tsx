import { Navigate, useNavigate } from "react-router-dom";
import { ReactNode, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTokenRefresh } from "@/hooks/useTokenRefresh";

type CampusOneRole = "unit_head" | "psychologist" | "student";

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

  // Authorization based on Campus One roles array from JWT
  const allowedRoles = Array.isArray(role) ? role : [role];
  const userRoles = user.roles || [];

  // Check if user has any of the allowed Campus One roles
  const hasAccess = allowedRoles.some(allowedRole =>
    userRoles.includes(allowedRole)
  );

  if (!hasAccess) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
