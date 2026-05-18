import { Navigate, useLocation } from "react-router-dom";
import { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";

interface StudentRouteProps {
  children: ReactNode;
}

/** Paths that bypass the daily check-in gate. */
const GATE_EXEMPT_PATHS = ["/student/consent", "/student/checkin"];

export function StudentRoute({ children }: StudentRouteProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return null;

  if (!user || user.role !== "student") {
    return <Navigate to="/login" replace />;
  }

  // Allow consent and check-in pages through without gating
  const isExempt = GATE_EXEMPT_PATHS.includes(location.pathname);
  if (!isExempt) {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const gatePassed = localStorage.getItem("checkin_gate_passed");
    if (gatePassed !== today) {
      return <Navigate to="/student/checkin" replace />;
    }
  }

  return <>{children}</>;
}