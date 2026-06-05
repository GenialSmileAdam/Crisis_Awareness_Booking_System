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

  // Check if user has one of the allowed roles
  let hasAccess = allowedRoles.includes(user.role as Role);

  // Check for unit_head role (admin via Campus One roles claim)
  const isUnitHead = (user?.roles instanceof Array) && user.roles.includes("unit_head");

  // For admin routes, check both is_admin flag and unit_head role
  if (!hasAccess && (isUnitHead || user.is_admin) && allowedRoles.includes("admin")) {
    hasAccess = true;
  }

  // For staff users, check staff_type and admin status
  if (!hasAccess && user.user_type === "staff") {
    // Admin/unit_head can access admin and psychologist routes
    if ((isUnitHead || user.is_admin) && (allowedRoles.includes("admin") || allowedRoles.includes("psychologist"))) {
      hasAccess = true;
    }
    // Psychologists (therapists) can access psychologist routes
    else if ((user as any).staff_type === "psychologist" && allowedRoles.includes("psychologist")) {
      hasAccess = true;
    }
    // Staff users can access "staff" role routes
    else if (allowedRoles.includes("staff")) {
      hasAccess = true;
    }
  }

  if (!hasAccess) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
