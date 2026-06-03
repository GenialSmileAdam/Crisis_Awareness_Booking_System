import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { loginFromCallback } = useAuth();

  useEffect(() => {
    const processCallback = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const accessToken = params.get("access_token");
        const errorParam = params.get("error");

        console.log("AuthCallback: Processing OIDC callback");
        console.log("AuthCallback: access_token present:", !!accessToken);
        console.log("AuthCallback: error present:", !!errorParam);

        // Handle error from backend
        if (errorParam) {
          console.error("AuthCallback: Backend returned error:", errorParam);
          toast.error(`Authentication failed: ${errorParam}`);
          navigate("/login");
          return;
        }

        // Validate token exists and has 3 JWT parts
        if (!accessToken) {
          console.error("AuthCallback: No access token in URL");
          toast.error("No authentication token received from server");
          navigate("/login");
          return;
        }

        const parts = accessToken.split(".");
        if (parts.length !== 3) {
          console.error(`AuthCallback: Invalid token format. Parts: ${parts.length}`);
          toast.error("Invalid authentication token format");
          navigate("/login");
          return;
        }

        console.log("AuthCallback: Token is valid format");

        // Process the callback and store token
        const user = await loginFromCallback(accessToken);
        console.log("AuthCallback: User decoded from token:", { role: user.role, user_type: user.user_type });

        // Determine redirect based on user role
        const role = user.role ?? user.user_type;
        let redirectUrl = "/";

        if (role === "student") {
          redirectUrl = "/student";
        } else if (role === "psychologist") {
          redirectUrl = "/counselor";
        } else if (user.is_admin) {
          redirectUrl = "/admin";
        } else {
          console.warn("AuthCallback: Unknown role, redirecting to home:", role);
        }

        console.log("AuthCallback: Redirecting to:", redirectUrl);
        toast.success("Welcome! Signed in with Campus One.");
        navigate(redirectUrl);
      } catch (err) {
        console.error("Auth callback error:", err);
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        toast.error(`Failed to complete authentication: ${errorMessage}`);
        navigate("/login");
      }
    };

    processCallback();
  }, [navigate, loginFromCallback]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="h-16 w-16 rounded-full border-2 border-muted border-t-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Signing you in…</p>
      </div>
    </div>
  );
}
