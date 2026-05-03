import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, LogOut, AlertTriangle } from "lucide-react";
import { AppShell } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { CrisisBanner } from "@/components/CrisisBanner";
import { toast } from "sonner";
import { cn, formatWRS } from "@/lib/utils";

import { counselorSidebarItems } from "@/data/sidebar";
import { getStudent, Student } from "@/api/students";
import { getStudentCheckins, CheckinRecord } from "@/api/checkins";
import { getRiskScore, RiskScoreDetail } from "@/api/riskScores";
import { listAppointments, Appointment } from "@/api/appointments";

export default function CounselorStudent() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { student_id } = useParams();
  
  const [student, setStudent] = useState<Student | null>(null);
  const [riskScore, setRiskScore] = useState<RiskScoreDetail | null>(null);
  const [checkins, setCheckins] = useState<CheckinRecord[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!student_id) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [studentData, riskData, checkinsData, appointmentsData] = await Promise.all([
          getStudent(student_id),
          getRiskScore(student_id),
          getStudentCheckins(student_id, 10, 0),
          listAppointments(100, 0),
        ]);

        setStudent(studentData);
        setRiskScore(riskData);
        setCheckins(checkinsData.data || []);
        
        // Filter appointments for this student
        const studentAppointments = (appointmentsData.data || []).filter(
          (a: any) => a.student_id === student_id
        );
        setAppointments(studentAppointments);
      } catch (err) {
        setError("Failed to load student data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [student_id]);

  if (loading) {
    return (
      <AppShell items={counselorSidebarItems}>
        <div className="p-4 md:p-8 text-center">Loading student data...</div>
      </AppShell>
    );
  }

  if (error || !student) {
    return (
      <AppShell items={counselorSidebarItems}>
        <div className="p-4 md:p-8 text-center text-destructive">{error || "Student not found"}</div>
      </AppShell>
    );
  }

  const tierColor: Record<string, string> = {
    "green": "#A8FF3E",
    "amber": "#FF8C42",
    "red": "#FF4560",
    "critical": "#B00020",
  };

  const tierLabel: Record<string, string> = {
    "green": "Green",
    "amber": "Amber",
    "red": "Red",
    "critical": "Critical",
  };

  const currentTier = riskScore?.override?.override_tier || riskScore?.current?.tier || "green";
  const wrsScore = riskScore?.current?.wrs_score || 0;
  const color = tierColor[currentTier as string] || "#6B7280";

  return (
    <AppShell items={counselorSidebarItems}>
      <div className="flex items-start md:items-center justify-between py-4 md:h-16 px-4 md:px-8 border-b border-border bg-background md:bg-background/60 md:backdrop-blur-sm sticky top-0 z-30">
        <div className="flex items-center gap-3 flex-1">
          <Button 
            onClick={() => navigate(-1)} 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="font-display text-lg md:text-xl font-bold">{student.full_name}</h1>
            <p className="text-xs text-muted-foreground">ID: {student.student_id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={() => logout()} className="md:hidden rounded-full h-9 w-9">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <CrisisBanner />

      <div className="p-4 md:p-8 space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* LEFT COLUMN */}
          <div className="space-y-4">
            {/* Student Info Card */}
            <div className="surface-card p-5 bg-card">
              <h3 className="font-semibold text-sm mb-4">Student Information</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium">{student.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Student ID</span>
                  <span className="font-medium">{student.student_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Class Level</span>
                  <span className="font-medium">{student.class_level || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-medium text-xs">{student.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Faculty</span>
                  <span className="font-medium">{student.faculty || "—"}</span>
                </div>
              </div>
            </div>

            {/* Risk Score Card */}
            <div className="surface-card p-5 bg-card">
              <h3 className="font-semibold text-sm mb-4">Risk Status</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Current Tier</span>
                  <span
                    className={cn("text-sm px-3 py-1 rounded-full font-medium", currentTier === "critical" && "animate-pulse")}
                    style={{ backgroundColor: `${color}25`, color }}
                  >
                    {tierLabel[currentTier as string]}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">WRS Score</span>
                  <span className="text-sm font-medium">{formatWRS(wrsScore)}</span>
                </div>
                {riskScore?.override && (
                  <div className="pt-2 border-t border-border text-xs text-amber-600 dark:text-amber-400">
                    ⚠️ Tier overridden by psychologist
                  </div>
                )}
              </div>
            </div>

            {/* Crisis Flag Indicator */}
            {/* Note: Crisis flag is not directly exposed in the Student model, 
                but would be checked via crisis logs or appointments */}
            {appointments.some((a) => a.is_crisis) && (
              <div className="surface-card p-5 bg-card border border-destructive/30">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm text-destructive">Crisis Flag Active</h4>
                    <p className="text-xs text-muted-foreground mt-1">Recent crisis escalation detected.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-4">
            {/* Check-in History */}
            <div className="surface-card p-5 bg-card">
              <h3 className="font-semibold text-sm mb-4">Check-in History</h3>
              {checkins.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Check-in history will appear here once the student completes check-ins.
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 font-medium text-muted-foreground">Date</th>
                        <th className="text-left py-2 font-medium text-muted-foreground">Type</th>
                        <th className="text-left py-2 font-medium text-muted-foreground">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {checkins.map((c) => (
                        <tr key={c.id} className="border-b border-border/50 last:border-0">
                          <td className="py-2">{new Date(c.submitted_at).toLocaleDateString()}</td>
                          <td className="py-2 capitalize">{c.type}</td>
                          <td className="py-2">{formatWRS(c.score)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Sessions Section */}
            <div className="surface-card p-5 bg-card">
              <h3 className="font-semibold text-sm mb-4">Sessions</h3>
              {appointments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No sessions scheduled.</p>
              ) : (
                <div className="space-y-2">
                  {appointments.map((appt) => (
                    <div key={appt.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                      <div className="flex-1">
                        <div className="text-xs font-medium">
                          {new Date(appt.appointment_date).toLocaleDateString()} at {appt.appointment_time}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Status: <span className="capitalize">{appt.status}</span>
                        </div>
                      </div>
                      <Button
                        onClick={() => navigate(`/counselor/session/${appt.id}`)}
                        size="sm"
                        className="text-xs h-7"
                      >
                        Open
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
