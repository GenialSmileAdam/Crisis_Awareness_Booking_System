import { useEffect } from "react";
import { SSO_SIGN_IN_URL } from "@/api/auth";
import { Logo } from "@/components/Logo";

/**
 * /login — legacy route now redirects immediately to Campus One SSO.
 * Kept so old bookmarks / links don't 404.
 */
export default function Login() {
  useEffect(() => {
    window.location.replace(SSO_SIGN_IN_URL);
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-6 animate-fade-in-up">
        <Logo size="md" />
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-2 border-muted border-t-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Redirecting to Campus One…</p>
        </div>
      </div>
    </div>
  );
}
