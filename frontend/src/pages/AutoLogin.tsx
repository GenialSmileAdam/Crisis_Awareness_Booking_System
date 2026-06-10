import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { NeonSpinner } from "@/components/NeonSpinner";
import { hasRole } from "@/utils/roles";

const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

/**
 * Auto-login landing page used for Campus One notification/event deep-links.
 *
 * - Already logged in → redirect to the user's dashboard immediately.
 * - Not logged in → redirect to the Campus One OIDC authorize endpoint so
 *   the user is logged in automatically (Campus One session is still active
 *   when they click from the Campus One app).
 */
export default function AutoLogin() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated && user) {
      const roles = user.roles ?? [];
      if (roles.includes("unit_head") || roles.includes("unit_admin")) {
        navigate("/admin", { replace: true });
      } else if (roles.includes("psychologist")) {
        navigate("/counselor", { replace: true });
      } else {
        navigate("/student", { replace: true });
      }
    } else {
      window.location.href = `${API_URL}/api/auth/authorize`;
    }
  }, [isAuthenticated, isLoading, user, navigate]);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <NeonSpinner />
      <p className="text-white/60">Signing you in…</p>
    </div>
  );
}
