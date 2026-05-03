import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { SSO_SIGN_IN_URL } from "@/api/auth";
import { Logo } from "@/components/Logo";

/**
 * /dashboard — Campus One SSO callbackURL target.
 *
 * After a successful Campus One login, the user lands here.
 * This page reads the session (via AuthContext → GET /auth/me)
 * and dispatches to the correct role-based route.
 *
 *   student      → /student
 *   psychologist → /counselor
 *   admin        → /admin
 *
 * If unauthenticated (session cookie missing/invalid), redirects to SSO.
 */
export default function Dashboard() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      window.location.href = SSO_SIGN_IN_URL;
      return;
    }

    switch (user.role) {
      case "student":
        navigate("/student", { replace: true });
        break;
      case "psychologist":
        navigate("/counselor", { replace: true });
        break;
      case "admin":
        navigate("/admin", { replace: true });
        break;
      default:
        // Unknown role — bounce back to SSO
        window.location.href = SSO_SIGN_IN_URL;
    }
  }, [isLoading, user, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-6 animate-fade-in-up">
        <Logo size="md" />
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-2 border-muted border-t-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Setting up your workspace…</p>
        </div>
      </div>
    </div>
  );
}
