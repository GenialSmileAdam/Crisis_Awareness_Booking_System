import { Navigate, useLocation } from "react-router-dom";
import { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";

export let sessionCheckInComplete = false;
export const setSessionCheckInComplete = (v: boolean) => { sessionCheckInComplete = v; };

export function StudentRoute({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { user } = useAuth();

  // Not logged in as student → redirect to login
  if (!user || user.role !== "student") {
    return <Navigate to="/login" replace />;
  }

  const consentSigned = localStorage.getItem("consent_signed") === "true";

  if (!consentSigned && pathname !== "/student/consent") {
    return <Navigate to="/student/consent" replace />;
  }

  // Check-in gate: must complete check-in before navigating away from /student
  if (consentSigned && !sessionCheckInComplete && pathname !== "/student" && pathname !== "/student/consent") {
    return <Navigate to="/student" replace />;
  }

  return <>{children}</>;
}
