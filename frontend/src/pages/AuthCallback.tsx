import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { fetchCurrentUser } = useAuth();
  const processedRef = useRef(false);

  useEffect(() => {
    // Prevent double processing of callback
    if (processedRef.current) return;
    processedRef.current = true;

    const processCallback = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const errorParam = params.get("message");

        console.log("AuthCallback: Processing OIDC callback");

        // Handle error from backend
        if (errorParam) {
          console.error("AuthCallback: Backend error:", errorParam);
          toast.error(`Authentication failed: ${errorParam}`);
          navigate("/login", { replace: true });
          return;
        }

        // Fetch current user from /auth/me endpoint
        // Backend uses refresh_token cookie to identify user
        console.log("AuthCallback: Fetching user from /auth/me...");
        const user = await fetchCurrentUser();

        if (!user) {
          console.error("AuthCallback: Failed to fetch user");
          toast.error("Authentication failed");
          navigate("/login", { replace: true });
          return;
        }

        console.log("AuthCallback: User authenticated:", {
          id: user.id,
          user_type: user.user_type,
          role: user.role,
          is_admin: user.is_admin,
        });

        // Route based on user role (from database, not Campus One)
        let redirectUrl = "/";

        if (user.user_type === "student") {
          redirectUrl = "/student";
        } else if (user.user_type === "staff") {
          if (user.is_admin) {
            redirectUrl = "/admin";
          } else {
            redirectUrl = "/counselor";
          }
        } else {
          console.warn("AuthCallback: Unknown user type:", user.user_type);
        }

        console.log("AuthCallback: Redirecting to:", redirectUrl);
        toast.success("Welcome! Signed in with Campus One.");
        navigate(redirectUrl, { replace: true });
      } catch (err) {
        console.error("Auth callback error:", err);
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        toast.error(`Authentication failed: ${errorMessage}`);
        navigate("/login", { replace: true });
      }
    };

    processCallback();
  }, [navigate, fetchCurrentUser]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="h-16 w-16 rounded-full border-2 border-muted border-t-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Completing sign in…</p>
      </div>
    </div>
  );
}
