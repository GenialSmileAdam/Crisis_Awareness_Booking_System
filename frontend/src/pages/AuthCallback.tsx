import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { loginFromCallback } = useAuth();
  const processedRef = useRef(false);

  useEffect(() => {
    // Prevent double processing of callback
    if (processedRef.current) return;
    processedRef.current = true;

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
          navigate("/login", { replace: true });
          return;
        }

        // Validate token exists and has 3 JWT parts
        if (!accessToken) {
          console.error("AuthCallback: No access token in URL - silently redirecting");
          navigate("/login", { replace: true });
          return;
        }

        const parts = accessToken.split(".");
        if (parts.length !== 3) {
          console.error(`AuthCallback: Invalid token format. Parts: ${parts.length}`);
          toast.error("Invalid authentication token format");
          navigate("/login", { replace: true });
          return;
        }

        console.log("AuthCallback: Token is valid format");

        // Process the callback and store token
        const user = await loginFromCallback(accessToken);
        console.log("AuthCallback: User decoded from token:", { role: user.role, user_type: user.user_type, staff_type: user.staff_type, is_admin: user.is_admin });

        // Determine redirect based on user role/type
        const userType = user.user_type;
        const isAdmin = user.is_admin;
        const staffType = user.staff_type;
        let redirectUrl = "/";

        if (userType === "student") {
          redirectUrl = "/student";
        } else if (userType === "staff") {
          // For staff users, check staff_type and admin status
          if (isAdmin || staffType === "administrator") {
            redirectUrl = "/admin";
          } else {
            redirectUrl = "/counselor";
          }
        } else {
          console.warn("AuthCallback: Unknown user type, redirecting to home:", { userType, staffType, isAdmin });
        }

        console.log("AuthCallback: Redirecting to:", redirectUrl);
        toast.success("Welcome! Signed in with Campus One.");
        // Use replace to prevent adding callback to history
        navigate(redirectUrl, { replace: true });
      } catch (err) {
        console.error("Auth callback error:", err);
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        toast.error(`Failed to complete authentication: ${errorMessage}`);
        navigate("/login", { replace: true });
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
