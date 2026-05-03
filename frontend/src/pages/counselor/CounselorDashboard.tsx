import { listAppointments, updateAppointment, type Appointment } from "@/api/appointments";
import { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Calendar, Bell, Search, ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle, CalendarCheck, Activity, MoreHorizontal, Video, XCircle, Clock, FileText, LogOut, CheckCircle, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
// ... existing imports ...
import { AppShell } from "@/components/AppSidebar";
import { counselorSidebarItems } from "@/data/sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { FACULTY_WRS, tierFromWrs, colorFromWrs, RiskTier, trendData } from "@/data/mock";
import { getRiskAlerts, getRiskCohort, overrideRiskTier } from "@/api/riskScores";
import { listStudents } from "@/api/students";
import { cn, formatWRS } from "@/lib/utils";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from "recharts";
import { toast } from "sonner";
import type { PaginationInfo } from "@/api/types";

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
  
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [offset, setOffset] = useState(0);
  
  const [rosterPagination, setRosterPagination] = useState({ limit: 10, offset: 0 });
  const [overrides, setOverrides] = useState<Record<string, RiskTier>>({});
  const [overrideModal, setOverrideModal] = useState<{ id: string; name: string; currentTier: string; newTier: string; justification: string } | null>(null);
  const [refreshingAppointments, setRefreshingAppointments] = useState(false);
  const navigate = useNavigate();
  
  const [students, setStudents] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [cohort, setCohort] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalStudents, setTotalStudents] = useState(0);
  const [alertsOffset, setAlertsOffset] = useState(0);
  const [alertsPagination, setAlertsPagination] = useState<any>(null);

  const fetchAppointments = async (newOffset: number) => {
    try {
      setLoading(true);
      const data = await listAppointments(10, newOffset);
      setAppointments(data.data || []);
      setPagination(data.pagination);
      setOffset(newOffset);
    } catch (err) {
      setError("Failed to load sessions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        setError(null);
        const [studentsData, alertsData, appointmentsData, cohortData] = await Promise.all([
          listStudents(10, 0),
          getRiskAlerts(10, 0),
          listAppointments(10, 0),
          getRiskCohort()
        ]);
        setStudents(studentsData.data || []);
        setTotalStudents(studentsData.pagination?.total || 0);
        setAlerts(alertsData.data || []);
        setAlertsPagination(alertsData.pagination || {});
        setAppointments(appointmentsData.data || []);
        setPagination(appointmentsData.pagination);
        setCohort(cohortData || []);
      } catch (err) {
        setError("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();

    // Auto-refresh appointments every 30 seconds on Sessions page
    if (currentView === "schedule") {
      const interval = setInterval(() => {
        fetchAppointments(offset);
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [currentView, offset]);

  const colorFromTier = (t: string) => t === "Green" ? "#A8FF3E" : t === "Amber" ? "#FF8C42" : t === "Red" ? "#FF4560" : "#B00020";

  const activeHighRiskCount = useMemo(() => {
    return alerts.filter(a => {
      const tier = a.tier?.toLowerCase();
      return tier === "red" || tier === "critical";
    }).length;
  }, [alerts]);

  const trend = useMemo(() => trendData(7), []);

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
    return formatWRS(alerts.reduce((acc, a) => acc + (a.wrs_score || 0), 0) / (alerts.length || 1));
  }, [alerts]);

  const kpis = [
    { label: "Total Students", value: loading ? "—" : totalStudents, icon: Users, action: () => { navigate("/counselor/students"); } },
    { label: "Active High-Risk Alerts", value: loading ? "—" : activeHighRiskCount, icon: AlertTriangle, danger: true, action: () => { navigate("/counselor/students"); setFilter("Critical"); } },
    { label: "Total Sessions", value: loading ? "—" : (pagination?.total || 0), icon: CalendarCheck, action: () => navigate("/counselor/sessions") },
    { label: "Avg Campus WRS", value: loading ? "—" : avgCampusWrs, icon: Activity, action: () => toast.info("Data will be available after integration") },
  ];

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
        await updateAppointment(id, { status: "completed" });
        setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: "completed" } : a));
        toast.success("Session marked as complete");
      }
      if (actionName === "cancel") {
        await updateAppointment(id, { status: "cancelled" });
        setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: "cancelled" } : a));
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
      await overrideRiskTier(overrideModal.id, {
        override_tier: overrideModal.newTier,
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
    <AppShell items={counselorSidebarItems}>
      {/* Error Banner */}
      {error && (
        <div className="bg-destructive/15 text-destructive px-4 md:px-8 py-2 text-sm border-b border-destructive/30 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> {error}
        </div>
      )}
      
      <div className="flex items-start md:items-center justify-between py-4 md:h-16 px-4 md:px-8 border-b border-border bg-background md:bg-background/60 md:backdrop-blur-sm sticky top-0 z-30">
        <h1 className="font-display text-lg md:text-xl font-bold">Welcome, Dr. {user?.name} 👋</h1>
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full relative">
                <Bell className="h-4 w-4" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuItem className="flex-col items-start">
                <div className="text-sm font-medium">3 new High-Risk alerts</div>
                <div className="text-xs text-muted-foreground">Review priority students now</div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={() => logout()} className="md:hidden rounded-full h-9 w-9">
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
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
              <div>
                <h2 className="font-display text-lg md:text-2xl font-bold">Session Schedule</h2>
                <p className="text-sm text-muted-foreground mt-1">Manage and track your appointments</p>
              </div>
              
              <div className="flex flex-col md:flex-row items-center gap-3">
                <Button
                  onClick={async () => {
                    setRefreshingAppointments(true);
                    try {
                      await fetchAppointments(offset);
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
                              <span className="font-medium">{a.student_full_name}</span>
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
                          <span className={cn(
                            "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                            a.status === "booked" ? "bg-primary/15 text-primary" :
                            a.status === "completed" ? "bg-success/15 text-success-foreground" :
                            a.status === "cancelled" ? "bg-muted text-muted-foreground" :
                            "bg-warning/15 text-warning-foreground"
                          )}>
                            {a.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-2">
                            {a.status === "booked" && (
                              <>
                                <Button size="sm" variant="outline" onClick={() => handleAction(a.id, "complete")} className="h-8 text-xs bg-success/5 hover:bg-success/10 text-success-foreground border-success/20">
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
            
            {pagination && pagination.total > 10 && (
              <div className="flex justify-between items-center mt-6 pt-4 border-t border-border/60 text-xs text-muted-foreground">
                <div>
                  Showing {offset + 1}-{Math.min(offset + 10, pagination.total)} of {pagination.total} sessions
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={offset === 0 || loading} onClick={() => fetchAppointments(offset - 10)}>
                    <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                  </Button>
                  <Button size="sm" variant="outline" disabled={!pagination.has_next || loading} onClick={() => fetchAppointments(offset + 10)}>
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
        <div className="px-4 md:px-8 pb-12 mt-8 pt-8 border-t border-border">
          <div className="mb-6">
            <h2 className="font-display text-2xl font-bold">Campus Analytics</h2>
            <p className="text-sm text-muted-foreground">Aggregated wellness data across all students.</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Chart 1 — Campus WRS Trend (full width) */}
            <div className="lg:col-span-3 surface-card p-6 bg-card rounded-2xl">
              <div className="label-eyebrow mb-1">Campus WRS Trend</div>
              <div className="font-display text-lg font-bold mb-4">Last 7 days</div>
              {loading ? (
                <div className="h-64 bg-muted rounded-lg animate-pulse" />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                    <defs>
                      <linearGradient id="wrsg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6C3FE8" stopOpacity={0.6} />
                        <stop offset="100%" stopColor="#6C3FE8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                    <Area type="monotone" dataKey="wrs" stroke="#6C3FE8" strokeWidth={2.5} fill="url(#wrsg)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Chart 2 — Risk Distribution (half width) */}
            <div className="surface-card p-6 bg-card rounded-2xl">
              <div className="label-eyebrow mb-1">Risk distribution</div>
              <div className="font-display text-lg font-bold mb-4">By tier</div>
              {loading ? (
                <div className="h-56 bg-muted rounded-lg animate-pulse" />
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={tierData} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={3}>
                        {tierData.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap justify-center gap-2 text-xs mt-3">
                    {tierData.map((d) => (
                      <div key={d.name} className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                        <span>{d.name} ({d.value})</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Chart 3 — Check-ins Per Faculty (half width) */}
            <div className="lg:col-span-2 surface-card p-6 bg-card rounded-2xl">
              <div className="label-eyebrow mb-1">Check-ins per faculty</div>
              <div className="font-display text-lg font-bold mb-4">By cohort group</div>
              {loading ? (
                <div className="h-56 bg-muted rounded-lg animate-pulse" />
              ) : cohort.length === 0 ? (
                <div className="h-56 flex items-center justify-center text-muted-foreground">No cohort data available</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={cohort} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                    <XAxis dataKey="group" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                    <Bar dataKey="average_wrs_score" radius={[8, 8, 0, 0]} fill="#6C3FE8">
                      {cohort.map((d, i) => <Cell key={i} fill="#6C3FE8" opacity={0.8} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}

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
  );
}

