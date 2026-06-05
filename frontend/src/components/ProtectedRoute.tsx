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

  const allowedRoles = Array.isArray(role) ? role : [role];
  if (!user) return <Navigate to="/login" replace />;

  // Simple authorization: check if user's role is in allowed roles
  let hasAccess = allowedRoles.includes(user.role as Role);

  // For staff users, also check staff_type for psychologist routes
  if (!hasAccess && user.user_type === "staff") {
    // Psychologists can access psychologist routes
    if ((user as any).staff_type === "psychologist" && allowedRoles.includes("psychologist")) {
      hasAccess = true;
    }
    // Staff can access staff routes
    else if (allowedRoles.includes("staff")) {
      hasAccess = true;
    }
  }

  if (!hasAccess) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
