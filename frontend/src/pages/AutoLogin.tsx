import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { NeonSpinner } from "@/components/NeonSpinner";
import { hasRole } from "@/utils/roles";


/**
 * Smart entry / auto-login landing page — the home route ("/") and the target
 * of Campus One notification/event deep-links.
 *
 * Order of checks when a user lands here:
 *   1. Already have a SafeSpace session (restored by AuthProvider from the
 *      HTTP-only refresh cookie) → go straight to the dashboard.
 *   2. No SafeSpace session → attempt SILENT Campus One SSO (`prompt=none`).
 *      If the user already has an active Campus One session (very likely when
 *      they arrived from the Campus One app), they are signed in seamlessly with
 *      no login screen — as if Campus One had redirected them in directly.
 *   3. If there is no active Campus One session, the backend callback redirects
 *      to /login for an explicit, interactive sign-in (no silent-retry loop).
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
      navigate("/login", { replace: true });
    }
  }, [isAuthenticated, isLoading, user, navigate]);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <NeonSpinner />
      <p className="text-white/60">Signing you in…</p>
    </div>
  );
}
