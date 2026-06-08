import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ChevronLeft, LogOut, AlertTriangle, Phone, Mail, User,
  GraduationCap, Activity, Calendar, ClipboardList, ShieldAlert,
  CheckCircle2, Clock, XCircle, TrendingUp, TrendingDown, Minus,
  Edit3, X, Save, Brain, BarChart2, FileText,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, CartesianGrid,
} from "recharts";
import { AppShell } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CrisisBanner } from "@/components/CrisisBanner";
import { cn, formatWRS } from "@/lib/utils";
import { toast } from "sonner";
import { counselorSidebarItems, adminSidebarItems } from "@/data/sidebar";
import { colorFromWrs } from "@/lib/wrs";
import {
  useStudent,
  useStudentRiskScore,
  useStudentWrsHistory,
  useStudentCheckins,
  useStudentAppointments,
  useStudentCrisisLogs,
} from "@/hooks/queries";
import { useRiskOverride } from "@/hooks/mutations";
import type { Student, CheckinRecord, Appointment } from "@/api";

// ── helpers ──────────────────────────────────────────────────────────────────

const TIER_COLOR: Record<string, string> = {
  green: "#A8FF3E", amber: "#FF8C42", red: "#FF4560", critical: "#B00020",
};
const TIER_LABEL: Record<string, string> = {
  green: "Green", amber: "Amber", red: "Red", critical: "Critical",
};

function typeLabel(t: string) {
  return t === "phq9" ? "PHQ-9" : t === "gad7" ? "GAD-7" : t === "pulse" ? "Pulse" : t.toUpperCase();
}

function checkinWrs(c: CheckinRecord): number | null {
  if ((c.type === "phq9" || c.type === "gad7") && c.score !== null) {
    const maxScore = c.type === "gad7" ? 21 : 27;
    return Math.round((c.score / maxScore) * 100);
  }
  return null;
}

function StatusIcon({ status }: { status: string }) {
  if (status === "completed") return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
  if (status === "cancelled") return <XCircle className="h-3.5 w-3.5 text-destructive" />;
  if (status === "no_show") return <XCircle className="h-3.5 w-3.5 text-amber-500" />;
  return <Clock className="h-3.5 w-3.5 text-blue-400" />;
}

function TierBadge({ tier, pulse }: { tier: string; pulse?: boolean }) {
  const color = TIER_COLOR[tier] || "#6B7280";
  return (
    <span
      className={cn("px-2.5 py-0.5 rounded-full text-xs font-semibold", pulse && tier === "critical" && "animate-pulse")}
      style={{ backgroundColor: `${color}25`, color }}
    >
      {TIER_LABEL[tier] || tier}
    </span>
  );
}

function WrsTrendIcon({ history }: { history: RiskScoreEntry[] }) {
  if (history.length < 2) return <Minus className="h-4 w-4 text-muted-foreground" />;
  const last = history[history.length - 1].wrs_score;
  const prev = history[history.length - 2].wrs_score;
  if (last < prev - 2) return <TrendingDown className="h-4 w-4 text-emerald-500" />;
  if (last > prev + 2) return <TrendingUp className="h-4 w-4 text-destructive" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

// ── custom chart tooltip ──────────────────────────────────────────────────────
function WrsTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const wrs = payload[0]?.value as number;
  const tier = wrs >= 85 ? "critical" : wrs >= 65 ? "red" : wrs >= 40 ? "amber" : "green";
  const color = TIER_COLOR[tier];
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 text-xs shadow-lg">
      <div className="font-medium text-muted-foreground mb-1">{label}</div>
      <div className="flex items-center gap-2">
        <span className="font-mono font-bold" style={{ color }}>WRS {wrs.toFixed(1)}</span>
        <TierBadge tier={tier} />
      </div>
    </div>
  );
}

const PHQ9_QUESTIONS = [
  "Little interest or pleasure",
  "Feeling down or hopeless",
  "Trouble sleeping",
  "Feeling tired or low energy",
  "Poor appetite or overeating",
  "Feeling bad about yourself",
  "Trouble concentrating",
  "Moving slowly or restless",
  "Thoughts of self-harm",
];

const GAD7_QUESTIONS = [
  "Feeling nervous or anxious",
  "Unable to stop worrying",
  "Worrying too much about things",
  "Trouble relaxing",
  "Restless — hard to sit still",
  "Becoming easily annoyed",
  "Feeling afraid something awful will happen",
];

// ── component ─────────────────────────────────────────────────────────────────
export default function CounselorStudent() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const { student_id } = useParams<{ student_id: string }>();
  const sidebarItems = user?.roles?.includes("unit_head") ? adminSidebarItems : counselorSidebarItems;

  // UI state only
  const [checkinOffset, setCheckinOffset] = useState(0);
  const [showOverride, setShowOverride] = useState(false);
  const [overrideTier, setOverrideTier] = useState<string>("");
  const [overrideJustification, setOverrideJustification] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [notesSaved, setNotesSaved] = useState(false);
  const [analysisTab, setAnalysisTab] = useState<"overview" | "phq9" | "gad7">("overview");

  // React Query hooks
  const { data: student, isLoading: studentLoading } = useStudent(student_id || "");
  const { data: riskScore } = useStudentRiskScore(student_id || "");
  const { data: wrsHistory } = useStudentWrsHistory(student_id || "");
  const { data: checkinsData, isLoading: checkinsLoading } = useStudentCheckins(student_id || "", 10, checkinOffset);
  const { data: appointmentsData } = useStudentAppointments(student_id || "", 50);
  const { data: crisisLogs } = useStudentCrisisLogs(student_id || "");

  const { mutateAsync: riskOverrideMutate, isPending: overriding } = useRiskOverride();

  const checkins = checkinsData?.data || [];
  const checkinTotal = checkinsData?.pagination?.total || 0;
  const appointments = appointmentsData?.data || [];
  const crisisLogsData = crisisLogs || [];
  const loading = studentLoading;
  const error = null;

  const currentTier = riskScore?.override?.override_tier || riskScore?.current?.tier || "green";
  const wrsScore = riskScore?.current?.wrs_score ?? 0;
  const tierColor = TIER_COLOR[currentTier] || "#6B7280";
  const historyData = wrsHistory || [];

  // Build chart data — downsample if > 60 points for readability
  const chartData = useMemo(() => {
    const pts = historyData.map((s) => ({
      date: new Date(s.computed_at).toLocaleDateString("en-GB", { month: "short", day: "numeric" }),
      wrs: parseFloat(s.wrs_score.toFixed(1)),
      tier: s.tier,
    }));
    if (pts.length <= 60) return pts;
    const step = Math.ceil(pts.length / 60);
    return pts.filter((_, i) => i % step === 0);
  }, [historyData]);

  const wrsImprovedPct = useMemo(() => {
    if (historyData.length < 2) return null;
    const first = historyData[0].wrs_score;
    const last = historyData[historyData.length - 1].wrs_score;
    return ((first - last) / first) * 100; // positive = improvement
  }, [historyData]);

  // ── Session analysis computed data ────────────────────────────────────────
  const allCheckinsForAnalysis = useStudentCheckins(student_id || "", 200, 0);
  const allCheckins: CheckinRecord[] = allCheckinsForAnalysis.data?.data || [];

  const phq9QuestionAverages = useMemo(() => {
    const phq9s = allCheckins.filter((c) => c.type === "phq9" && c.responses);
    if (phq9s.length === 0) return [];
    return PHQ9_QUESTIONS.map((label, i) => {
      const key = `q${i + 1}`;
      const vals = phq9s.map((c) => c.responses[key] ?? 0);
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      return { label, avg: parseFloat(avg.toFixed(2)), max: 3 };
    });
  }, [allCheckins]);

  const gad7QuestionAverages = useMemo(() => {
    const gad7s = allCheckins.filter((c) => c.type === "gad7" && c.responses);
    if (gad7s.length === 0) return [];
    return GAD7_QUESTIONS.map((label, i) => {
      const key = `q${i + 1}`;
      const vals = gad7s.map((c) => c.responses[key] ?? 0);
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      return { label, avg: parseFloat(avg.toFixed(2)), max: 3 };
    });
  }, [allCheckins]);

  const sessionStats = useMemo(() => {
    const completed = appointments.filter((a) => a.status === "completed").length;
    const cancelled = appointments.filter((a) => a.status === "cancelled").length;
    const noShow = appointments.filter((a) => a.status === "no_show").length;
    const pending = appointments.filter((a) => a.status === "pending" || a.status === "confirmed").length;
    const total = appointments.length;
    const attendanceRate = total > 0 ? Math.round((completed / total) * 100) : null;
    return { completed, cancelled, noShow, pending, total, attendanceRate };
  }, [appointments]);

  const checkinFrequency = useMemo(() => {
    if (allCheckins.length < 2) return null;
    const sorted = [...allCheckins].sort(
      (a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()
    );
    const first = new Date(sorted[0].submitted_at);
    const last = new Date(sorted[sorted.length - 1].submitted_at);
    const daySpan = Math.max(1, (last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24));
    const perWeek = (allCheckins.length / daySpan) * 7;
    return parseFloat(perWeek.toFixed(1));
  }, [allCheckins]);

  const handleSaveNotes = () => {
    setNotesSaved(true);
    toast.success("Clinical notes saved locally");
    setTimeout(() => setNotesSaved(false), 2000);
  };

  const handleOverride = async () => {
    if (!student_id || !overrideTier || !overrideJustification.trim()) {
      toast.error("Select a tier and provide justification");
      return;
    }
    try {
      await riskOverrideMutate({
        student_id,
        override_tier: overrideTier as any,
        justification: overrideJustification.trim(),
      });
      toast.success("Risk tier overridden");
      setShowOverride(false);
      setOverrideJustification("");
    } catch {
      toast.error("Failed to override tier");
    }
  };

  if (loading) {
    return (
      <AppShell items={sidebarItems}>
        <div className="p-8 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-2xl animate-pulse" />
          ))}
        </div>
      </AppShell>
    );
  }

  if (error || !student) {
    return (
      <AppShell items={sidebarItems}>
        <div className="p-8 text-center text-destructive">{error || "Student not found"}</div>
      </AppShell>
    );
  }

  return (
    <AppShell items={sidebarItems}>
      {/* Header */}
      <div className="flex items-center justify-between py-4 md:h-16 px-4 md:px-8 border-b border-border bg-background/60 backdrop-blur-sm sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Button onClick={() => navigate(-1)} variant="ghost" size="icon" className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-lg md:text-xl font-bold">{student.full_name}</h1>
              <TierBadge tier={currentTier} pulse />
              {student.crisis_flag && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-destructive/15 text-destructive animate-pulse">
                  CRISIS
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {student.student_id} · {student.class_level || "—"} · {student.faculty || "—"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button
            variant="ghost" size="icon"
            onClick={() => { logout(); navigate("/login"); }}
            className="md:hidden rounded-full h-9 w-9"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <CrisisBanner />

      <div className="p-4 md:p-8 space-y-6">

        {/* ── WRS Timeline Chart ─────────────────────────────────────────────── */}
        <div className="glass border border-border rounded-3xl p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-6">
            <div>
              <h2 className="font-display text-xl font-bold">Wellness Risk Score Timeline</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Full semester WRS trajectory from all PHQ-9 and GAD-7 assessments</p>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <div className="text-right">
                <div className="font-display text-3xl font-bold tabular-nums" style={{ color: tierColor }}>
                  {formatWRS(wrsScore)}
                </div>
                <div className="text-xs text-muted-foreground">Current WRS</div>
              </div>
              {wrsImprovedPct !== null && (
                <div className={cn(
                  "flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium",
                  wrsImprovedPct > 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive"
                )}>
                  {wrsImprovedPct > 0
                    ? <TrendingDown className="h-4 w-4" />
                    : <TrendingUp className="h-4 w-4" />
                  }
                  {Math.abs(wrsImprovedPct).toFixed(1)}%
                  <span className="text-xs opacity-70">{wrsImprovedPct > 0 ? "improvement" : "increase"}</span>
                </div>
              )}
            </div>
          </div>

          {chartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center bg-muted/20 rounded-2xl">
              <div className="text-center">
                <Activity className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No risk score history yet</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="wrsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={tierColor} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={tierColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip content={<WrsTooltip />} />
                <ReferenceLine y={40} stroke="#FF8C42" strokeDasharray="3 3" strokeOpacity={0.5} label={{ value: "Amber", position: "right", fontSize: 9, fill: "#FF8C42" }} />
                <ReferenceLine y={65} stroke="#FF4560" strokeDasharray="3 3" strokeOpacity={0.5} label={{ value: "Red", position: "right", fontSize: 9, fill: "#FF4560" }} />
                <ReferenceLine y={85} stroke="#B00020" strokeDasharray="3 3" strokeOpacity={0.5} label={{ value: "Critical", position: "right", fontSize: 9, fill: "#B00020" }} />
                <Area
                  type="monotone" dataKey="wrs"
                  stroke={tierColor} strokeWidth={2}
                  fill="url(#wrsGrad)"
                  dot={false} activeDot={{ r: 4, fill: tierColor }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ── Top row: Profile + Risk Status ──────────────────────────────────── */}
        <div className="grid md:grid-cols-2 gap-6">

          {/* Student Profile */}
          <div className="glass border border-border rounded-3xl p-6 space-y-5">
            <h2 className="font-display text-lg font-bold">Student Profile</h2>

            <div className="space-y-3 text-sm">
              {[
                { icon: User, label: "Full Name", value: student.full_name },
                { icon: GraduationCap, label: "Student ID", value: student.student_id },
                { icon: GraduationCap, label: "Class Level", value: student.class_level || "—" },
                { icon: GraduationCap, label: "Faculty", value: student.faculty || "—" },
                { icon: Mail, label: "Email", value: student.email },
                { icon: User, label: "Assigned Counsellor", value: student.guidance_counselor || "—" },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 flex justify-between items-center">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium text-right max-w-[55%] truncate">{value}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Emergency Contact */}
            {(student.emergency_contact || student.emergency_phone) && (
              <div className="border-t border-border pt-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Emergency Contact</div>
                <div className="space-y-2 text-sm">
                  {student.emergency_contact && (
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{student.emergency_contact}</span>
                    </div>
                  )}
                  {student.emergency_phone && (
                    <a
                      href={`tel:${student.emergency_phone}`}
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      <span>{student.emergency_phone}</span>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Risk Status + Override */}
          <div className="glass border border-border rounded-3xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">Risk Status</h2>
              <Button
                variant="outline" size="sm"
                onClick={() => { setShowOverride(!showOverride); setOverrideTier(currentTier); }}
                className="h-8 text-xs gap-1.5"
              >
                <Edit3 className="h-3 w-3" />
                Override Tier
              </Button>
            </div>

            {/* Big WRS display */}
            <div className="flex items-center gap-4 p-4 rounded-2xl" style={{ backgroundColor: `${tierColor}10` }}>
              <div className="h-16 w-16 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${tierColor}20` }}>
                <Activity className="h-7 w-7" style={{ color: tierColor }} />
              </div>
              <div>
                <div className="font-display text-4xl font-bold tabular-nums" style={{ color: tierColor }}>
                  {formatWRS(wrsScore)}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <TierBadge tier={currentTier} pulse />
                  <WrsTrendIcon history={historyData} />
                </div>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last assessment</span>
                <span className="font-medium">
                  {riskScore?.current?.computed_at
                    ? new Date(riskScore.current.computed_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total assessments</span>
                <span className="font-medium">{historyData.length}</span>
              </div>
              {riskScore?.override && (
                <div className="pt-2 border-t border-border">
                  <div className="text-xs text-amber-500 font-medium mb-1">⚠ Tier manually overridden</div>
                  <div className="text-xs text-muted-foreground italic">
                    "{riskScore.override.justification}"
                  </div>
                </div>
              )}
            </div>

            {/* Override panel */}
            {showOverride && (
              <div className="border-t border-border pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Override Tier</span>
                  <button onClick={() => setShowOverride(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {["green", "amber", "red", "critical"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setOverrideTier(t)}
                      className={cn(
                        "py-1.5 rounded-lg text-xs font-semibold border transition",
                        overrideTier === t ? "border-2" : "border-border opacity-60 hover:opacity-100"
                      )}
                      style={overrideTier === t ? { borderColor: TIER_COLOR[t], color: TIER_COLOR[t], backgroundColor: `${TIER_COLOR[t]}15` } : {}}
                    >
                      {TIER_LABEL[t]}
                    </button>
                  ))}
                </div>
                <Textarea
                  placeholder="Clinical justification for this override..."
                  value={overrideJustification}
                  onChange={(e) => setOverrideJustification(e.target.value)}
                  rows={2}
                  className="resize-none text-sm"
                />
                <Button onClick={handleOverride} disabled={overriding} size="sm" className="w-full gradient-primary text-primary-foreground border-0">
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                  {overriding ? "Saving..." : "Save Override"}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* ── Check-in History ──────────────────────────────────────────────── */}
        <div className="glass border border-border rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-lg font-bold">Check-in History</h2>
              <p className="text-xs text-muted-foreground">{checkinTotal} total submissions</p>
            </div>
            <ClipboardList className="h-5 w-5 text-muted-foreground" />
          </div>
          {checkins.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">No check-ins recorded yet.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                    <tr>
                      <th className="text-left py-2 pr-4">Date</th>
                      <th className="text-left py-2 pr-4">Type</th>
                      <th className="text-left py-2 pr-4">Raw score</th>
                      <th className="text-left py-2 pr-4">WRS</th>
                      <th className="text-left py-2">Tier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {checkins.map((c) => {
                      const wrs = checkinWrs(c);
                      const color = wrs !== null ? colorFromWrs(wrs) : "#6B7280";
                      const tier = wrs !== null
                        ? wrs >= 85 ? "critical" : wrs >= 65 ? "red" : wrs >= 40 ? "amber" : "green"
                        : null;
                      return (
                        <tr key={c.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                          <td className="py-2.5 pr-4 text-muted-foreground">
                            {new Date(c.submitted_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          </td>
                          <td className="py-2.5 pr-4 font-medium">{typeLabel(c.type)}</td>
                          <td className="py-2.5 pr-4 font-mono text-sm">{c.score !== null ? c.score : "—"}</td>
                          <td className="py-2.5 pr-4">
                            {wrs !== null ? (
                              <span className="font-mono text-sm font-medium" style={{ color }}>{wrs}</span>
                            ) : "—"}
                          </td>
                          <td className="py-2.5">
                            {tier ? <TierBadge tier={tier} /> : <span className="text-muted-foreground text-xs">N/A</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {checkinTotal > 10 && (
                <div className="flex justify-between items-center mt-4 text-xs text-muted-foreground">
                  <span>Showing {checkinOffset + 1}–{Math.min(checkinOffset + 10, checkinTotal)} of {checkinTotal}</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={checkinOffset === 0}
                      onClick={() => setCheckinOffset(Math.max(0, checkinOffset - 10))}>Previous</Button>
                    <Button size="sm" variant="outline" disabled={checkinOffset + 10 >= checkinTotal}
                      onClick={() => setCheckinOffset(checkinOffset + 10)}>Next</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Appointments + Crisis Logs ────────────────────────────────────── */}
        <div className="grid md:grid-cols-2 gap-6">

          {/* Appointments */}
          <div className="glass border border-border rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-bold">Sessions</h2>
              <Calendar className="h-5 w-5 text-muted-foreground" />
            </div>
            {appointments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No sessions recorded.</p>
            ) : (
              <div className="space-y-2">
                {appointments.map((a) => {
                  const dt = new Date(a.start_time);
                  return (
                    <div key={a.id} className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border",
                      a.is_crisis ? "border-destructive/30 bg-destructive/5" : "border-border bg-muted/20"
                    )}>
                      <StatusIcon status={a.status} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium">
                          {dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          {" · "}
                          {dt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground capitalize">{a.status.replace("_", " ")}</span>
                          {a.is_crisis && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-destructive/15 text-destructive font-semibold">CRISIS</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Crisis Logs */}
          <div className="glass border border-border rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-bold">Crisis Logs</h2>
              <ShieldAlert className="h-5 w-5 text-muted-foreground" />
            </div>
            {crisisLogsData.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6">
                <CheckCircle2 className="h-8 w-8 text-emerald-500/50" />
                <p className="text-sm text-muted-foreground">No crisis events recorded.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {crisisLogsData.map((log: any) => {
                  const sevColor = log.severity_level === "high"
                    ? "#B00020" : log.severity_level === "medium"
                    ? "#FF8C42" : "#FF4560";
                  return (
                    <div key={log.id} className="p-3 rounded-xl border border-border bg-muted/20 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold capitalize px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: `${sevColor}20`, color: sevColor }}>
                          {log.severity_level} severity
                        </span>
                        {log.resolved
                          ? <span className="text-xs text-emerald-500 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Resolved</span>
                          : <span className="text-xs text-destructive flex items-center gap-1 animate-pulse"><AlertTriangle className="h-3 w-3" /> Unresolved</span>
                        }
                      </div>
                      {log.action_taken && (
                        <p className="text-xs text-muted-foreground leading-snug">{log.action_taken}</p>
                      )}
                      <div className="text-[10px] text-muted-foreground">
                        {new Date(log.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        {log.resolved_at && ` → resolved ${new Date(log.resolved_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Session Analysis ───────────────────────────────────────────────── */}
        <div className="glass border border-border rounded-3xl p-6 space-y-5">
          <div className="flex items-center gap-3">
            <Brain className="h-5 w-5 text-primary" />
            <div>
              <h2 className="font-display text-lg font-bold">Session Analysis</h2>
              <p className="text-xs text-muted-foreground">Deep clinical breakdown of check-in patterns and session outcomes</p>
            </div>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-2 bg-muted/40 p-1 rounded-xl w-fit">
            {(["overview", "phq9", "gad7"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setAnalysisTab(tab)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-sm font-medium transition",
                  analysisTab === tab ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab === "overview" ? "Overview" : tab === "phq9" ? "PHQ-9" : "GAD-7"}
              </button>
            ))}
          </div>

          {/* Overview tab */}
          {analysisTab === "overview" && (
            <div className="space-y-5">
              {/* Session attendance summary */}
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5" /> Session Attendance
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Completed", value: sessionStats.completed, color: "#A8FF3E" },
                    { label: "Pending", value: sessionStats.pending, color: "#60a5fa" },
                    { label: "Cancelled", value: sessionStats.cancelled, color: "#FF8C42" },
                    { label: "No-show", value: sessionStats.noShow, color: "#FF4560" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="rounded-xl border border-border bg-muted/20 p-3 text-center">
                      <div className="font-display text-2xl font-bold tabular-nums" style={{ color }}>{value}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
                    </div>
                  ))}
                </div>
                {sessionStats.attendanceRate !== null && (
                  <div className="mt-3 flex items-center gap-2 text-sm">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${sessionStats.attendanceRate}%`, backgroundColor: sessionStats.attendanceRate >= 70 ? "#A8FF3E" : sessionStats.attendanceRate >= 40 ? "#FF8C42" : "#FF4560" }}
                      />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground shrink-0">{sessionStats.attendanceRate}% attendance</span>
                  </div>
                )}
              </div>

              {/* Check-in frequency + WRS stats */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Activity className="h-3.5 w-3.5" /> Check-in Frequency
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="font-display text-3xl font-bold tabular-nums">
                      {checkinFrequency ?? "—"}
                    </div>
                    {checkinFrequency && <div className="text-sm text-muted-foreground mb-1">per week</div>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {allCheckins.length} total submissions
                    {checkinFrequency && checkinFrequency >= 2
                      ? " · Regular engagement"
                      : checkinFrequency
                      ? " · Infrequent — consider follow-up"
                      : ""}
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <BarChart2 className="h-3.5 w-3.5" /> WRS Summary
                  </div>
                  {historyData.length > 0 ? (
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Current</span>
                        <span className="font-mono font-medium" style={{ color: tierColor }}>{wrsScore.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Baseline</span>
                        <span className="font-mono">{historyData[0].wrs_score.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Peak</span>
                        <span className="font-mono text-destructive">{Math.max(...historyData.map((h) => h.wrs_score)).toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Lowest</span>
                        <span className="font-mono text-emerald-500">{Math.min(...historyData.map((h) => h.wrs_score)).toFixed(1)}</span>
                      </div>
                      {wrsImprovedPct !== null && (
                        <div className="flex justify-between pt-1 border-t border-border">
                          <span className="text-muted-foreground">Overall change</span>
                          <span className={cn("font-medium", wrsImprovedPct > 0 ? "text-emerald-500" : "text-destructive")}>
                            {wrsImprovedPct > 0 ? "▼" : "▲"} {Math.abs(wrsImprovedPct).toFixed(1)}%
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">No WRS history</div>
                  )}
                </div>
              </div>

              {/* Crisis summary */}
              {crisisLogsData.length > 0 && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-destructive flex items-center gap-2">
                    <ShieldAlert className="h-3.5 w-3.5" /> Crisis Risk Summary
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <div className="font-display text-xl font-bold text-destructive">{crisisLogsData.length}</div>
                      <div className="text-xs text-muted-foreground">Total events</div>
                    </div>
                    <div>
                      <div className="font-display text-xl font-bold text-amber-500">
                        {crisisLogsData.filter((l: any) => !l.resolved).length}
                      </div>
                      <div className="text-xs text-muted-foreground">Unresolved</div>
                    </div>
                    <div>
                      <div className="font-display text-xl font-bold text-emerald-500">
                        {crisisLogsData.filter((l: any) => l.resolved).length}
                      </div>
                      <div className="text-xs text-muted-foreground">Resolved</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PHQ-9 tab */}
          {analysisTab === "phq9" && (
            <div className="space-y-4">
              {phq9QuestionAverages.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">No PHQ-9 data yet</div>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">
                    Average response per question across {allCheckins.filter((c) => c.type === "phq9").length} PHQ-9 submission(s).
                    Score 0 = Not at all · 1 = Several days · 2 = More than half · 3 = Nearly every day.
                  </p>
                  <div className="space-y-3">
                    {phq9QuestionAverages.map(({ label, avg }) => {
                      const pct = (avg / 3) * 100;
                      const barColor = avg >= 2 ? "#FF4560" : avg >= 1 ? "#FF8C42" : "#A8FF3E";
                      return (
                        <div key={label} className="space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground truncate max-w-[70%]">{label}</span>
                            <span className="font-mono font-medium" style={{ color: barColor }}>{avg.toFixed(1)}</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${pct}%`, backgroundColor: barColor }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="rounded-xl border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Highest concern: </span>
                    {phq9QuestionAverages.sort((a, b) => b.avg - a.avg)[0]?.label} (avg {phq9QuestionAverages.sort((a, b) => b.avg - a.avg)[0]?.avg.toFixed(1)}/3)
                  </div>
                </>
              )}
            </div>
          )}

          {/* GAD-7 tab */}
          {analysisTab === "gad7" && (
            <div className="space-y-4">
              {gad7QuestionAverages.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">No GAD-7 data yet</div>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">
                    Average response per question across {allCheckins.filter((c) => c.type === "gad7").length} GAD-7 submission(s).
                    Score 0 = Not at all · 1 = Several days · 2 = More than half · 3 = Nearly every day.
                  </p>
                  <div className="space-y-3">
                    {gad7QuestionAverages.map(({ label, avg }) => {
                      const pct = (avg / 3) * 100;
                      const barColor = avg >= 2 ? "#FF4560" : avg >= 1 ? "#FF8C42" : "#A8FF3E";
                      return (
                        <div key={label} className="space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground truncate max-w-[70%]">{label}</span>
                            <span className="font-mono font-medium" style={{ color: barColor }}>{avg.toFixed(1)}</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${pct}%`, backgroundColor: barColor }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="rounded-xl border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Highest concern: </span>
                    {gad7QuestionAverages.sort((a, b) => b.avg - a.avg)[0]?.label} (avg {gad7QuestionAverages.sort((a, b) => b.avg - a.avg)[0]?.avg.toFixed(1)}/3)
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Clinical Notes ─────────────────────────────────────────────────── */}
        <div className="glass border border-border rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-primary" />
            <div>
              <h2 className="font-display text-lg font-bold">Clinical Notes</h2>
              <p className="text-xs text-muted-foreground">Private observations and session notes for your reference</p>
            </div>
          </div>
          <Textarea
            value={clinicalNotes}
            onChange={(e) => { setClinicalNotes(e.target.value); setNotesSaved(false); }}
            rows={6}
            placeholder={`Add clinical observations for ${student?.full_name || "this student"}…\n\nInclude: presenting concerns, session progress, risk factors observed, interventions tried, follow-up actions needed.`}
            className="resize-none text-sm leading-relaxed"
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Notes are stored locally in this session.</p>
            <Button
              onClick={handleSaveNotes}
              size="sm"
              variant="outline"
              className={cn("gap-1.5", notesSaved && "border-emerald-500 text-emerald-500")}
              disabled={!clinicalNotes.trim()}
            >
              {notesSaved ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
              {notesSaved ? "Saved" : "Save Notes"}
            </Button>
          </div>
        </div>

      </div>
    </AppShell>
  );
}
