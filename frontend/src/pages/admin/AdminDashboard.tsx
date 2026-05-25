import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LayoutDashboard, BarChart3, Users, FileText, Settings, Search, AlertTriangle, ClipboardCheck, Activity, MessageSquare, Library, LogOut } from "lucide-react";
import { AppShell, SidebarItem } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ALERTS, FACULTY_WRS, STUDENTS, colorFromWrs, tierFromWrs, downloadCSV, trendData } from "@/data/mock";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn, formatWRS } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { getRiskAlerts, getRiskCohort } from "@/api/riskScores";
import { listStudents } from "@/api/students";
import { getRealAnalytics } from "@/api/analytics";
import { adminSidebarItems } from "@/data/sidebar";
import { AdminOnboardingSlides } from "@/components/AdminOnboardingSlides";

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

  // Fetch all data on component mount
  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        setError(null);
        const [studentsData, alertsData, cohortData] = await Promise.all([
          listStudents(10, 0),
          getRiskAlerts(10, 0),
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
        console.error("Dashboard data fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();

    const fetchAnalytics = async () => {
      try {
        setAnalyticsLoading(true);
        const data = await getRealAnalytics();
        setAnalytics(data.charts);
        setInsights(data.insights || {});
      } catch (err) {
        setAnalyticsError(true);
      } finally {
        setAnalyticsLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  const days = range === "week" ? 7 : range === "month" ? 30 : 90;
  const trend = useMemo(() => trendData(days), [days]);

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
    if (analytics?.wrs_trend) {
      return Object.entries(analytics.wrs_trend).map(([date, score]) => ({ day: date, wrs: score }));
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

  const facultyAvgData = useMemo(() => {
    if (analytics?.faculty_avg) {
      return Object.entries(analytics.faculty_avg).map(([faculty, avg]) => ({ group: faculty, average_wrs_score: avg }));
    }
    return cohort;
  }, [analytics, cohort]);

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
    { label: "Total Students Monitored", value: pagination.total, icon: Users, scrollTo: "trend" },
    { label: "Active High-Risk Alerts", value: activeHighRiskCount, icon: AlertTriangle, danger: true, scrollTo: "alerts" },
    { label: "Check-ins This Week", value: "—", icon: ClipboardCheck, scrollTo: "faculty" },
    { label: "Avg Campus WRS", value: loading ? "..." : avgCampusWrs, icon: Activity, scrollTo: "trend" },
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

  const leaderboard = [...cohort].sort((a, b) => (b.average_wrs_score || 0) - (a.average_wrs_score || 0));

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
            <div className="font-display text-lg font-bold mb-4">Last {days} days</div>
            {analyticsLoading ? (
              <div className="h-60 bg-muted rounded-lg animate-pulse" />
            ) : (!analytics?.wrs_trend && analyticsError) || (wrsTrendData.length === 0) ? (
              <div className="h-60 flex items-center justify-center text-muted-foreground bg-muted/20 rounded-lg">No data available</div>
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
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <Tooltip 
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, color: "hsl(var(--foreground))" }} 
                      itemStyle={{ color: "hsl(var(--foreground))" }}
                    />
                    <Area type="monotone" dataKey="wrs" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#wrsg)" />
                  </AreaChart>
                </ResponsiveContainer>
                {insights?.wrs_trend && (
                  <div className="mt-4 text-xs italic text-muted-foreground">
                    {insights.wrs_trend}
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
                    <Pie data={riskDistributionData} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={3} onClick={(d: any) => { setTierFilter(d.name); setPagination(p => ({ ...p, offset: 0 })); }} cursor="pointer">
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
                    <button key={d.name} onClick={() => { setTierFilter(d.name === tierFilter ? null : d.name); setPagination(p => ({ ...p, offset: 0 })); }} className="flex items-center gap-1.5">
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

          <div id="faculty" className="lg:col-span-2 glass border border-border rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="label-eyebrow">Check-ins per faculty</div>
                <div className="font-display text-lg font-bold">Click bar to filter alerts</div>
              </div>
              {facultyFilter && <Button size="sm" variant="outline" onClick={() => setFacultyFilter(null)}>Clear: {facultyFilter}</Button>}
            </div>
            {analyticsLoading || loading ? (
              <div className="h-56 bg-muted rounded-lg animate-pulse" />
            ) : facultyAvgData.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-muted-foreground">No data available</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={facultyAvgData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                    <XAxis dataKey="group" stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => String(v).split(" ")[0]} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <Tooltip 
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, color: "hsl(var(--foreground))" }} 
                      itemStyle={{ color: "hsl(var(--foreground))" }}
                    />
                    <Bar dataKey="average_wrs_score" radius={[8, 8, 0, 0]} fill="hsl(var(--primary))" cursor="pointer" onClick={(d: any) => { setFacultyFilter(d.group); setPagination(p => ({ ...p, offset: 0 })); }}>
                      {facultyAvgData.map((d: any, i: number) => <Cell key={i} fill="hsl(var(--primary))" opacity={facultyFilter && facultyFilter !== d.group ? 0.3 : 1} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                {insights?.faculty_avg && (
                  <div className="mt-4 text-xs italic text-muted-foreground">
                    {insights.faculty_avg}
                    <div className="mt-1 text-[10px] text-muted-foreground/50 not-italic">Powered by AI ✨</div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="glass border border-border rounded-3xl p-6">
            <div className="label-eyebrow mb-1">Most at-risk faculties</div>
            <div className="font-display text-lg font-bold mb-4">Leaderboard</div>
            <div className="space-y-3">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-1">
                    <div className="h-4 bg-muted rounded animate-pulse" />
                    <div className="h-2 bg-muted rounded-full animate-pulse" />
                  </div>
                ))
              ) : (
                leaderboard.map((f, i) => (
                  <div key={f.group || i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium">{i + 1}. {f.group}</span>
                      <span className="font-mono" style={{ color: colorFromWrs(f.average_wrs_score) }}>{formatWRS(f.average_wrs_score)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${f.average_wrs_score}%`, background: colorFromWrs(f.average_wrs_score) }} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Faculty Risk Heatmap */}
        <div className="glass border border-border rounded-3xl p-6">
          <h2 className="font-display text-xl font-bold mb-4">Faculty Risk Heatmap</h2>
          {analyticsLoading ? (
            <div className="h-64 bg-muted rounded-lg animate-pulse" />
          ) : !analytics?.faculty_risk_heatmap || Object.keys(analytics.faculty_risk_heatmap).length === 0 ? (
            <div className="h-32 flex items-center justify-center text-muted-foreground bg-muted/20 rounded-lg">No data available</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="text-left p-3">Faculty</th>
                    <th className="text-center p-3">Green</th>
                    <th className="text-center p-3">Amber</th>
                    <th className="text-center p-3">Red</th>
                    <th className="text-center p-3">Critical</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(analytics.faculty_risk_heatmap).map(([faculty, tiers]: [string, any]) => (
                    <tr key={faculty} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="p-3 font-medium">{faculty}</td>
                      <td className="p-3 text-center">
                        <div className="mx-auto w-10 py-1 rounded" style={{ backgroundColor: tiers.green > 0 ? 'rgba(168, 255, 62, 0.15)' : 'transparent', color: tiers.green > 0 ? '#8cd930' : 'inherit' }}>
                          {tiers.green || 0}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <div className="mx-auto w-10 py-1 rounded" style={{ backgroundColor: tiers.amber > 0 ? 'rgba(255, 140, 66, 0.15)' : 'transparent', color: tiers.amber > 0 ? '#d97637' : 'inherit' }}>
                          {tiers.amber || 0}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <div className="mx-auto w-10 py-1 rounded" style={{ backgroundColor: tiers.red > 0 ? 'rgba(255, 69, 96, 0.15)' : 'transparent', color: tiers.red > 0 ? '#d93950' : 'inherit' }}>
                          {tiers.red || 0}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <div className="mx-auto w-10 py-1 rounded font-bold" style={{ backgroundColor: tiers.critical > 0 ? 'rgba(176, 0, 32, 0.15)' : 'transparent', color: tiers.critical > 0 ? '#B00020' : 'inherit' }}>
                          {tiers.critical || 0}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                        <td className="p-3 font-medium">{a.student_id}</td>
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
      </div>
    </AppShell>
    </>
  );
}
