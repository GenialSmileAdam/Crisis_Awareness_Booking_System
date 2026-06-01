import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { user: contextUser, accessToken: contextToken } = useAuth();
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const accessToken = params.get("access_token");
        const userType = params.get("user_type");
        const error = params.get("error");

        // Check for errors from backend
        if (error) {
          toast.error(`Authentication failed: ${error}`);
          navigate("/login?error=" + encodeURIComponent(error));
          setIsProcessing(false);
          return;
        }

        if (!accessToken || !userType) {
          toast.error("Missing authentication token");
          navigate("/login?error=missing_token");
          setIsProcessing(false);
          return;
        }

        // Decode JWT to get user claims
        const decodeJWT = (token: string) => {
          try {
            const parts = token.split(".");
            if (parts.length !== 3) return null;
            const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
            const padded = base64 + "==".slice(0, (4 - (base64.length % 4)) % 4);
            return JSON.parse(atob(padded));
          } catch {
            return null;
          }
        };

        const decoded = decodeJWT(accessToken);
        if (!decoded) {
          toast.error("Invalid authentication token");
          navigate("/login?error=invalid_token");
          setIsProcessing(false);
          return;
        }

        // Store token and user in localStorage
        localStorage.setItem("safespace_access_token", accessToken);
        localStorage.setItem("ss_user", JSON.stringify(decoded));

        // Dispatch a custom event to notify AuthContext of the update
        window.dispatchEvent(new CustomEvent("auth:campus-one-callback", {
          detail: { token: accessToken, user: decoded }
        }));

        // Determine redirect URL based on user role
        const role = decoded.user_type || userType;
        let redirectUrl = "/";

        if (role === "student") {
          redirectUrl = "/student";
        } else if (role === "psychologist" || role === "staff") {
          redirectUrl = "/counselor";
        } else if (role === "admin") {
          redirectUrl = "/admin";
        }

        // Navigate without page reload for seamless transition
        navigate(redirectUrl);
        toast.success("Welcome! You've been signed in with Campus One.");
      } catch (err) {
        console.error("Auth callback error:", err);
        toast.error("An error occurred during authentication");
        navigate("/login?error=auth_error");
      } finally {
        setIsProcessing(false);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="h-16 w-16 rounded-full border-2 border-muted border-t-primary animate-spin" />
        <p className="text-sm text-muted-foreground">
          {isProcessing ? "Signing you in..." : "Redirecting..."}
        </p>
      </div>
    </div>
  );
}
