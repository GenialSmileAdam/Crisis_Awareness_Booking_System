import { ReactNode, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { SSO_SIGN_IN_URL } from "@/api/auth";

interface StudentRouteProps {
  children: ReactNode;
}

/**
 * Route guard for student-only pages.
 *
 * - While session resolves: renders nothing (AuthProvider shows spinner).
 * - If user is not a student: redirects to Campus One SSO.
 * - Otherwise: renders children.
 */
export function StudentRoute({ children }: StudentRouteProps) {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "student")) {
      window.location.href = SSO_SIGN_IN_URL;
    }
  }, [isLoading, user]);

  if (isLoading) return null;
  if (!user || user.role !== "student") return null;

  return <>{children}</>;
}