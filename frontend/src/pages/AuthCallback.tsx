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

        // Handle error from backend
        if (errorParam) {
          toast.error(`Authentication failed: ${errorParam}`);
          navigate("/login");
          return;
        }

        // Validate token exists and has 3 JWT parts
        if (!accessToken || accessToken.split(".").length !== 3) {
          toast.error("Invalid or missing authentication token");
          navigate("/login");
          return;
        }

        // Process the callback and store token
        const user = await loginFromCallback(accessToken);

        // Determine redirect based on user role
        const role = user.role ?? user.user_type;
        let redirectUrl = "/";

        if (role === "student") {
          redirectUrl = "/student";
        } else if (role === "psychologist") {
          redirectUrl = "/counselor";
        } else if (user.is_admin) {
          redirectUrl = "/admin";
        }

        toast.success("Welcome! Signed in with Campus One.");
        navigate(redirectUrl);
      } catch (err) {
        console.error("Auth callback error:", err);
        toast.error("Failed to complete authentication");
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
