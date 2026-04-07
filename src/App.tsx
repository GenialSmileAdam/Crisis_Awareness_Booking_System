import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import LoginPage from "./pages/LoginPage";
import StudentDashboard from "./pages/student/StudentDashboard";
import BookAppointment from "./pages/student/BookAppointment";
import StudentSessions from "./pages/student/StudentSessions";
import StudentAISummary from "./pages/student/StudentAISummary";
import CounselorDashboard from "./pages/counselor/CounselorDashboard";
import CounselorSessions from "./pages/counselor/CounselorSessions";
import CounselorStudents from "./pages/counselor/CounselorStudents";
import SessionDetail from "./pages/counselor/SessionDetail";
import CounselorAISummary from "./pages/counselor/CounselorAISummary";
import FamilyEngagement from "./pages/counselor/FamilyEngagement";
import AdminDashboard from "./pages/admin/AdminDashboard";
import FamilyDashboard from "./pages/family/FamilyDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<LoginPage />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to={`/${user.role}/dashboard`} replace />} />

      <Route path="/student/dashboard" element={<StudentDashboard />} />
      <Route path="/student/book-appointment" element={<BookAppointment />} />
      <Route path="/student/sessions" element={<StudentSessions />} />
      <Route path="/student/ai-summary" element={<StudentAISummary />} />

      <Route path="/counselor/dashboard" element={<CounselorDashboard />} />
      <Route path="/counselor/sessions" element={<CounselorSessions />} />
      <Route path="/counselor/students" element={<CounselorStudents />} />
      <Route path="/counselor/session/:id" element={<SessionDetail />} />
      <Route path="/counselor/ai-summary/:studentId" element={<CounselorAISummary />} />
      <Route path="/counselor/ai-summary" element={<CounselorAISummary />} />
      <Route path="/counselor/family-engagement" element={<FamilyEngagement />} />

      <Route path="/admin/dashboard" element={<AdminDashboard />} />

      <Route path="/family/dashboard" element={<FamilyDashboard />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
