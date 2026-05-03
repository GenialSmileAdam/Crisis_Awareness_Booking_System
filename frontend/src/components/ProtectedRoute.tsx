import { ReactNode, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { SSO_SIGN_IN_URL } from "@/api/auth";

type Role = "student" | "psychologist" | "admin" | "staff";

/**
 * Route guard for role-protected pages.
 *
 * - While session is loading: renders nothing (AuthProvider shows spinner).
 * - If no user or role mismatch: redirects to Campus One SSO.
 * - Otherwise: renders children.
 */
export function ProtectedRoute({ role, children }: { role: Role; children: ReactNode }) {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && (!user || user.role !== role)) {
      window.location.href = SSO_SIGN_IN_URL;
    }
  }, [isLoading, user, role]);

  if (isLoading) return null;
  if (!user || user.role !== role) return null;

  return <>{children}</>;
}
