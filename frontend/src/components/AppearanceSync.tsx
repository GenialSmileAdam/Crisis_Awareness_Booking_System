import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { usePreferences } from "@/hooks/queries";

const TEXT_SIZE_PX: Record<string, string> = {
  sm: "15px",
  base: "16px",
  lg: "18px",
};

/**
 * Applies the student's appearance preferences (text size, reduced motion) to
 * the document root so they take effect app-wide. Mounted once near the top of
 * the tree. No-op for non-students / unauthenticated users.
 */
export function AppearanceSync() {
  const { isAuthenticated, user } = useAuth();
  const isStudent = (user?.roles ?? []).includes("student");
  const { data } = usePreferences(isAuthenticated && isStudent);

  useEffect(() => {
    const root = document.documentElement;
    const size = data?.appearance?.text_size ?? "base";
    root.style.fontSize = TEXT_SIZE_PX[size] ?? TEXT_SIZE_PX.base;
    root.classList.toggle("reduce-motion", !!data?.appearance?.reduced_motion);
  }, [data?.appearance?.text_size, data?.appearance?.reduced_motion]);

  // Reset the root font size on unmount/logout so a non-student session isn't
  // stuck with a student's scale.
  useEffect(() => {
    if (!isAuthenticated || !isStudent) {
      document.documentElement.style.fontSize = "";
      document.documentElement.classList.remove("reduce-motion");
    }
  }, [isAuthenticated, isStudent]);

  return null;
}
