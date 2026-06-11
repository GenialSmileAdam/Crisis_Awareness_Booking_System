import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";
import { WrsProvider } from "@/context/WrsContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { StudentRoute } from "@/components/StudentRoute";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import AuthError from "./pages/AuthError";
import StudentPortal from "./pages/student/StudentPortal";
import StudentHistory from "./pages/student/StudentHistory";
import StudentAppointments from "./pages/student/StudentAppointments";
import StudentResources from "./pages/student/StudentResources";
import StudentConsent from "./pages/student/StudentConsent";
import StudentForum from "./pages/student/StudentForum";
import CounselorDashboard from "./pages/counselor/CounselorDashboard";
import CounselorForum from "./pages/counselor/CounselorForum";
import CounselorStudent from "./pages/counselor/CounselorStudent";
import CounselorAvailability from "./pages/counselor/CounselorAvailability";
import PendingAppointments from "./pages/counselor/PendingAppointments";
import MyStudents from "./pages/counselor/MyStudents";
import SessionReviewer from "./pages/counselor/SessionReviewer";
import SessionDetail from "./pages/counselor/SessionDetail";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminInsights from "./pages/admin/AdminInsights";
import AdminForum from "./pages/admin/AdminForum";
import AdminResources from "./pages/admin/AdminResources";
import AdminFeedback from "./pages/admin/AdminFeedback";
import NotFound from "./pages/NotFound";
import AutoLogin from "./pages/AutoLogin";
import { ConfigSync } from "@/components/ConfigSync";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Live-by-default: data is considered fresh for 30s, then refetched on the
      // next use or window focus. Hooks that hold static data (staff, resources)
      // can still opt into a longer staleTime locally.
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <WrsProvider>
          <TooltipProvider>
            <ConfigSync />
            <Toaster />
            <Sonner position="top-right" />
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <Routes>
                <Route path="/" element={<AutoLogin />} />
                <Route path="/login" element={<Login />} />
                <Route path="/auto-login" element={<AutoLogin />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/auth/error" element={<AuthError />} />
                <Route path="/student" element={<StudentRoute><StudentPortal /></StudentRoute>} />
                <Route path="/student/checkin" element={<StudentRoute><StudentPortal /></StudentRoute>} />
                <Route path="/student/consent" element={<StudentRoute><StudentConsent /></StudentRoute>} />
                <Route path="/student/history" element={<StudentRoute><StudentHistory /></StudentRoute>} />
                <Route path="/student/appointments" element={<StudentRoute><StudentAppointments /></StudentRoute>} />
                <Route path="/student/resources" element={<StudentRoute><StudentResources /></StudentRoute>} />
                <Route path="/student/forum" element={<StudentRoute><StudentForum /></StudentRoute>} />
                <Route path="/counselor" element={<ProtectedRoute role={["psychologist", "unit_head"]}><CounselorDashboard /></ProtectedRoute>} />
                <Route path="/counselor/students" element={<ProtectedRoute role={["psychologist", "unit_head"]}><MyStudents /></ProtectedRoute>} />
                <Route path="/counselor/sessions" element={<ProtectedRoute role={["psychologist", "unit_head"]}><CounselorDashboard /></ProtectedRoute>} />
                <Route path="/counselor/availability" element={<ProtectedRoute role={["psychologist", "unit_head"]}><CounselorAvailability /></ProtectedRoute>} />
                <Route path="/counselor/pending-appointments" element={<ProtectedRoute role={["psychologist", "unit_head"]}><PendingAppointments /></ProtectedRoute>} />
                <Route path="/counselor/forum" element={<ProtectedRoute role={["psychologist", "unit_head"]}><CounselorForum /></ProtectedRoute>} />
                <Route path="/counselor/student/:student_id" element={<ProtectedRoute role={["psychologist", "unit_head"]}><CounselorStudent /></ProtectedRoute>} />
                <Route path="/admin/student/:student_id" element={<ProtectedRoute role={["unit_head", "psychologist"]}><CounselorStudent /></ProtectedRoute>} />
                <Route path="/counselor/session/:id" element={<ProtectedRoute role={["psychologist", "unit_head"]}><SessionReviewer /></ProtectedRoute>} />
                <Route path="/counselor/session/detail/:appointment_id" element={<ProtectedRoute role={["psychologist", "unit_head"]}><SessionDetail /></ProtectedRoute>} />
                <Route path="/admin/session/detail/:appointment_id" element={<ProtectedRoute role={["unit_head"]}><SessionDetail /></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute role="unit_head"><AdminDashboard /></ProtectedRoute>} />
                <Route path="/admin/insights" element={<ProtectedRoute role="unit_head"><AdminInsights /></ProtectedRoute>} />
                <Route path="/admin/users" element={<ProtectedRoute role="unit_head"><AdminUsers /></ProtectedRoute>} />
                <Route path="/admin/forum" element={<ProtectedRoute role="unit_head"><AdminForum /></ProtectedRoute>} />
                <Route path="/admin/resources" element={<ProtectedRoute role="unit_head"><AdminResources /></ProtectedRoute>} />
                <Route path="/admin/feedback" element={<ProtectedRoute role="unit_head"><AdminFeedback /></ProtectedRoute>} />
                <Route path="/admin/settings" element={<ProtectedRoute role="unit_head"><AdminSettings /></ProtectedRoute>} />
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
