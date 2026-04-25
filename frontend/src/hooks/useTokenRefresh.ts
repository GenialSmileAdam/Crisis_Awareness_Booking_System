import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";

export function useTokenRefresh() {
  const { tokenExpiry, setTokenExpiry, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    if (!tokenExpiry) return;

    const checkToken = async () => {
      const now = Date.now();
      const timeUntilExpiry = tokenExpiry - now;

      // If token is already expired
      if (timeUntilExpiry <= 0) {
        toast.error("Your session has expired. Please sign in again.");
        logout();
        navigate("/login");
        return;
      }

      // If within 1 minute of expiring, mock a refresh
      if (timeUntilExpiry < 60 * 1000) {
        try {
          // In a real app, this would be a fetch call:
          // await fetch("/auth/refresh", { method: "POST" });
          
          // Mock successful refresh: Extend by 14 minutes
          const newExpiry = Date.now() + 14 * 60 * 1000;
          setTokenExpiry(newExpiry);
          localStorage.setItem("ss_token_expiry", newExpiry.toString());
          // console.log("Token refreshed silently.");
        } catch (error) {
          toast.error("Your session has expired. Please sign in again.");
          logout();
          navigate("/login");
        }
      }
    };

    checkToken();
    
    // Also set up an interval to check periodically if the user leaves the tab open
    const interval = setInterval(checkToken, 30 * 1000); // Check every 30s
    return () => clearInterval(interval);
  }, [tokenExpiry, logout, navigate, setTokenExpiry, pathname]);
}
