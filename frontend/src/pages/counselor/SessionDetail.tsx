import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ChevronLeft, LogOut, User, GraduationCap, Phone, Mail, AlertTriangle,
  Calendar, Clock, FileText, Brain, ChevronDown, ChevronUp, Save,
  CheckCircle2, ExternalLink, ShieldAlert, Activity, Loader2,
} from "lucide-react";
import { AppShell } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { NeonSpinner } from "@/components/NeonSpinner";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { counselorSidebarItems, adminSidebarItems } from "@/data/sidebar";
import {
  useAppointment,
  useStudent,
  useStudentRiskScore,
  useSessionByAppointment,
} from "@/hooks/queries";
import { useUpdateSessionNotes } from "@/hooks/mutations";

const TIER_COLOR: Record<string, string> = {
  green: "#A8FF3E",
  amber: "#FF8C42",
  red: "#FF4560",
  critical: "#B00020",
};

const TIER_LABEL: Record<string, string> = {
  green: "Green",
  amber: "Amber",
  red: "Red",
  critical: "Critical",
};

function TierBadge({ tier }: { tier: string }) {
  const color = TIER_COLOR[tier] || "#6B7280";
  return (
    <span
      className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ backgroundColor: `${color}25`, color }}
    >
      {TIER_LABEL[tier] || tier}
    </span>
  );
}

function InfoRow({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: any }) {
  return (
    <div className="flex items-start gap-2.5 py-2 border-b border-border/40 last:border-0">
      {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />}
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
        <div className="text-sm font-medium truncate">{value || "—"}</div>
      </div>
    </div>
  );
}

function SummarySection({ text }: { text: string }) {
  const sections = text.split(/\n(?=[A-Z][^a-z]*:)/).filter(Boolean);
  if (sections.length <= 1) {
    return (
      <div className="text-sm leading-relaxed whitespace-pre-wrap font-mono text-muted-foreground">
        {text}
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {sections.map((section, i) => {
        const colonIdx = section.indexOf(":");
        if (colonIdx === -1) return <p key={i} className="text-sm text-muted-foreground">{section}</p>;
        const heading = section.slice(0, colonIdx).trim();
        const body = section.slice(colonIdx + 1).trim();
        const isRiskTier = heading.toLowerCase().includes("risk tier");
        return (
          <div key={i} className={cn(
            "rounded-xl p-3 border",
            isRiskTier ? "border-primary/20 bg-primary/5" : "border-border/50 bg-muted/20"
          )}>
            <div className={cn(
              "text-xs font-bold uppercase tracking-wider mb-1",
              isRiskTier ? "text-primary" : "text-foreground"
            )}>{heading}</div>
            <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{body}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function SessionDetail() {
  const { appointment_id } = useParams<{ appointment_id: string }>();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const sidebarItems = user?.roles?.includes("unit_head") ? adminSidebarItems : counselorSidebarItems;

  const [showTranscript, setShowTranscript] = useState(false);
  const [notes, setNotes] = useState<string>("");
  const [notesSaved, setNotesSaved] = useState(false);

  const { data: appointment, isLoading: apptLoading } = useAppointment(appointment_id || "");
  const studentId = appointment?.student_id;
  const { data: student, isLoading: studentLoading } = useStudent(studentId || "");
  const { data: riskScore } = useStudentRiskScore(studentId || "");
  const { data: sessionData, isLoading: sessionLoading } = useSessionByAppointment(appointment_id);
  const { mutateAsync: updateNotesMutate, isPending: savingNotes } = useUpdateSessionNotes();

  // Seed notes textarea once session loads (runs once per appointment_id)
  useEffect(() => {
    if (sessionData) {
      setNotes(sessionData.notes || "");
    }
  }, [sessionData?.id]);  // eslint-disable-line react-hooks/exhaustive-deps

  const loading = apptLoading || studentLoading;

  const currentTier = riskScore?.override?.override_tier || riskScore?.current?.tier || "green";
  const wrsScore = riskScore?.current?.wrs_score ?? 0;
  const tierColor = TIER_COLOR[currentTier] || "#6B7280";

  const handleSaveNotes = async () => {
    if (!sessionData?.id) {
      toast.error("No session record found — start the AI session reviewer first");
      return;
    }
    try {
      await updateNotesMutate({ sessionId: sessionData.id, notes });
      setNotesSaved(true);
      toast.success("Notes saved to session record");
      setTimeout(() => setNotesSaved(false), 3000);
    } catch {
      toast.error("Failed to save notes");
    }
  };

  const formatDate = (dt: string) =>
    new Date(dt).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const formatTime = (dt: string) =>
    new Date(dt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  const duration = appointment
    ? Math.round((new Date(appointment.end_time).getTime() - new Date(appointment.start_time).getTime()) / 60000)
    : 0;

  const statusColors: Record<string, string> = {
    completed: "bg-emerald-500/15 text-emerald-600",
    confirmed: "bg-violet-500/15 text-violet-600",
    pending: "bg-amber-500/15 text-amber-600",
    cancelled: "bg-muted text-muted-foreground",
    rejected: "bg-destructive/15 text-destructive",
    no_show: "bg-orange-500/15 text-orange-600",
    booked: "bg-blue-500/15 text-blue-600",
  };
  const statusLabel: Record<string, string> = {
    completed: "Completed",
    confirmed: "Confirmed",
    pending: "Pending",
    cancelled: "Cancelled",
    rejected: "Rejected",
    no_show: "No-show",
    booked: "Upcoming",
  };

  const reviewUrl = user?.roles?.includes("unit_head")
    ? `/counselor/session/${appointment_id}`
    : `/counselor/session/${appointment_id}`;

  if (loading) {
    return (
      <AppShell items={sidebarItems}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <NeonSpinner size={40} />
        </div>
      </AppShell>
    );
  }

  if (!appointment) {
    return (
      <AppShell items={sidebarItems}>
        <div className="p-8 text-center text-destructive">Appointment not found</div>
      </AppShell>
    );
  }

  return (
    <AppShell items={sidebarItems}>
      {/* Header */}
      <div className="flex items-center justify-between py-4 md:h-16 px-4 md:px-8 border-b border-border bg-background/60 backdrop-blur-sm sticky top-0 z-30">
        <div className="flex items-center gap-2 md:gap-3">
          <Button onClick={() => navigate(-1)} variant="ghost" size="icon" className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-base md:text-lg font-bold">
                {appointment.student_full_name}
              </h1>
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-semibold",
                statusColors[appointment.status] || "bg-muted text-muted-foreground"
              )}>
                {statusLabel[appointment.status] || appointment.status}
              </span>
              {appointment.is_crisis && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-destructive/15 text-destructive animate-pulse">
                  CRISIS
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatDate(appointment.start_time)} · {formatTime(appointment.start_time)}–{formatTime(appointment.end_time)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={() => { logout(); navigate("/login"); }} className="md:hidden rounded-full h-9 w-9">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto">

        {/* ── Top grid: Student Info + Session Info ── */}
        <div className="grid md:grid-cols-2 gap-4">

          {/* Student profile card */}
          <div className="glass border border-border rounded-3xl p-5 space-y-1">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <div className="font-display font-bold text-sm">{student?.full_name || appointment.student_full_name}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">{student?.student_id || "—"}</div>
                </div>
              </div>
              {studentId && (
                <Link to={`/counselor/student/${studentId}`}>
                  <Button size="sm" variant="outline" className="text-xs gap-1">
                    <ExternalLink className="h-3 w-3" /> Full Profile
                  </Button>
                </Link>
              )}
            </div>
            <InfoRow label="Year / Level" value={student?.year_of_study ? `Year ${student.year_of_study}` : student?.class_level} icon={GraduationCap} />
            <InfoRow label="Faculty" value={student?.faculty} icon={GraduationCap} />
            <InfoRow label="Department" value={student?.department} />
            <InfoRow label="Programme" value={student?.program} />
            <InfoRow label="Gender" value={student?.gender} icon={User} />
            <InfoRow label="Phone" value={student?.phone_number
              ? <a href={`tel:${student.phone_number}`} className="text-primary hover:underline">{student.phone_number}</a>
              : null
            } icon={Phone} />
            <InfoRow label="Email" value={student?.email} icon={Mail} />
          </div>

          {/* Session + Risk card */}
          <div className="space-y-4">
            {/* Session details */}
            <div className="glass border border-border rounded-3xl p-5 space-y-1">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-display font-bold text-sm">Session Details</span>
              </div>
              <InfoRow label="Date" value={formatDate(appointment.start_time)} icon={Calendar} />
              <InfoRow label="Time" value={`${formatTime(appointment.start_time)} – ${formatTime(appointment.end_time)} (${duration} min)`} icon={Clock} />
              <InfoRow label="Status" value={
                <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold", statusColors[appointment.status] || "")}>
                  {statusLabel[appointment.status] || appointment.status}
                </span>
              } />
              <InfoRow label="Booking source" value={appointment.booking_source?.replace(/_/g, " ") || "—"} />
              {appointment.is_crisis && (
                <InfoRow label="Crisis note" value={
                  <span className="text-destructive">{appointment.crisis_note || "Crisis flag set"}</span>
                } icon={AlertTriangle} />
              )}
            </div>

            {/* Current risk status */}
            <div className="glass border border-border rounded-3xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span className="font-display font-bold text-sm">Current Risk Status</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 shrink-0">
                  <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
                    <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="3" className="stroke-muted" />
                    <circle
                      cx="18" cy="18" r="15.5" fill="none" strokeWidth="3"
                      stroke={tierColor}
                      strokeDasharray={`${(wrsScore / 100) * 97.4} 97.4`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-bold tabular-nums" style={{ color: tierColor }}>{Math.round(wrsScore)}</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <TierBadge tier={currentTier} />
                  <div className="text-xs text-muted-foreground">Wellness Risk Score</div>
                  {student?.crisis_flag && (
                    <div className="flex items-center gap-1 text-xs text-destructive font-medium">
                      <ShieldAlert className="h-3 w-3" /> Crisis flag active
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Emergency contact */}
            {(student?.emergency_contact || student?.emergency_phone) && (
              <div className="glass border border-border/50 rounded-3xl p-4 bg-amber-500/5 border-amber-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldAlert className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Emergency Contact</span>
                </div>
                <div className="text-sm font-medium">{student?.emergency_contact || "—"}</div>
                {student?.emergency_phone && (
                  <a href={`tel:${student.emergency_phone}`} className="text-xs text-primary hover:underline flex items-center gap-1 mt-0.5">
                    <Phone className="h-3 w-3" /> {student.emergency_phone}
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── AI Clinical Summary ── */}
        <div className="glass border border-border rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <div>
                <h2 className="font-display text-lg font-bold">AI Clinical Summary</h2>
                <p className="text-xs text-muted-foreground">Generated by SafeSpace AI · Review before using clinically</p>
              </div>
            </div>
            <Link to={reviewUrl}>
              <Button size="sm" variant="outline" className="text-xs gap-1.5">
                <ExternalLink className="h-3 w-3" />
                {sessionData?.summary ? "Regenerate" : "Start AI Review"}
              </Button>
            </Link>
          </div>

          {sessionLoading ? (
            <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading session data…
            </div>
          ) : sessionData?.summary ? (
            <div className="p-4 rounded-2xl bg-muted/20 border border-border/50">
              <SummarySection text={sessionData.summary} />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-10 rounded-2xl bg-muted/10 border border-dashed border-border">
              <Brain className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No AI summary generated yet</p>
              <Link to={reviewUrl}>
                <Button size="sm" className="gradient-primary text-primary-foreground border-0 gap-1.5">
                  <Brain className="h-3.5 w-3.5" /> Start AI Session Review
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* ── Psychologist Notes ── */}
        <div className="glass border border-border rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <div>
              <h2 className="font-display text-lg font-bold">Clinical Notes</h2>
              <p className="text-xs text-muted-foreground">
                {sessionData
                  ? "Saved to this session record — accessible on every visit"
                  : "Start the AI session reviewer first to enable persistent notes"}
              </p>
            </div>
          </div>

          <Textarea
            value={notes}
            onChange={(e) => { setNotes(e.target.value); setNotesSaved(false); }}
            rows={8}
            disabled={!sessionData}
            placeholder={sessionData
              ? `Session notes for ${appointment.student_full_name}…\n\nSuggested sections:\n• Presenting concerns this session\n• Observed emotional state / affect\n• Key themes or patterns\n• Interventions used\n• Response to intervention\n• Risk factors noted\n• Follow-up actions\n• Next session plan`
              : "Start the AI session reviewer to enable persistent notes for this session."
            }
            className="resize-none text-sm leading-relaxed font-mono"
          />

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {sessionData
                ? "Notes persist to the database and are visible on future reviews of this session."
                : ""}
            </p>
            <Button
              onClick={handleSaveNotes}
              size="sm"
              disabled={!sessionData || !notes.trim() || savingNotes}
              className={cn(
                "gap-1.5",
                notesSaved && "bg-emerald-500/10 border-emerald-500 text-emerald-600 hover:bg-emerald-500/20"
              )}
              variant="outline"
            >
              {savingNotes
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</>
                : notesSaved
                ? <><CheckCircle2 className="h-3.5 w-3.5" /> Saved</>
                : <><Save className="h-3.5 w-3.5" /> Save Notes</>
              }
            </Button>
          </div>
        </div>

        {/* ── Transcript (collapsible) ── */}
        {sessionData?.transcript && (
          <div className="glass border border-border rounded-3xl overflow-hidden">
            <button
              className="w-full flex items-center justify-between p-5 hover:bg-muted/20 transition-colors text-left"
              onClick={() => setShowTranscript((v) => !v)}
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-display font-bold text-sm">Session Transcript</span>
                <span className="text-[10px] text-muted-foreground font-mono ml-1">
                  {sessionData.transcript.length.toLocaleString()} chars
                </span>
              </div>
              {showTranscript
                ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                : <ChevronDown className="h-4 w-4 text-muted-foreground" />
              }
            </button>
            {showTranscript && (
              <div className="px-5 pb-5">
                <div className="p-4 rounded-xl bg-muted/30 border border-border/50 font-mono text-xs leading-relaxed max-h-[400px] overflow-y-auto whitespace-pre-wrap">
                  {sessionData.transcript}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Quick actions ── */}
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            className="gap-2 text-sm"
            onClick={() => navigate(-1)}
          >
            <ChevronLeft className="h-4 w-4" /> Back to Profile
          </Button>
          <Link to={reviewUrl}>
            <Button className="gradient-primary text-primary-foreground border-0 gap-2 text-sm">
              <Brain className="h-4 w-4" />
              {sessionData?.summary ? "Review AI Session" : "Start AI Session Review"}
            </Button>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
