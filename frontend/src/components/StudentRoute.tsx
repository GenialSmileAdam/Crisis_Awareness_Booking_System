import { Navigate } from "react-router-dom";
import { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";

interface StudentRouteProps {
  children: ReactNode;
}

export function StudentRoute({ children }: StudentRouteProps) {
  const { user, isLoading } = useAuth();

  // Show loading spinner while initializing
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-16 w-16 rounded-full border-2 border-muted border-t-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Wrong role
  if (user.role !== "student") {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}