import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { LayoutDashboard, Users, Calendar, Search, ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle, CalendarCheck, Activity, MoreHorizontal, Video, XCircle, Clock, FileText, LogOut, CheckCircle, ChevronLeft, ChevronRight, RefreshCw, LayoutGrid } from "lucide-react";
import { AppShell } from "@/components/AppSidebar";
import { counselorSidebarItems } from "@/data/sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { tierFromWrs, colorFromWrs, RiskTier } from "@/lib/wrs";
import { cn, formatWRS } from "@/lib/utils";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from "recharts";
import { toast } from "sonner";
import type { PaginationInfo } from "@/api/types";
import { PsychologistOnboardingSlides } from "@/components/PsychologistOnboardingSlides";
import { NeonSpinner } from "@/components/NeonSpinner";
import {
  useStudents,
  useRiskAlerts,
  useAppointments,
  useRiskScoreCohort,
  useRealAnalytics,
} from "@/hooks/queries";
import {
  useUpdateAppointment,
  useRiskOverride,
} from "@/hooks/mutations";
import type { Appointment } from "@/api/appointments";
import type { RiskTier as RiskTierType } from "@/api/riskScores";
import { NotificationBell } from "@/components/NotificationBell";

const TIERS = ["All", "Green", "Amber", "Red", "Critical"] as const;
const SESSION_FILTERS = ["All", "Upcoming", "Completed", "Cancelled"] as const;

export default function CounselorDashboard() {
  const { user, logout } = useAuth();
  const [filter, setFilter] = useState<typeof TIERS[number]>("All");
  const [sessionFilter, setSessionFilter] = useState<typeof SESSION_FILTERS[number]>("All");
  const [facultyFilter, setFacultyFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortDesc, setSortDesc] = useState(true);
  const location = useLocation();
  const currentView = location.pathname === "/counselor/sessions" ? "schedule" : "dashboard";

  const [offset, setOffset] = useState(0);
  const [rosterPagination, setRosterPagination] = useState({ limit: 10, offset: 0 });
  const [overrides, setOverrides] = useState<Record<string, RiskTier>>({});
  const [overrideModal, setOverrideModal] = useState<{ id: string; name: string; currentTier: string; newTier: string; justification: string } | null>(null);
  const [refreshingAppointments, setRefreshingAppointments] = useState(false);
  const [calendarView, setCalendarView] = useState(false);
  const [calWeekOffset, setCalWeekOffset] = useState(0);
  const [tierModal, setTierModal] = useState<{ tier: string; students: any[]; loading?: boolean } | null>(null);
  const tierModalRequestRef = useRef<string | null>(null);
  const navigate = useNavigate();

  // React Query hooks - filter by assigned psychologist
  const { data: studentsData, isLoading: studentsLoading } = useStudents(
    user?.sub ? { assigned_psychologist_id: user.sub } : {},
    10,
    0
  );
  const { data: alertsData, isLoading: alertsLoading } = useRiskAlerts(200, 0, null);
  const { data: appointmentsData, isLoading: appointmentsLoading, refetch: refetchAppointments } = useAppointments({}, 10, offset);
  const { data: cohortData } = useRiskScoreCohort();
  const { data: analyticsData, isLoading: analyticsLoading, error: analyticsError } = useRealAnalytics(7);

  const { mutateAsync: updateAppointmentMutate } = useUpdateAppointment();
  const { mutateAsync: riskOverrideMutate } = useRiskOverride();

  // Auto-refresh appointments every 30 seconds on Sessions page
  useEffect(() => {
    if (currentView === "schedule") {
      const interval = setInterval(() => {
        refetchAppointments();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [currentView, refetchAppointments]);

  const openTierModal = async (tierName: string) => {
    const tierLower = tierName.toLowerCase() as RiskTierType;
    tierModalRequestRef.current = tierName;
    const cached = (alertsData?.data || []).filter(a => (a.tier || "").toLowerCase() === tierLower);
    setTierModal({ tier: tierName, students: cached, loading: true });
    try {
      // Note: using current alertsData filtered by tier since we already fetched 200
      const result = (alertsData?.data || []).filter(a => (a.tier || "").toLowerCase() === tierLower);
      if (tierModalRequestRef.current === tierName) {
        setTierModal({ tier: tierName, students: result, loading: false });
      }
    } catch {
      toast.error(`Failed to load ${tierName} tier students`);
      if (tierModalRequestRef.current === tierName) {
        setTierModal(prev => prev ? { ...prev, loading: false } : null);
      }
    }
  };

  const students = studentsData?.data || [];
  const alerts = alertsData?.data || [];
  const cohort = cohortData || [];
  const appointments = appointmentsData?.data || [];
  const pagination = appointmentsData?.pagination;
  const totalStudents = studentsData?.pagination?.total || 0;
  const loading = studentsLoading || alertsLoading || appointmentsLoading;
  const error = null;
  const analytics = analyticsData?.charts;
  const insights = analyticsData?.insights || {};

  const colorFromTier = (t: string) => t === "Green" ? "#A8FF3E" : t === "Amber" ? "#FF8C42" : t === "Red" ? "#FF4560" : "#B00020";

  const activeHighRiskCount = useMemo(() => {
    return alerts.filter(a => {
      const tier = a.tier?.toLowerCase();
      return tier === "red" || tier === "critical";
    }).length;
  }, [alerts]);

  const tierData = useMemo(() => {
    // Count alerts by tier
    const tierCounts: { [key: string]: number } = {
      Green: 0,
      Amber: 0,
      Red: 0,
      Critical: 0
    };
    
    alerts.forEach((alert) => {
      const tier = alert.tier?.toLowerCase();
      if (tier === "green") tierCounts.Green++;
      else if (tier === "amber") tierCounts.Amber++;
      else if (tier === "red") tierCounts.Red++;
      else if (tier === "critical") tierCounts.Critical++;
    });
    
    return [
      { name: "Green", value: tierCounts.Green, color: "#A8FF3E" },
      { name: "Amber", value: tierCounts.Amber, color: "#FF8C42" },
      { name: "Red", value: tierCounts.Red, color: "#FF4560" },
      { name: "Critical", value: tierCounts.Critical, color: "#B00020" },
    ];
  }, [alerts]);

  const avgCampusWrs = useMemo(() => {
    if (analytics?.avg_wrs_current) return formatWRS(analytics.avg_wrs_current);
    return formatWRS(alerts.reduce((acc, a) => acc + (a.wrs_score || 0), 0) / (alerts.length || 1));
  }, [analytics, alerts]);

  const wrsTrendData = useMemo(() => {
    if (analytics?.wrs_trend && analytics.wrs_trend.length > 0) {
      return analytics.wrs_trend.map((d: any) => ({
        day: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        wrs: d.avg_wrs,
        count: d.count,
      }));
    }
    return [];
  }, [analytics]);

  const riskDistributionData = useMemo(() => {
    if (analytics?.risk_distribution) {
      const rd = analytics.risk_distribution;
      return [
        { name: "Green", value: rd.green || 0, color: "#A8FF3E" },
        { name: "Amber", value: rd.amber || 0, color: "#FF8C42" },
        { name: "Red", value: rd.red || 0, color: "#FF4560" },
        { name: "Critical", value: rd.critical || 0, color: "#B00020" }
      ].filter(t => t.value > 0);
    }
    return tierData;
  }, [analytics, tierData]);

  // Check-in volume by assessment type (last 14 days)
  const checkinVolumeData = useMemo(() => {
    if (analytics?.checkin_volume && analytics.checkin_volume.length > 0) {
      return analytics.checkin_volume.slice(-14).map((d: any) => ({
        ...d,
        day: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      }));
    }
    return [];
  }, [analytics]);

  const appointmentStats = useMemo(() => analytics?.appointment_stats || null, [analytics]);
  const weeklyEngagement = useMemo(() => analytics?.weekly_engagement || null, [analytics]);

  const kpis = [
    { label: "Total Students", value: loading ? "—" : totalStudents, icon: Users, action: () => { navigate("/counselor/students"); } },
    { label: "Active High-Risk Alerts", value: loading ? "—" : activeHighRiskCount, icon: AlertTriangle, danger: true, action: () => { navigate("/counselor/students"); setFilter("Critical"); } },
    { label: "Total Sessions", value: loading ? "—" : (pagination?.total || 0), icon: CalendarCheck, action: () => navigate("/counselor/sessions") },
    { label: "Avg Campus WRS", value: (loading || analyticsLoading) ? "—" : avgCampusWrs, icon: Activity, action: () => document.getElementById("analytics-section")?.scrollIntoView({ behavior: "smooth" }) },
  ];

  const pendingConfirmation = useMemo(() => {
    return appointments.filter(
      a => a.pending_approval === true && new Date(a.start_time) > new Date()
    );
  }, [appointments]);

  const filteredAppointments = useMemo(() => {
    let r = [...appointments];

    // Status Filter
    if (sessionFilter === "Upcoming") {
      r = r.filter(a => a.status === "booked" && new Date(a.start_time) > new Date());
    } else if (sessionFilter === "Completed") {
      r = r.filter(a => a.status === "completed");
    } else if (sessionFilter === "Cancelled") {
      r = r.filter(a => a.status === "cancelled");
    }

    // Search Filter
    if (search) {
      r = r.filter(a =>
        (a.student_full_name || "").toLowerCase().includes(search.toLowerCase()) ||
        (a.student_id || "").toLowerCase().includes(search.toLowerCase())
      );
    }
    return r;
  }, [appointments, sessionFilter, search]);

  const rows = useMemo(() => {
    let r = [...students];
    if (filter !== "All") {
      r = r.filter((s) => {
        const matchingAlert = alerts.find((a) => a.student_id === s.student_id);
        const tier = matchingAlert?.tier?.toLowerCase() || "green";
        return tier === filter.toLowerCase();
      });
    }
    if (facultyFilter) r = r.filter((s) => s.faculty === facultyFilter);
    if (search && currentView === "dashboard") {
      r = r.filter((s) => 
        (s.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
        String(s.student_id || "").toLowerCase().includes(search.toLowerCase())
      );
    }
    r.sort((a, b) => {
      const aAlert = alerts.find((al) => al.student_id === a.student_id);
      const bAlert = alerts.find((al) => al.student_id === b.student_id);
      const aWrs = aAlert?.wrs_score || 0;
      const bWrs = bAlert?.wrs_score || 0;
      return sortDesc ? bWrs - aWrs : aWrs - bWrs;
    });
    return r;
  }, [filter, facultyFilter, search, sortDesc, students, alerts, currentView]);

  const rosterPageRows = rows.slice(rosterPagination.offset, rosterPagination.offset + rosterPagination.limit);


  const handleAction = async (id: string, actionName: string) => {
    if (actionName === "join") return toast.success("Opening secure video meeting...");

    try {
      if (actionName === "complete") {
        await updateAppointmentMutate({ id, data: { status: "completed" } });
        toast.success("Session marked as complete");
      }
      if (actionName === "cancel") {
        await updateAppointmentMutate({ id, data: { status: "cancelled" } });
        toast.success("Session cancelled");
      }
    } catch (err) {
      toast.error(`Failed to ${actionName} session`);
    }
  };

  const handleOverrideSubmit = async () => {
    if (!overrideModal) return;
    if (overrideModal.justification.trim().length < 20) {
      toast.error("Please provide a detailed justification");
      return;
    }

    try {
      await riskOverrideMutate({
        student_id: overrideModal.id,
        override_tier: overrideModal.newTier.toLowerCase() as any,
        justification: overrideModal.justification
      });
      setOverrides((prev) => ({ ...prev, [overrideModal.id]: overrideModal.newTier as RiskTier }));
      toast.success(`Risk tier overridden for ${overrideModal.name}`);
      setOverrideModal(null);
    } catch (err) {
      toast.error("Failed to override risk tier. Please try again.");
      console.error("Override error:", err);
    }
  };

  return (
    <>
    <PsychologistOnboardingSlides />
    <AppShell items={counselorSidebarItems}>
      {/* Error Banner */}
      {analyticsError && (
        <div className="bg-warning/15 text-warning px-4 md:px-8 py-2 text-sm border-b border-warning/30 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> Analytics data unavailable. Showing cached data.
        </div>
      )}
      
      <div className="flex items-start md:items-center justify-between py-4 md:h-16 px-4 md:px-8 border-b border-border bg-background md:bg-background/60 md:backdrop-blur-sm sticky top-0 z-30">
        <h1 className="font-display text-lg md:text-xl font-bold">Welcome, {user?.name} 👋</h1>
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <NotificationBell />
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={() => { logout(); navigate("/login"); }} className="md:hidden rounded-full h-9 w-9">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="p-4 md:p-8 space-y-6">
        {/* KPIs — full width 4 cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {kpis.map((k) => {
            const Icon = k.icon;
            return (
              <button
                key={k.label}
                onClick={k.action}
                className={cn(
                  "surface-card surface-card-hover p-4 md:p-5 text-left transition",
                  k.danger && "border-destructive/30"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className={cn(
                    "h-8 w-8 md:h-10 md:w-10 rounded-lg md:rounded-xl flex items-center justify-center",
                    k.danger ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"
                  )}>
                    <Icon className="h-4 w-4 md:h-5 md:w-5" />
                  </div>
                </div>
                {loading && (k.value === "—" || k.value === 0) ? (
                  <div className="h-6 bg-muted rounded-lg mt-2 md:mt-3 animate-pulse" />
                ) : (
                  <div className={cn("font-display text-2xl md:text-3xl font-bold mt-2 md:mt-3 tabular-nums", k.danger && "text-destructive")}>
                    {k.value}
                  </div>
                )}
                <div className="text-[10px] md:text-xs text-muted-foreground mt-0.5 md:mt-1">{k.label}</div>
              </button>
            );
          })}
        </div>

        {currentView === "dashboard" ? (
          <div className="animate-fade-in">
            <div className="surface-card p-12 flex flex-col items-center justify-center text-center bg-primary/5 border-dashed border-2 border-primary/20 rounded-3xl">
              <div className="h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-6">
                <LayoutDashboard className="h-8 w-8" />
              </div>
              <h2 className="font-display text-2xl font-bold mb-3">Psychologist Dashboard</h2>
              <p className="text-muted-foreground text-sm max-w-md">
                Select a KPI above to manage students or sessions. Use the sidebar to navigate between your schedule and student roster.
              </p>
            </div>
          </div>
        ) : (
          <div className="surface-card p-4 md:p-6 animate-fade-in">
            {/* Pending confirmation requests */}
            {pendingConfirmation.length > 0 && (
              <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Bell className="h-4 w-4 text-amber-500" />
                  <span className="font-semibold text-sm text-amber-600 dark:text-amber-400">
                    {pendingConfirmation.length} session request{pendingConfirmation.length > 1 ? "s" : ""} awaiting your confirmation
                  </span>
                </div>
                <div className="space-y-2">
                  {pendingConfirmation.map((a) => (
                    <div key={a.id} className="flex items-center justify-between rounded-xl bg-background/60 px-3 py-2 text-sm">
                      <div>
                        <Link to={`/counselor/student/${a.student_id}`} className="font-medium hover:underline text-primary text-xs">
                          {a.student_full_name}
                        </Link>
                        <div className="text-xs text-muted-foreground">
                          {new Date(a.start_time).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                          {" · "}
                          {new Date(a.start_time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border border-emerald-500/20"
                          variant="outline"
                          onClick={async () => {
                            try {
                              await updateAppointmentMutate({ id: a.id, data: { pending_approval: false } as any });
                              toast.success(`Session with ${a.student_full_name} confirmed`);
                            } catch { toast.error("Failed to confirm"); }
                          }}
                        >
                          <CheckCircle className="h-3.5 w-3.5 mr-1" /> Confirm
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-destructive hover:bg-destructive/10"
                          onClick={async () => {
                            try {
                              await updateAppointmentMutate({ id: a.id, data: { status: "cancelled" } });
                              toast.success("Session request declined");
                            } catch { toast.error("Failed to decline"); }
                          }}
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" /> Decline
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
              <div>
                <h2 className="font-display text-lg md:text-2xl font-bold">Session Schedule</h2>
                <p className="text-sm text-muted-foreground mt-1">Manage and track your appointments</p>
              </div>
              
              <div className="flex flex-col md:flex-row items-center gap-3">
                <Button
                  onClick={() => setCalendarView(v => !v)}
                  variant="outline"
                  size="sm"
                  className="h-10"
                >
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  {calendarView ? "List view" : "Calendar view"}
                </Button>
                <Button
                  onClick={async () => {
                    setRefreshingAppointments(true);
                    try {
                      await refetchAppointments();
                      toast.success("Sessions refreshed");
                    } catch (err) {
                      toast.error("Failed to refresh sessions");
                    } finally {
                      setRefreshingAppointments(false);
                    }
                  }}
                  variant="outline"
                  size="sm"
                  disabled={refreshingAppointments}
                  className="h-10"
                >
                  <RefreshCw className={cn("h-4 w-4 mr-2", refreshingAppointments && "animate-spin")} />
                  Refresh
                </Button>
                <div className="flex p-1 rounded-full bg-muted w-full md:w-auto">
                  {SESSION_FILTERS.map((f) => (
                    <button
                      key={f}
                      onClick={() => setSessionFilter(f)}
                      className={cn(
                        "px-4 py-1.5 text-xs font-semibold rounded-full transition",
                        sessionFilter === f ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search student or ID..."
                    className="pl-10 h-10 w-full"
                  />
                </div>
              </div>
            </div>

            {calendarView ? (
              (() => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const weekStart = new Date(today);
                weekStart.setDate(today.getDate() - today.getDay() + calWeekOffset * 7);
                const weekDays = Array.from({ length: 7 }, (_, i) => {
                  const d = new Date(weekStart);
                  d.setDate(weekStart.getDate() + i);
                  return d;
                });
                const hours = Array.from({ length: 9 }, (_, i) => i + 9); // 9am-5pm
                const apptsByDayHour = (day: Date, hour: number) =>
                  filteredAppointments.filter(a => {
                    const d = new Date(a.start_time);
                    return d.toDateString() === day.toDateString() && d.getHours() === hour;
                  });
                return (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <Button size="sm" variant="outline" onClick={() => setCalWeekOffset(o => o - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                      <span className="text-sm font-semibold">
                        {weekDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} – {weekDays[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                      <Button size="sm" variant="outline" onClick={() => setCalWeekOffset(o => o + 1)}><ChevronRight className="h-4 w-4" /></Button>
                    </div>
                    <div className="overflow-x-auto">
                      <div className="min-w-[700px]">
                        <div className="grid grid-cols-8 gap-0 border border-border rounded-xl overflow-hidden text-xs">
                          <div className="bg-muted/30 p-2 border-r border-border text-center text-muted-foreground font-medium">Time</div>
                          {weekDays.map(day => (
                            <div key={day.toDateString()} className={cn("bg-muted/30 p-2 text-center border-r last:border-r-0 border-border font-medium", day.toDateString() === new Date().toDateString() && "bg-primary/10")}>
                              <div>{day.toLocaleDateString("en-US", { weekday: "short" })}</div>
                              <div className="text-muted-foreground">{day.getDate()}</div>
                            </div>
                          ))}
                          {hours.map(hour => (
                            <>
                              <div key={`hour-${hour}`} className="border-t border-r border-border p-2 text-right text-muted-foreground bg-muted/10">
                                {hour === 12 ? "12 PM" : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                              </div>
                              {weekDays.map(day => {
                                const slotAppts = apptsByDayHour(day, hour);
                                return (
                                  <div key={day.toDateString() + hour} className={cn("border-t border-r last:border-r-0 border-border p-1 min-h-[48px]", day.toDateString() === new Date().toDateString() && "bg-primary/5")}>
                                    {slotAppts.map(a => (
                                      <Link key={a.id} to={`/counselor/student/${a.student_id}`} className={cn("block rounded px-1.5 py-1 mb-0.5 text-[10px] font-medium truncate", a.is_crisis ? "bg-destructive/15 text-destructive" : a.pending_approval ? "bg-amber-500/15 text-amber-600" : "bg-primary/15 text-primary")}>
                                        {a.student_full_name || a.student_id}
                                        {a.is_crisis && " 🔴"}
                                        {a.pending_approval && " ⏳"}
                                      </Link>
                                    ))}
                                  </div>
                                );
                              })}
                            </>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded bg-primary/30" /> Confirmed</div>
                      <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded bg-amber-500/30" /> ⏳ Pending confirmation</div>
                      <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded bg-destructive/30" /> 🔴 Crisis</div>
                    </div>
                  </div>
                );
              })()
            ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="text-left p-3">Date & Time</th>
                    <th className="text-left p-3">Student Info</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-right p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-border/60">
                        <td colSpan={4} className="p-4">
                          <div className="h-10 bg-muted rounded-xl animate-pulse" />
                        </td>
                      </tr>
                    ))
                  ) : filteredAppointments.length === 0 ? (
                    <tr><td colSpan={4} className="p-12 text-center text-muted-foreground">No sessions found matching your criteria.</td></tr>
                  ) : (
                    filteredAppointments.map((a, i) => (
                      <tr key={a.id} className={cn("border-b border-border/60 last:border-0 hover:bg-muted/30 transition", i % 2 === 0 && "bg-muted/10")}>
                        <td className="p-3">
                          <div className="flex flex-col">
                            <span className="font-semibold">{new Date(a.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(a.start_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - {new Date(a.end_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                            </span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <Link to={`/counselor/student/${a.student_id}`} className="font-medium hover:underline text-primary">
                                {a.student_full_name}
                              </Link>
                              {a.is_crisis && (
                                <span className="bg-destructive/15 text-destructive text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse">
                                  🔴 Crisis
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground font-mono">{a.student_id}</span>
                            {a.crisis_note && <span className="text-[10px] text-muted-foreground italic mt-0.5 max-w-xs truncate">{a.crisis_note}</span>}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col gap-1">
                            <span className={cn(
                              "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider w-fit",
                              a.status === "booked" ? "bg-primary/15 text-primary" :
                              a.status === "completed" ? "bg-success/15 text-success-foreground" :
                              a.status === "cancelled" ? "bg-muted text-muted-foreground" :
                              "bg-warning/15 text-warning-foreground"
                            )}>
                              {a.status.replace('_', ' ')}
                            </span>
                            {a.pending_approval && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[10px] font-medium w-fit">
                                ⏳ Awaiting confirmation
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-2">
                            {a.status === "booked" && (
                              <>
                                <Button size="sm" onClick={() => handleAction(a.id, "complete")} className="h-8 text-xs bg-[#A8FF3E] hover:bg-[#96e836] text-black font-semibold">
                                  <CheckCircle className="h-3.5 w-3.5 mr-1" /> Mark Complete
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => handleAction(a.id, "cancel")} className="h-8 text-xs text-destructive hover:bg-destructive/10">
                                  <XCircle className="h-3.5 w-3.5 mr-1" /> Cancel
                                </Button>
                              </>
                            )}
                            <Button size="sm" variant="secondary" onClick={() => navigate(`/counselor/session/${a.id}`)} className="h-8 text-xs">
                              View Session
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            )}

            {!calendarView && pagination && pagination.total > 10 && (
              <div className="flex justify-between items-center mt-6 pt-4 border-t border-border/60 text-xs text-muted-foreground">
                <div>
                  Showing {offset + 1}-{Math.min(offset + 10, pagination.total)} of {pagination.total} sessions
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={offset === 0 || loading} onClick={() => setOffset(Math.max(0, offset - 10))}>
                    <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                  </Button>
                  <Button size="sm" variant="outline" disabled={!pagination.has_next || loading} onClick={() => setOffset(offset + 10)}>
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Campus Analytics Section */}
      {currentView === "dashboard" && (
        <div id="analytics-section" className="px-4 md:px-8 pb-12 mt-8 pt-8 border-t border-border">
          <div className="mb-6">
            <h2 className="font-display text-2xl font-bold">Campus Analytics</h2>
            <p className="text-sm text-muted-foreground">Live wellness data — last 30 days unless noted.</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Chart 1 — WRS Trend (full width) */}
            <div className="lg:col-span-3 surface-card p-6 bg-card rounded-2xl">
              <div className="label-eyebrow mb-1">Campus WRS Trend</div>
              <div className="font-display text-lg font-bold mb-1">Average wellness risk score over time</div>
              <p className="text-xs text-muted-foreground mb-4">Each point is the average WRS across all assessments that day. Higher = higher risk.</p>
              {analyticsLoading ? (
                <div className="h-64 bg-muted rounded-lg animate-pulse" />
              ) : wrsTrendData.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-muted-foreground bg-muted/20 rounded-lg gap-2">
                  <Activity className="h-8 w-8 opacity-30" />
                  <span className="text-sm">No assessment data yet. Check-ins will populate this chart.</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={wrsTrendData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                    <defs>
                      <linearGradient id="wrsg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6C3FE8" stopOpacity={0.6} />
                        <stop offset="100%" stopColor="#6C3FE8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} tick={{ fontSize: 11 }} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} domain={[0, 100]} tickFormatter={(v) => `${v}`} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, color: "hsl(var(--foreground))" }}
                      itemStyle={{ color: "hsl(var(--foreground))" }}
                      formatter={(v: any, name: string) => [name === "wrs" ? `${v} / 100` : `${v}`, name === "wrs" ? "Avg WRS" : "Assessments"]}
                    />
                    <Area type="monotone" dataKey="wrs" stroke="#6C3FE8" strokeWidth={2.5} fill="url(#wrsg)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
              {insights?.summary && (
                <div className="mt-4 p-3 rounded-xl bg-primary/5 border border-primary/10 text-xs text-muted-foreground italic">
                  {insights.summary}
                  <div className="mt-1 text-[10px] text-muted-foreground/50 not-italic">Powered by AI ✨</div>
                </div>
              )}
            </div>

            {/* Chart 2 — Risk Distribution */}
            <div className="surface-card p-6 bg-card rounded-2xl">
              <div className="label-eyebrow mb-1">Risk distribution</div>
              <div className="font-display text-lg font-bold mb-1">Students by tier</div>
              <p className="text-xs text-muted-foreground mb-4">Latest risk score per student.</p>
              {analyticsLoading ? (
                <div className="h-56 bg-muted rounded-lg animate-pulse" />
              ) : riskDistributionData.length === 0 ? (
                <div className="h-56 flex items-center justify-center text-muted-foreground">No risk scores yet</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={riskDistributionData} dataKey="value" innerRadius={45} outerRadius={75} paddingAngle={3} onClick={(d: any) => openTierModal(d.name)} cursor="pointer">
                        {riskDistributionData.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, color: "hsl(var(--foreground))" }}
                        itemStyle={{ color: "hsl(var(--foreground))" }}
                        formatter={(v: any) => [`${v} students`, ""]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-xs mt-2">
                    {riskDistributionData.map((d) => (
                      <button key={d.name} onClick={() => openTierModal(d.name)} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ background: d.color }} />
                        <span>{d.name} <span className="font-semibold tabular-nums">({d.value})</span></span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Chart 3 — Assessment Volume by Type (stacked bar) */}
            <div className="lg:col-span-2 surface-card p-6 bg-card rounded-2xl">
              <div className="label-eyebrow mb-1">Assessment volume</div>
              <div className="font-display text-lg font-bold mb-1">PHQ-9, GAD-7 & Pulse — last 14 days</div>
              <p className="text-xs text-muted-foreground mb-4">Daily check-in count by assessment type. Shows student engagement over time.</p>
              {analyticsLoading ? (
                <div className="h-56 bg-muted rounded-lg animate-pulse" />
              ) : checkinVolumeData.length === 0 ? (
                <div className="h-56 flex flex-col items-center justify-center text-muted-foreground gap-2">
                  <Activity className="h-8 w-8 opacity-30" />
                  <span className="text-sm">No check-ins yet in the last 14 days</span>
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={checkinVolumeData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                      <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, color: "hsl(var(--foreground))" }}
                        itemStyle={{ color: "hsl(var(--foreground))" }}
                      />
                      <Bar dataKey="phq9" name="PHQ-9" stackId="a" fill="#6C3FE8" />
                      <Bar dataKey="gad7" name="GAD-7" stackId="a" fill="#FF8C42" />
                      <Bar dataKey="pulse" name="Pulse" stackId="a" fill="#A8FF3E" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex gap-4 text-xs mt-3 justify-center">
                    {[{ label: "PHQ-9", color: "#6C3FE8" }, { label: "GAD-7", color: "#FF8C42" }, { label: "Pulse", color: "#A8FF3E" }].map(({ label, color }) => (
                      <div key={label} className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-sm shrink-0" style={{ background: color }} />
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Chart 4 — Appointment Outcomes */}
            <div className="surface-card p-6 bg-card rounded-2xl">
              <div className="label-eyebrow mb-1">Appointment outcomes</div>
              <div className="font-display text-lg font-bold mb-1">Session completion — 30 days</div>
              <p className="text-xs text-muted-foreground mb-5">Track attendance and cancellation patterns.</p>
              {analyticsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map(i => <div key={i} className="h-10 bg-muted rounded-xl animate-pulse" />)}
                </div>
              ) : !appointmentStats ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">No session data yet</div>
              ) : (
                <div className="space-y-4">
                  {[
                    { label: "Completed", value: appointmentStats.completed, color: "#A8FF3E", total: appointmentStats.total },
                    { label: "Upcoming", value: appointmentStats.booked, color: "#6C3FE8", total: appointmentStats.total },
                    { label: "Cancelled", value: appointmentStats.cancelled, color: "#FF8C42", total: appointmentStats.total },
                    { label: "No-show", value: appointmentStats.no_show, color: "#FF4560", total: appointmentStats.total },
                  ].map(({ label, value, color, total }) => (
                    <div key={label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium">{label}</span>
                        <span className="tabular-nums font-semibold" style={{ color }}>{value} <span className="text-muted-foreground font-normal">/ {total}</span></span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: total ? `${(value / total) * 100}%` : "0%", background: color }} />
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-border flex justify-between text-xs text-muted-foreground">
                    <span>Completion rate</span>
                    <span className="font-bold text-foreground tabular-nums">{Math.round((appointmentStats.completion_rate || 0) * 100)}%</span>
                  </div>
                </div>
              )}
            </div>

            {/* Chart 5 — Student Engagement */}
            <div className="lg:col-span-2 surface-card p-6 bg-card rounded-2xl">
              <div className="label-eyebrow mb-1">Student engagement</div>
              <div className="font-display text-lg font-bold mb-1">7-day check-in rate</div>
              <p className="text-xs text-muted-foreground mb-5">How many registered students completed at least one check-in this week.</p>
              {analyticsLoading ? (
                <div className="h-32 bg-muted rounded-xl animate-pulse" />
              ) : !weeklyEngagement ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">No data yet</div>
              ) : (
                <div className="space-y-5">
                  <div className="flex items-end gap-4">
                    <div className="font-display text-5xl font-bold tabular-nums" style={{ color: weeklyEngagement.rate >= 0.5 ? "#A8FF3E" : weeklyEngagement.rate >= 0.25 ? "#FF8C42" : "#FF4560" }}>
                      {Math.round(weeklyEngagement.rate * 100)}%
                    </div>
                    <div className="text-sm text-muted-foreground pb-1">
                      <span className="font-semibold text-foreground tabular-nums">{weeklyEngagement.checked_in_7d}</span> of <span className="font-semibold text-foreground tabular-nums">{weeklyEngagement.total_students}</span> students active
                    </div>
                  </div>
                  <div className="h-3 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.round(weeklyEngagement.rate * 100)}%`,
                        background: weeklyEngagement.rate >= 0.5 ? "#A8FF3E" : weeklyEngagement.rate >= 0.25 ? "#FF8C42" : "#FF4560",
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3 pt-1">
                    {[
                      { label: "PHQ-9", value: weeklyEngagement.by_type?.phq9 || 0, color: "#6C3FE8" },
                      { label: "GAD-7", value: weeklyEngagement.by_type?.gad7 || 0, color: "#FF8C42" },
                      { label: "Pulse", value: weeklyEngagement.by_type?.pulse || 0, color: "#A8FF3E" },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="rounded-xl bg-muted/40 p-3 text-center">
                        <div className="font-display text-xl font-bold tabular-nums" style={{ color }}>{value}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{label} users</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tier students modal */}
      <Dialog open={!!tierModal} onOpenChange={(o) => !o && setTierModal(null)}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              <span style={{ color: tierModal ? colorFromWrs(tierModal.tier === "Green" ? 20 : tierModal.tier === "Amber" ? 50 : tierModal.tier === "Red" ? 75 : 90) : undefined }}>
                {tierModal?.tier}
              </span>{" "}
              tier students ({tierModal?.students.length ?? 0})
            </DialogTitle>
          </DialogHeader>
          {tierModal?.loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <NeonSpinner size={18} /> Loading students…
            </div>
          ) : tierModal?.students.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No students in this tier.</p>
          ) : (
            <div className="divide-y divide-border">
              {tierModal?.students.map((s: any) => {
                const color = colorFromWrs(s.wrs_score || 0);
                return (
                  <div key={s.student_id} className="flex items-center justify-between py-3">
                    <div>
                      <Link to={`/counselor/student/${s.student_id}`} onClick={() => setTierModal(null)} className="font-medium text-sm hover:underline text-primary">
                        {s.full_name || s.student_id}
                      </Link>
                      <div className="text-xs text-muted-foreground">{s.student_id} · {s.faculty || "—"}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-xs font-mono font-semibold" style={{ backgroundColor: `${color}25`, color }}>
                      {formatWRS(s.wrs_score)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!overrideModal} onOpenChange={(open) => !open && setOverrideModal(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Override Risk Tier</DialogTitle>
          </DialogHeader>
          {overrideModal && (
            <div className="grid gap-4 py-4">
              <div>
                <div className="text-sm font-medium mb-1">Student</div>
                <div className="text-sm text-muted-foreground">{overrideModal.name} · Current: <span className="font-semibold" style={{ color: colorFromTier(overrideModal.currentTier) }}>{overrideModal.currentTier}</span></div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">New Tier</div>
                <Select value={overrideModal.newTier} onValueChange={(v) => setOverrideModal({ ...overrideModal, newTier: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Green">Green</SelectItem>
                    <SelectItem value="Amber">Amber</SelectItem>
                    <SelectItem value="Red">Red</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="text-sm font-medium">Justification</div>
                  <div className="text-xs text-muted-foreground">{overrideModal.justification.length} / 20 min</div>
                </div>
                <Textarea
                  placeholder="Provide clinical justification for this override..."
                  value={overrideModal.justification}
                  onChange={(e) => setOverrideModal({ ...overrideModal, justification: e.target.value })}
                  className={cn(overrideModal.justification.length > 0 && overrideModal.justification.length < 20 && "border-destructive focus-visible:ring-destructive")}
                />
                {overrideModal.justification.length > 0 && overrideModal.justification.length < 20 && (
                  <div className="text-xs text-destructive">Please provide a detailed justification</div>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="ghost" onClick={() => setOverrideModal(null)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={handleOverrideSubmit} className="w-full bg-[#8b5cf6] hover:bg-[#7c3aed] text-white">
              Confirm Override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
    </>
  );
}

