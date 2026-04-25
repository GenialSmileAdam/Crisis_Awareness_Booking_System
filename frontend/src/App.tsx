import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useNavigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";
import { WrsProvider } from "@/context/WrsContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { StudentRoute } from "@/components/StudentRoute";
import { toast } from "sonner";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import StudentPortal from "./pages/student/StudentPortal";
import StudentHistory from "./pages/student/StudentHistory";
import StudentAppointments from "./pages/student/StudentAppointments";
import StudentResources from "./pages/student/StudentResources";
import StudentConsent from "./pages/student/StudentConsent";
import StudentForum from "./pages/student/StudentForum";
import CounselorDashboard from "./pages/counselor/CounselorDashboard";
import SessionReviewer from "./pages/counselor/SessionReviewer";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminForum from "./pages/admin/AdminForum";
import AdminResources from "./pages/admin/AdminResources";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

/**
 * Listens for the "safespace:session-expired" custom event dispatched by
 * the API client when a 401 refresh fails. Clears all auth state and
 * redirects the user to the login page with a toast notification.
 */
function SessionExpiryListener() {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = () => {
      localStorage.removeItem("safespace_access_token");
      localStorage.removeItem("safespace_user");
      localStorage.removeItem("ss_user");
      localStorage.removeItem("ss_token_expiry");
      toast.error("Your session has expired. Please sign in again.");
      navigate("/login", { replace: true });
    };

    window.addEventListener("safespace:session-expired", handler);
    return () => window.removeEventListener("safespace:session-expired", handler);
  }, [navigate]);

  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <WrsProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner position="top-right" />
            <BrowserRouter>
              <SessionExpiryListener />
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/student" element={<StudentRoute><StudentPortal /></StudentRoute>} />
                <Route path="/student/checkin" element={<StudentRoute><StudentPortal /></StudentRoute>} />
                <Route path="/student/consent" element={<StudentRoute><StudentConsent /></StudentRoute>} />
                <Route path="/student/history" element={<StudentRoute><StudentHistory /></StudentRoute>} />
                <Route path="/student/appointments" element={<StudentRoute><StudentAppointments /></StudentRoute>} />
                <Route path="/student/resources" element={<StudentRoute><StudentResources /></StudentRoute>} />
                <Route path="/student/forum" element={<StudentRoute><StudentForum /></StudentRoute>} />
                <Route path="/counselor" element={<ProtectedRoute role="psychologist"><CounselorDashboard /></ProtectedRoute>} />
                <Route path="/counselor/students" element={<ProtectedRoute role="psychologist"><CounselorDashboard /></ProtectedRoute>} />
                <Route path="/counselor/sessions" element={<ProtectedRoute role="psychologist"><CounselorDashboard /></ProtectedRoute>} />
                <Route path="/counselor/session/:id" element={<ProtectedRoute role="psychologist"><SessionReviewer /></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
                <Route path="/admin/users" element={<ProtectedRoute role="admin"><AdminUsers /></ProtectedRoute>} />
                <Route path="/admin/forum" element={<ProtectedRoute role="admin"><AdminForum /></ProtectedRoute>} />
                <Route path="/admin/resources" element={<ProtectedRoute role="admin"><AdminResources /></ProtectedRoute>} />
                <Route path="/admin/settings" element={<ProtectedRoute role="admin"><AdminSettings /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </WrsProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
