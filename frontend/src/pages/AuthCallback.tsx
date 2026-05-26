import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const accessToken = params.get("access_token");
      const userType = params.get("user_type");

      if (!accessToken || !userType) {
        navigate("/login?error=missing_token");
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
        navigate("/login?error=invalid_token");
        return;
      }

      // Store token and user in localStorage
      localStorage.setItem("safespace_access_token", accessToken);
      localStorage.setItem("ss_user", JSON.stringify(decoded));

      // Reload the page to trigger AuthContext re-initialization
      // Or manually update auth state if you have access to the dispatch
      // For now, redirect based on role
      const role = decoded.role || userType;

      if (role === "student") {
        navigate("/student");
      } else if (role === "psychologist") {
        navigate("/counselor");
      } else if (role === "admin") {
        navigate("/admin");
      } else {
        navigate("/");
      }

      // Force page reload to ensure AuthContext picks up the new token
      setTimeout(() => window.location.reload(), 100);
    };

    handleCallback();
  }, [navigate, login]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="h-16 w-16 rounded-full border-2 border-muted border-t-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Signing you in...</p>
      </div>
    </div>
  );
}
