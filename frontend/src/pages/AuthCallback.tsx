import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { NeonSpinner } from "@/components/NeonSpinner";
import { toast } from "sonner";

/**
 * Auth Callback Handler
 *
 * Backend redirects here with token in URL fragment (#token=...)
 * This page extracts the token and completes the login flow.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const processedRef = useRef(false);
  const [navigated, setNavigated] = useState(false);

  useEffect(() => {
    // Prevent double processing (React strict mode)
    if (processedRef.current) return;
    processedRef.current = true;

    const handleCallback = async () => {
      try {
        // Extract token from URL fragment (#token=...)
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const token = params.get("token");
        const error = params.get("message");

        // Handle error
        if (error) {
          console.error("Auth error:", error);
          toast.error(`Sign in failed: ${decodeURIComponent(error)}`);
          navigate("/login", { replace: true });
          return;
        }

        // Handle missing token
        if (!token) {
          console.error("No token in callback");
          toast.error("Authentication failed: No token received");
          navigate("/login", { replace: true });
          return;
        }

        console.log("Token received, processing login...");

        // Store token locally and set in context
        localStorage.setItem("safespace_access_token", token);

        // Decode JWT to get user info (basic decode, not verification)
        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split("")
            .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join("")
        );
        const decoded = JSON.parse(jsonPayload);

        console.log("User info:", {
          user_type: decoded.user_type,
          role: decoded.role,
          is_admin: decoded.is_admin,
          roles: decoded.roles
        });

        // Update auth context
        await login(decoded);

        // Route to dashboard based on Campus One roles
        let redirectUrl = "/";
        const userRoles = decoded.roles || [];

        if (userRoles.includes("unit_head")) {
          redirectUrl = "/admin";
        } else if (userRoles.includes("psychologist")) {
          redirectUrl = "/counselor";
        } else if (userRoles.includes("student")) {
          redirectUrl = "/student";
        }

        console.log("Redirecting to:", redirectUrl);
        toast.success("Signed in successfully!");
        setNavigated(true);
        navigate(redirectUrl, { replace: true });

      } catch (err) {
        console.error("Callback processing error:", err);
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        toast.error(`Failed to complete sign in: ${errorMsg}`);
        navigate("/login", { replace: true });
      }
    };

    handleCallback();
  }, [navigate, login]);

  // Return null after navigation - let the router handle the transition
  if (navigated) return null;

  // Show loading state
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <NeonSpinner />
      <p className="text-white/60">Completing sign in...</p>
    </div>
  );
}
