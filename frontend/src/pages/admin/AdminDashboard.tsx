import { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { LayoutDashboard, BarChart3, Users, FileText, Settings, Search, AlertTriangle, ClipboardCheck, Activity, MessageSquare, Library, LogOut } from "lucide-react";
import { AppShell, SidebarItem } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ALERTS, FACULTY_WRS, STUDENTS, colorFromWrs, tierFromWrs, downloadCSV, trendData } from "@/data/mock";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { cn, formatWRS } from "@/lib/utils";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getRiskAlerts, getRiskCohort, type RiskTier } from "@/api/riskScores";
import { listStudents } from "@/api/students";
import { getRealAnalytics } from "@/api/analytics";
import { adminSidebarItems } from "@/data/sidebar";
import { AdminOnboardingSlides } from "@/components/AdminOnboardingSlides";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NeonSpinner } from "@/components/NeonSpinner";

const RANGE_LABELS = { week: "This Week", month: "This Month", semester: "This Semester" } as const;
type Range = keyof typeof RANGE_LABELS;

export default function AdminDashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [range, setRange] = useState<Range>("week");
  const [tierFilter, setTierFilter] = useState<string | null>(null);
  const [facultyFilter, setFacultyFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  
  // Real API data
  const [students, setStudents] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [cohort, setCohort] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ total: 0, limit: 10, offset: 0, has_next: false });
  const [alertsPaginationMeta, setAlertsPaginationMeta] = useState({ limit: 10, offset: 0, has_next: false });

  const [analytics, setAnalytics] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState(false);
  const [insights, setInsights] = useState<any>({});
  const [tierModal, setTierModal] = useState<{ tier: string; students: any[]; loading?: boolean } | null>(null);
  const tierModalRequestRef = useRef<string | null>(null);

  // Derived from range — must be declared before the useEffect that depends on it
  const days = range === "week" ? 7 : range === "month" ? 30 : 90;
  const trend = useMemo(() => trendData(days), [days]);

  // Fetch all data on component mount
  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        setError(null);
        const [studentsData, alertsData, cohortData] = await Promise.all([
          listStudents(100, 0),
          getRiskAlerts(100, 0),
          getRiskCohort()
        ]);
        setStudents(studentsData.data || []);
        setAlerts(alertsData.data || []);
        setCohort(cohortData || []);
        setAlertsPaginationMeta({
          limit: alertsData.pagination?.limit || 10,
          offset: alertsData.pagination?.offset || 0,
          has_next: alertsData.pagination?.has_next || false
        });
        setPagination({
          total: studentsData.pagination?.total || 0,
          limit: 10,
          offset: 0,
          has_next: false
        });
      } catch (err) {
        setError("Failed to load dashboard data");
        toast.error("Failed to load dashboard data. Please refresh.");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setAnalyticsLoading(true);
        setAnalyticsError(false);
        const data = await getRealAnalytics(days);
        setAnalytics(data.charts);
        setInsights(data.insights || {});
      } catch (err) {
        setAnalyticsError(true);
        toast.error("Analytics failed to load — showing cached data if available.");
      } finally {
        setAnalyticsLoading(false);
      }
    };
    fetchAnalytics();
  }, [days]);

  const openTierModal = async (tierName: string) => {
    const tierLower = tierName.toLowerCase() as RiskTier;
    tierModalRequestRef.current = tierName;
    const cached = alerts.filter(a => (a.tier || "").toLowerCase() === tierLower);
    setTierModal({ tier: tierName, students: cached, loading: true });
    try {
      const result = await getRiskAlerts(200, 0, tierLower);
      // Guard: ignore if user switched to a different tier while this was loading
      if (tierModalRequestRef.current === tierName) {
        setTierModal({ tier: tierName, students: result.data || [], loading: false });
      }
    } catch {
      toast.error(`Failed to load ${tierName} tier students`);
      if (tierModalRequestRef.current === tierName) {
        setTierModal(prev => prev ? { ...prev, loading: false } : null);
      }
    }
  };

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

  const wrsTrendData = useMemo(() => {
    if (analytics?.wrs_trend && analytics.wrs_trend.length > 0) {
      return analytics.wrs_trend.map((d: any) => ({
        day: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        wrs: d.avg_wrs,
        count: d.count,
      }));
    }
    return trend;
  }, [analytics, trend]);

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

  // Class-level risk for stacked bar + heatmap
  const classLevelRisk: any[] = useMemo(() => analytics?.class_level_risk || cohort, [analytics, cohort]);

  const appointmentStats = useMemo(() => analytics?.appointment_stats || null, [analytics]);
  const weeklyEngagement = useMemo(() => analytics?.weekly_engagement || null, [analytics]);
  const avgWrsCurrent = useMemo(() => analytics?.avg_wrs_current || 0, [analytics]);

  const filteredAlerts = useMemo(() => {
    let r = [...alerts];
    if (tierFilter) {
      r = r.filter((a) => {
        const tier = a.tier?.toLowerCase();
        const filterTier = tierFilter.toLowerCase();
        return tier === filterTier;
      });
    }
    if (facultyFilter) r = r.filter((a) => a.faculty === facultyFilter);
    if (search) r = r.filter((a) => {
      const studentId = String(a.student_id || "").toLowerCase();
      const faculty = String(a.faculty || "").toLowerCase();
      return studentId.includes(search.toLowerCase()) || faculty.includes(search.toLowerCase());
    });
    return r;
  }, [alerts, tierFilter, facultyFilter, search]);

  const pageRows = filteredAlerts.slice(0, pagination.limit);

  const activeHighRiskCount = useMemo(() => {
    return alerts.filter(a => {
      const tier = a.tier?.toLowerCase();
      return tier === "red" || tier === "critical";
    }).length;
  }, [alerts]);

  const avgCampusWrs = useMemo(() => {
    return formatWRS(cohort.reduce((acc, c) => acc + (c.average_wrs_score || 0) * (c.count || 1), 0) / cohort.reduce((acc, c) => acc + (c.count || 1), 0) || 0);
  }, [cohort]);

  const kpis = [
    { label: "Total Students Monitored", value: loading ? "—" : pagination.total, icon: Users, scrollTo: "trend" },
    { label: "Active High-Risk Alerts", value: loading ? "—" : activeHighRiskCount, icon: AlertTriangle, danger: true, scrollTo: "alerts" },
    { label: "Check-ins This Week", value: analyticsLoading ? "—" : (analytics?.checkins_7d ?? "—"), icon: ClipboardCheck, scrollTo: "year-group" },
    { label: "Avg Campus WRS", value: (loading || analyticsLoading) ? "—" : (avgWrsCurrent ? formatWRS(avgWrsCurrent) : avgCampusWrs), icon: Activity, scrollTo: "trend" },
  ];

  const handleSidebar = (label: string) => {
    if (label === "Reports") {
      downloadCSV("safespace_report.csv", [
        ["Student ID", "Faculty", "WRS", "Psychologist"],
        ...students.map((s) => [s.id, s.faculty, String(s.wrs_score || "—"), s.counselor || "—"]),
      ]);
      toast.success("Report downloaded");
    }
  };

  const leaderboard = [...classLevelRisk].sort((a: any, b: any) => (b.avg_wrs || b.average_wrs_score || 0) - (a.avg_wrs || a.average_wrs_score || 0));

  // MDS KPI calculations from analytics data
  const mdsKpis = useMemo(() => {
    const trend: any[] = analytics?.wrs_trend || [];
    let wrsChange: number | null = null;
    if (trend.length >= 2) {
      const last7 = trend.slice(-7);
      const prev7 = trend.slice(-14, -7);
      if (last7.length && prev7.length) {
        const avgLast = last7.reduce((s: number, d: any) => s + (d.avg_wrs || 0), 0) / last7.length;
        const avgPrev = prev7.reduce((s: number, d: any) => s + (d.avg_wrs || 0), 0) / prev7.length;
        if (avgPrev > 0) wrsChange = ((avgPrev - avgLast) / avgPrev) * 100; // positive = WRS dropped = improvement
      }
    }
    const weeklyRate = weeklyEngagement?.rate ?? null;
    const apptCompletion = appointmentStats?.completion_rate ?? null;
    const crisisResolution = analytics?.crisis_stats?.resolution_rate ?? null;
    const highRiskPct = analytics?.high_risk_proportion ?? null;
    return { wrsChange, weeklyRate, apptCompletion, crisisResolution, highRiskPct };
  }, [analytics, weeklyEngagement, appointmentStats]);

  return (
    <>
    <AdminOnboardingSlides />
    <AppShell items={adminSidebarItems}>
      {/* Error Banner */}
      {error && (
        <div className="bg-destructive/15 text-destructive px-4 md:px-8 py-2 text-sm border-b border-destructive/30">
          Failed to load data. Please refresh.
        </div>
      )}
      {analyticsError && (
        <div className="bg-warning/15 text-warning px-4 md:px-8 py-2 text-sm border-b border-warning/30">
          Analytics data unavailable. Showing cached data.
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between py-4 md:h-16 px-4 md:px-8 border-b border-border bg-background/60 backdrop-blur-sm sticky top-0 z-30 gap-3 md:gap-0">
        <div className="flex items-center justify-between w-full md:w-auto">
          <h1 className="font-display text-xl md:text-xl font-bold">University Overview</h1>
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={() => { logout(); navigate("/login"); }} className="rounded-full h-9 w-9">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          <div className="flex gap-2 items-center">
            <Select value={range} onValueChange={(v: Range) => setRange(v)}>
              <SelectTrigger className="w-32 md:w-40 h-9 text-xs md:text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(RANGE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => handleSidebar("Reports")} className="hidden md:flex"><FileText className="h-3.5 w-3.5 mr-1.5" /> Export</Button>
            <Button variant="outline" size="icon" onClick={() => handleSidebar("Reports")} className="md:hidden h-9 w-9"><FileText className="h-3.5 w-3.5" /></Button>
          </div>
          <div className="hidden md:flex">
            <ThemeToggle />
          </div>
        </div>
      </div>

      <div className="p-4 md:p-8 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((k) => {
            const Icon = k.icon;
            return (
              <button
                key={k.label}
                onClick={() => document.getElementById(k.scrollTo)?.scrollIntoView({ behavior: "smooth" })}
                className={cn("surface-card surface-card-hover p-5 text-left transition", k.danger && "border-destructive/30")}
              >
                <div className="flex items-start justify-between">
                  <div className={cn(
                    "h-10 w-10 rounded-xl flex items-center justify-center",
                    k.danger ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                {loading ? (
                  <div className="h-8 bg-muted rounded-lg mt-3 animate-pulse" />
                ) : (
                  <div className={cn("font-display text-3xl font-bold mt-3 tabular-nums", k.danger && "text-destructive")}>
                    {k.value}
                  </div>
                )}
                <div className="text-xs text-muted-foreground mt-1">{k.label}</div>
              </button>
            );
          })}
        </div>

        {/* High Risk Proportion KPI */}
        <div className="surface-card p-6 rounded-3xl">
          <div className="label-eyebrow mb-2">High Risk Proportion</div>
          {analyticsLoading ? (
            <div className="h-4 bg-muted rounded-full animate-pulse" />
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium">
                <span>Critical / Red Tier Students</span>
                <span className="tabular-nums font-bold text-destructive">
                  {analytics?.high_risk_proportion ? Math.round(analytics.high_risk_proportion * 100) + "%" : "—"}
                </span>
              </div>
              <div className="h-4 rounded-full bg-muted overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-1000" 
                  style={{ 
                    width: analytics?.high_risk_proportion ? `${analytics.high_risk_proportion * 100}%` : '0%',
                    background: '#FF4560' 
                  }} 
                />
              </div>
            </div>
          )}
        </div>

        {/* Charts grid */}
        <div className="grid lg:grid-cols-3 gap-4">
          <div id="trend" className="lg:col-span-2 glass border border-border rounded-3xl p-6">
            <div className="label-eyebrow mb-1">Campus WRS Trend</div>
            <div className="font-display text-lg font-bold mb-1">Average wellness risk score over time</div>
            <p className="text-xs text-muted-foreground mb-4">Daily average WRS across all student assessments. Scale: 0 (low risk) → 100 (critical).</p>
            {analyticsLoading ? (
              <div className="h-60 bg-muted rounded-lg animate-pulse" />
            ) : wrsTrendData.length === 0 ? (
              <div className="h-60 flex flex-col items-center justify-center text-muted-foreground bg-muted/20 rounded-lg gap-2">
                <Activity className="h-8 w-8 opacity-30" />
                <span className="text-sm">No assessment data yet</span>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={wrsTrendData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                    <defs>
                      <linearGradient id="wrsg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, color: "hsl(var(--foreground))" }}
                      itemStyle={{ color: "hsl(var(--foreground))" }}
                      formatter={(v: any, name: string) => [name === "wrs" ? `${v} / 100` : `${v}`, name === "wrs" ? "Avg WRS" : "Count"]}
                    />
                    <Area type="monotone" dataKey="wrs" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#wrsg)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
                {insights?.summary && (
                  <div className="mt-4 p-3 rounded-xl bg-primary/5 border border-primary/10 text-xs text-muted-foreground italic">
                    {insights.summary}
                    <div className="mt-1 text-[10px] text-muted-foreground/50 not-italic">Powered by AI ✨</div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="glass border border-border rounded-3xl p-6">
            <div className="label-eyebrow mb-1">Risk distribution</div>
            <div className="font-display text-lg font-bold mb-4">By tier</div>
            {analyticsLoading ? (
              <div className="h-56 bg-muted rounded-lg animate-pulse" />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={riskDistributionData} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={3} onClick={(d: any) => { setTierFilter(d.name); setPagination(p => ({ ...p, offset: 0 })); openTierModal(d.name); }} cursor="pointer">
                      {riskDistributionData.map((d, i) => <Cell key={i} fill={d.color} opacity={tierFilter && tierFilter !== d.name ? 0.3 : 1} />)}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, color: "hsl(var(--foreground))" }}
                      itemStyle={{ color: "hsl(var(--foreground))" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-3 text-xs">
                  {riskDistributionData.map((d) => (
                    <button key={d.name} onClick={() => { setTierFilter(d.name === tierFilter ? null : d.name); setPagination(p => ({ ...p, offset: 0 })); openTierModal(d.name); }} className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ background: d.color }} /> {d.name} ({d.value})
                    </button>
                  ))}
                </div>
                {insights?.risk_distribution && (
                  <div className="mt-4 text-xs italic text-muted-foreground text-center">
                    {insights.risk_distribution}
                    <div className="mt-1 text-[10px] text-muted-foreground/50 not-italic">Powered by AI ✨</div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Year Group Risk — stacked bar */}
          <div id="year-group" className="lg:col-span-2 glass border border-border rounded-3xl p-6">
            <div className="flex items-center justify-between mb-1">
              <div>
                <div className="label-eyebrow">Year group risk</div>
                <div className="font-display text-lg font-bold">Students per tier by class level</div>
              </div>
              {facultyFilter && <Button size="sm" variant="outline" onClick={() => setFacultyFilter(null)}>Clear: {facultyFilter}</Button>}
            </div>
            <p className="text-xs text-muted-foreground mb-4">Click a bar to filter the alerts table below by class level.</p>
            {analyticsLoading || loading ? (
              <div className="h-56 bg-muted rounded-lg animate-pulse" />
            ) : classLevelRisk.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-muted-foreground">No risk score data yet</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={classLevelRisk} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                    <XAxis dataKey="class_level" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, color: "hsl(var(--foreground))" }}
                      itemStyle={{ color: "hsl(var(--foreground))" }}
                    />
                    <Bar dataKey="green" name="Green" stackId="a" fill="#A8FF3E" cursor="pointer" onClick={(d: any) => { setFacultyFilter(d.class_level); setPagination(p => ({ ...p, offset: 0 })); openTierModal("Green"); }} />
                    <Bar dataKey="amber" name="Amber" stackId="a" fill="#FF8C42" cursor="pointer" onClick={(d: any) => { setFacultyFilter(d.class_level); setPagination(p => ({ ...p, offset: 0 })); openTierModal("Amber"); }} />
                    <Bar dataKey="red" name="Red" stackId="a" fill="#FF4560" cursor="pointer" onClick={(d: any) => { setFacultyFilter(d.class_level); setPagination(p => ({ ...p, offset: 0 })); openTierModal("Red"); }} />
                    <Bar dataKey="critical" name="Critical" stackId="a" fill="#B00020" radius={[4, 4, 0, 0]} cursor="pointer" onClick={(d: any) => { setFacultyFilter(d.class_level); setPagination(p => ({ ...p, offset: 0 })); openTierModal("Critical"); }} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex gap-4 text-xs mt-3 justify-center">
                  {[{ label: "Green", color: "#A8FF3E" }, { label: "Amber", color: "#FF8C42" }, { label: "Red", color: "#FF4560" }, { label: "Critical", color: "#B00020" }].map(({ label, color }) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-sm shrink-0" style={{ background: color }} />
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Year group WRS leaderboard */}
          <div className="glass border border-border rounded-3xl p-6">
            <div className="label-eyebrow mb-1">Most at-risk year groups</div>
            <div className="font-display text-lg font-bold mb-4">By average WRS</div>
            <div className="space-y-3">
              {(analyticsLoading || loading) ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-1">
                    <div className="h-4 bg-muted rounded animate-pulse" />
                    <div className="h-2 bg-muted rounded-full animate-pulse" />
                  </div>
                ))
              ) : leaderboard.length === 0 ? (
                <div className="text-sm text-muted-foreground py-8 text-center">No data yet</div>
              ) : (
                leaderboard.map((f: any, i: number) => {
                  const wrs = f.avg_wrs ?? f.average_wrs_score ?? 0;
                  const label = f.class_level ?? f.group ?? "Unknown";
                  return (
                    <div key={label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium">{i + 1}. {label}</span>
                        <span className="font-mono" style={{ color: colorFromWrs(wrs) }}>{formatWRS(wrs)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${wrs}%`, background: colorFromWrs(wrs) }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Appointment outcomes + Engagement row */}
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="glass border border-border rounded-3xl p-6">
            <div className="label-eyebrow mb-1">Appointment outcomes</div>
            <div className="font-display text-lg font-bold mb-1">Session summary — last 30 days</div>
            <p className="text-xs text-muted-foreground mb-5">Track session completion and attendance patterns across the unit.</p>
            {analyticsLoading ? (
              <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-10 bg-muted rounded-xl animate-pulse" />)}</div>
            ) : !appointmentStats ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">No session data yet</div>
            ) : (
              <div className="space-y-4">
                {[
                  { label: "Completed", value: appointmentStats.completed, color: "#A8FF3E" },
                  { label: "Upcoming", value: appointmentStats.booked, color: "#6C3FE8" },
                  { label: "Cancelled", value: appointmentStats.cancelled, color: "#FF8C42" },
                  { label: "No-show", value: appointmentStats.no_show, color: "#FF4560" },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium">{label}</span>
                      <span className="tabular-nums font-semibold" style={{ color }}>{value} <span className="text-muted-foreground font-normal">/ {appointmentStats.total}</span></span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: appointmentStats.total ? `${(value / appointmentStats.total) * 100}%` : "0%", background: color }} />
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t border-border flex justify-between text-xs text-muted-foreground">
                  <span>Session completion rate</span>
                  <span className="font-bold text-foreground tabular-nums">{Math.round((appointmentStats.completion_rate || 0) * 100)}%</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>No-show rate</span>
                  <span className="font-bold text-foreground tabular-nums">{Math.round((appointmentStats.no_show_rate || 0) * 100)}%</span>
                </div>
              </div>
            )}
          </div>

          <div className="glass border border-border rounded-3xl p-6">
            <div className="label-eyebrow mb-1">Student engagement</div>
            <div className="font-display text-lg font-bold mb-1">7-day check-in rate</div>
            <p className="text-xs text-muted-foreground mb-5">Percentage of registered students who completed at least one wellness check-in this week.</p>
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

        {/* Year Group Risk Heatmap */}
        <div className="glass border border-border rounded-3xl p-6">
          <h2 className="font-display text-xl font-bold mb-1">Year Group Risk Heatmap</h2>
          <p className="text-xs text-muted-foreground mb-4">Number of students in each risk tier, grouped by class year. Based on latest risk score per student.</p>
          {analyticsLoading ? (
            <div className="h-48 bg-muted rounded-lg animate-pulse" />
          ) : classLevelRisk.length === 0 ? (
            <div className="h-32 flex items-center justify-center text-muted-foreground bg-muted/20 rounded-lg">No risk score data yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="text-left p-3">Class Level</th>
                    <th className="text-center p-3">Green</th>
                    <th className="text-center p-3">Amber</th>
                    <th className="text-center p-3">Red</th>
                    <th className="text-center p-3">Critical</th>
                    <th className="text-center p-3">Avg WRS</th>
                    <th className="text-center p-3">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {classLevelRisk.map((row: any) => {
                    const label = row.class_level ?? row.group ?? "Unknown";
                    const wrs = row.avg_wrs ?? row.average_wrs_score ?? 0;
                    return (
                      <tr key={label} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="p-3 font-medium">{label}</td>
                        {[
                          { key: "green", bg: "rgba(168,255,62,0.12)", color: "#8cd930" },
                          { key: "amber", bg: "rgba(255,140,66,0.12)", color: "#d97637" },
                          { key: "red", bg: "rgba(255,69,96,0.12)", color: "#d93950" },
                          { key: "critical", bg: "rgba(176,0,32,0.12)", color: "#B00020" },
                        ].map(({ key, bg, color }) => (
                          <td key={key} className="p-3 text-center">
                            <div className="mx-auto w-10 py-1 rounded font-semibold tabular-nums" style={{ backgroundColor: (row[key] || 0) > 0 ? bg : "transparent", color: (row[key] || 0) > 0 ? color : "inherit" }}>
                              {row[key] || 0}
                            </div>
                          </td>
                        ))}
                        <td className="p-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-xs font-mono font-semibold" style={{ backgroundColor: `${colorFromWrs(wrs)}20`, color: colorFromWrs(wrs) }}>
                            {formatWRS(wrs)}
                          </span>
                        </td>
                        <td className="p-3 text-center text-muted-foreground tabular-nums">{row.total || 0}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* MDS KPI Monitoring */}
        <div className="glass border border-border rounded-3xl p-6">
          <div className="mb-5">
            <h2 className="font-display text-xl font-bold">Deployment KPIs</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Migaki Deployment Standard targets — tracked automatically from live data.</p>
          </div>
          {analyticsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-24 bg-muted rounded-2xl animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {[
                {
                  label: "Weekly Active Usage",
                  value: mdsKpis.weeklyRate !== null ? `${(mdsKpis.weeklyRate * 100).toFixed(0)}%` : "—",
                  target: "≥ 60%",
                  pass: mdsKpis.weeklyRate !== null && mdsKpis.weeklyRate >= 0.6,
                  warn: mdsKpis.weeklyRate !== null && mdsKpis.weeklyRate < 0.6,
                  desc: "Students active this week",
                },
                {
                  label: "Appt. Completion",
                  value: mdsKpis.apptCompletion !== null ? `${(mdsKpis.apptCompletion * 100).toFixed(0)}%` : "—",
                  target: "≥ 70%",
                  pass: mdsKpis.apptCompletion !== null && mdsKpis.apptCompletion >= 0.7,
                  warn: mdsKpis.apptCompletion !== null && mdsKpis.apptCompletion < 0.7,
                  desc: "Core workflow completion",
                },
                {
                  label: "Platform Reliability",
                  value: "99%+",
                  target: "≥ 95%",
                  pass: true,
                  warn: false,
                  desc: "Railway + Vercel uptime",
                },
                {
                  label: "Crisis Resolution",
                  value: mdsKpis.crisisResolution !== null ? `${(mdsKpis.crisisResolution * 100).toFixed(0)}%` : "—",
                  target: "≥ 80%",
                  pass: mdsKpis.crisisResolution !== null && mdsKpis.crisisResolution >= 0.8,
                  warn: mdsKpis.crisisResolution !== null && mdsKpis.crisisResolution < 0.8,
                  desc: "PsyUnit KPI #1 — 30-day crisis cases resolved",
                },
                {
                  label: "WRS Trend",
                  value: mdsKpis.wrsChange !== null
                    ? mdsKpis.wrsChange > 0
                      ? `↓ ${mdsKpis.wrsChange.toFixed(1)}%`
                      : mdsKpis.wrsChange < 0
                        ? `↑ ${Math.abs(mdsKpis.wrsChange).toFixed(1)}%`
                        : "Stable"
                    : "—",
                  target: "↓ improving",
                  pass: mdsKpis.wrsChange !== null && mdsKpis.wrsChange > 0,
                  warn: mdsKpis.wrsChange !== null && mdsKpis.wrsChange <= 0,
                  desc: "PsyUnit KPI #2 — avg campus risk vs last 7 days",
                },
              ].map(({ label, value, target, pass, warn, desc }) => (
                <div key={label} className={cn("rounded-2xl border p-4 flex flex-col gap-2", pass ? "border-emerald-500/30 bg-emerald-500/5" : warn ? "border-amber-500/30 bg-amber-500/5" : "border-border bg-muted/20")}>
                  <div className={cn("text-xs font-semibold uppercase tracking-wider", pass ? "text-emerald-500" : warn ? "text-amber-500" : "text-muted-foreground")}>
                    {pass ? "✓ On Track" : warn ? "⚠ Below Target" : "No Data"}
                  </div>
                  <div className="font-display text-2xl font-bold tabular-nums">{value}</div>
                  <div className="text-xs text-muted-foreground leading-snug">
                    <div className="font-medium text-foreground mb-0.5">{label}</div>
                    <div>Target: {target}</div>
                    <div className="mt-0.5 opacity-70">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alerts table */}
        <div id="alerts" className="glass border border-border rounded-3xl p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <h2 className="font-display text-xl font-bold">Recent alerts</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={search} onChange={(e) => { setSearch(e.target.value); setPagination(p => ({ ...p, offset: 0 })); }} placeholder="Search ID or faculty..." className="pl-9 h-9 w-64" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="text-left p-3">Student ID</th>
                  <th className="text-left p-3">Level</th>
                  <th className="text-left p-3">Faculty</th>
                  <th className="text-left p-3">WRS</th>
                  <th className="text-left p-3">Tier</th>
                  <th className="text-left p-3">Time</th>
                  <th className="text-left p-3">Psychologist</th>
                  <th className="text-left p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td colSpan={8} className="p-3">
                        <div className="h-6 bg-muted rounded animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : pageRows.length === 0 ? (
                  <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No alerts match your filters.</td></tr>
                ) : (
                  pageRows.map((a, i) => {
                    const baseTier = a.tier;
                    const tierDisplay = baseTier ? (baseTier.charAt(0).toUpperCase() + baseTier.slice(1).toLowerCase()) : "No Data";
                    const color = baseTier ? colorFromWrs(a.wrs_score || 0) : "#6B7280";
                    
                    // Format date
                    let formattedTime = "—";
                    if (a.computed_at) {
                      const date = new Date(a.computed_at);
                      formattedTime = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                    }
                    
                    return (
                      <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="p-3 font-medium">
                          <Link to={`/admin/student/${a.student_id}`} className="hover:underline text-primary">
                            {a.student_id}
                          </Link>
                        </td>
                        <td className="p-3 text-muted-foreground">—</td>
                        <td className="p-3 text-muted-foreground">{a.faculty || "—"}</td>
                        <td className="p-3"><span className="px-2 py-0.5 rounded-full text-xs font-mono font-semibold" style={{ backgroundColor: `${color}25`, color }}>{formatWRS(a.wrs_score)}</span></td>
                        <td className="p-3">
                          <span
                            className={cn("px-2 py-0.5 rounded-full text-xs font-medium", baseTier?.toLowerCase() === "critical" && "animate-pulse")}
                            style={{ backgroundColor: `${color}25`, color }}
                          >
                            {tierDisplay}
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground">{formattedTime}</td>
                        <td className="p-3 text-muted-foreground">—</td>
                        <td className="p-3">
                          <button
                            className={cn("text-xs px-2.5 py-0.5 rounded-full font-medium transition", "bg-warning/15 text-warning hover:bg-warning/25")}
                          >
                            Pending
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {!loading && alerts.length > pagination.limit && (
            <div className="flex justify-between items-center mt-4">
              <div className="text-xs text-muted-foreground">
                Showing {alertsPaginationMeta.offset + 1}-{Math.min(alertsPaginationMeta.offset + alertsPaginationMeta.limit, alerts.length)} of {alerts.length}
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  disabled={alertsPaginationMeta.offset === 0}
                  onClick={async () => {
                    const newOffset = Math.max(0, alertsPaginationMeta.offset - alertsPaginationMeta.limit);
                    setLoading(true);
                    try {
                      const alertsData = await getRiskAlerts(alertsPaginationMeta.limit, newOffset);
                      setAlerts(alertsData.data || []);
                      setAlertsPaginationMeta({
                        limit: alertsData.pagination?.limit || 10,
                        offset: alertsData.pagination?.offset || 0,
                        has_next: alertsData.pagination?.has_next || false
                      });
                    } catch (err) {
                      setError("Failed to load alerts");
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  Previous
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  disabled={!alertsPaginationMeta.has_next}
                  onClick={async () => {
                    const newOffset = alertsPaginationMeta.offset + alertsPaginationMeta.limit;
                    setLoading(true);
                    try {
                      const alertsData = await getRiskAlerts(alertsPaginationMeta.limit, newOffset);
                      setAlerts(alertsData.data || []);
                      setAlertsPaginationMeta({
                        limit: alertsData.pagination?.limit || 10,
                        offset: alertsData.pagination?.offset || 0,
                        has_next: alertsData.pagination?.has_next || false
                      });
                    } catch (err) {
                      setError("Failed to load alerts");
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
        {/* WRS over time by faculty/department */}
        {analytics?.wrs_by_faculty && analytics.wrs_by_faculty.length > 0 && (
          <div className="glass border border-border rounded-3xl p-6">
            <div className="label-eyebrow mb-1">WRS by department</div>
            <div className="font-display text-lg font-bold mb-1">Wellness risk trend — per faculty</div>
            <p className="text-xs text-muted-foreground mb-4">Average WRS over time for each academic department. Helps identify which faculties need additional counsellor support.</p>
            {analyticsLoading ? (
              <div className="h-60 bg-muted rounded-lg animate-pulse" />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={analytics.wrs_by_faculty} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                    <defs>
                      {(analytics.faculty_list || []).map((fac: string, i: number) => {
                        const colors = ["#6C3FE8", "#FF8C42", "#A8FF3E", "#FF4560", "#38BDF8", "#F472B6"];
                        const color = colors[i % colors.length];
                        return (
                          <linearGradient key={fac} id={`facGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                            <stop offset="100%" stopColor={color} stopOpacity={0} />
                          </linearGradient>
                        );
                      })}
                    </defs>
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, color: "hsl(var(--foreground))" }}
                      itemStyle={{ color: "hsl(var(--foreground))" }}
                      formatter={(v: any) => [`${v} / 100`, ""]}
                    />
                    <Legend />
                    {(analytics.faculty_list || []).map((fac: string, i: number) => {
                      const colors = ["#6C3FE8", "#FF8C42", "#A8FF3E", "#FF4560", "#38BDF8", "#F472B6"];
                      const color = colors[i % colors.length];
                      return (
                        <Area key={fac} type="monotone" dataKey={fac} name={fac} stroke={color} strokeWidth={2} fill={`url(#facGrad${i})`} dot={false} connectNulls />
                      );
                    })}
                  </AreaChart>
                </ResponsiveContainer>
              </>
            )}
          </div>
        )}
      </div>

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
                      <Link to={`/admin/student/${s.student_id}`} onClick={() => setTierModal(null)} className="font-medium text-sm hover:underline text-primary">
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
    </AppShell>
    </>
  );
}
