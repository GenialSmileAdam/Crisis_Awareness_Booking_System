import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { ReactNode, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTokenRefresh } from "@/hooks/useTokenRefresh";

  // Not logged in as student → redirect to login
  if (!user || user.role !== "student") {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
