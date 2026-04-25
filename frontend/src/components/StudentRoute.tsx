import { Navigate, useLocation } from "react-router-dom";
import { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTokenRefresh } from "@/hooks/useTokenRefresh";

const checkSurveysComplete = () => {
  if (typeof window === "undefined") return false;
  const now = new Date().getTime();
  const p = localStorage.getItem("last_pulse");
  const ph = localStorage.getItem("last_phq9");
  const g = localStorage.getItem("last_gad7");
  const pOk = p && now - new Date(p).getTime() < 7 * 24 * 60 * 60 * 1000;
  const phOk = ph && now - new Date(ph).getTime() < 30 * 24 * 60 * 60 * 1000;
  const gOk = g && now - new Date(g).getTime() < 30 * 24 * 60 * 60 * 1000;
  return !!(pOk && phOk && gOk);
};

export let sessionCheckInComplete = checkSurveysComplete();
export const setSessionCheckInComplete = (v: boolean) => { sessionCheckInComplete = v; };

export function StudentRoute({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { user } = useAuth();
  useTokenRefresh();

  // Not logged in as student → redirect to login
  if (!user || user.role !== "student") {
    return <Navigate to="/login" replace />;
  }

  const consentSigned = localStorage.getItem("consent_signed") === "true";

  if (!consentSigned && pathname !== "/student/consent") {
    return <Navigate to="/student/consent" replace />;
  }

  // Check-in gate: must complete check-in before navigating away from /student/checkin
  if (consentSigned && !sessionCheckInComplete && pathname !== "/student/checkin" && pathname !== "/student/consent") {
    return <Navigate to="/student/checkin" replace />;
  }

  return <>{children}</>;
}
