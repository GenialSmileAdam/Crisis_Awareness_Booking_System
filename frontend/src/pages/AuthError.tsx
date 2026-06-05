import { useSearchParams, useNavigate } from "react-router-dom";
import { AlertCircle, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Error page shown when OIDC authentication fails
 */
export default function AuthError() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const errorMessage = searchParams.get("message") || "Authentication failed";

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center gap-6 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 px-4">
      <div className="flex flex-col items-center gap-4 max-w-md">
        <div className="p-4 rounded-full bg-red-500/10">
          <AlertCircle className="w-12 h-12 text-red-500" />
        </div>

        <h1 className="text-3xl font-bold text-white text-center">
          Authentication Failed
        </h1>

        <p className="text-white/70 text-center text-lg">
          {decodeURIComponent(errorMessage)}
        </p>

        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 w-full mt-4">
          <p className="text-sm text-white/60">
            <strong>What happened?</strong>
            <br />
            There was an issue authenticating with Campus One. This could be due
            to:
          </p>
          <ul className="mt-3 text-sm text-white/60 space-y-2 list-disc list-inside">
            <li>Your Campus One session expired</li>
            <li>Network connectivity issues</li>
            <li>OIDC configuration problem</li>
            <li>Invalid credentials</li>
          </ul>
        </div>

        <Button
          onClick={() => navigate("/login")}
          className="w-full mt-6 gap-2"
          size="lg"
        >
          <Home className="w-4 h-4" />
          Try Again
        </Button>
      </div>
    </div>
  );
}
