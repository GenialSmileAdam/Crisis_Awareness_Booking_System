import { Navigate } from "react-router-dom";
import { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";

interface StudentRouteProps {
  children: ReactNode;
}

export function StudentRoute({ children }: StudentRouteProps) {
  const { user, isLoading } = useAuth();

  console.log("StudentRoute: isLoading=", isLoading, "user=", user);

  // Show loading spinner while initializing
  if (isLoading) {
    console.log("StudentRoute: Still loading auth context");
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
    console.log("StudentRoute: No user found, redirecting to login");
    return <Navigate to="/login" replace />;
  }

  // Wrong role
  if (user.role !== "student") {
    console.log("StudentRoute: User role is not 'student', got:", user.role, "redirecting to login");
    return <Navigate to="/login" replace />;
  }

  console.log("StudentRoute: User authenticated and authorized, rendering children");
  return <>{children}</>;
}