import { useAuth } from "@/context/AuthContext";
import { NeonSpinner } from "@/components/NeonSpinner";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";

/**
 * Login Page
 *
 * Shows "Sign in with Campus One" button.
 * AuthCallback handles post-login redirect based on roles.
 */
export default function Login() {
  const { isAuthenticated } = useAuth();
  const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

  // If already authenticated, show loading (AuthCallback will have handled redirect)
  if (isAuthenticated) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <NeonSpinner />
        <p className="text-white/60">Loading...</p>
      </div>
    );
  }

  const handleSignIn = () => {
    // Redirect to backend OIDC authorize endpoint
    window.location.href = `${API_URL}/api/auth/authorize`;
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center gap-6 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 px-4">
      <Logo />

      <div className="flex flex-col items-center gap-4">
        <h1 className="text-4xl font-bold text-white text-center">
          Welcome to SafeSpace
        </h1>
        <p className="text-white/70 text-center max-w-sm">
          Sign in with your Campus One account to access the crisis awareness and booking system.
        </p>
      </div>

      <Button
        onClick={handleSignIn}
        size="lg"
        className="px-8 py-6 text-lg"
      >
        Sign in with Campus One
      </Button>

      <p className="text-white/50 text-sm mt-8">
        Secure authentication via Campus One OIDC
      </p>
    </div>
  );
}
