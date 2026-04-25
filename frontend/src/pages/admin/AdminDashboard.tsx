import { useMemo, useState } from "react";
import { LayoutDashboard, BarChart3, Users, FileText, Settings, Search, AlertTriangle, ClipboardCheck, Activity } from "lucide-react";
import { AppShell, SidebarItem } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ALERTS, FACULTY_WRS, STUDENTS, colorFromWrs, tierFromWrs, downloadCSV, trendData } from "@/data/mock";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const adminItems: SidebarItem[] = [
  { icon: LayoutDashboard, label: "Overview", to: "/admin", end: true },
  { icon: BarChart3, label: "Faculty Trends", to: "/admin" },
  { icon: Users, label: "User Management", to: "/admin/users" },
  { icon: FileText, label: "Reports", to: "/admin" },
  { icon: Settings, label: "Settings", to: "/admin/settings" },
];

const RANGE_LABELS = { week: "This Week", month: "This Month", semester: "This Semester" } as const;
type Range = keyof typeof RANGE_LABELS;

export default function AdminDashboard() {
  const [range, setRange] = useState<Range>("week");
  const [tierFilter, setTierFilter] = useState<string | null>(null);
  const [facultyFilter, setFacultyFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [alerts, setAlerts] = useState(ALERTS);

  const days = range === "week" ? 7 : range === "month" ? 30 : 90;
  const trend = useMemo(() => trendData(days), [days]);

  const tierData = useMemo(() => {
    const g = STUDENTS.filter((s) => tierFromWrs(s.wrs) === "Green").length;
    const a = STUDENTS.filter((s) => tierFromWrs(s.wrs) === "Amber").length;
    const r = STUDENTS.filter((s) => tierFromWrs(s.wrs) === "Red").length;
    const c = STUDENTS.filter((s) => tierFromWrs(s.wrs) === "Critical").length;
    return [
      { name: "Green", value: g, color: "#A8FF3E" },
      { name: "Amber", value: a, color: "#FF8C42" },
      { name: "Red", value: r, color: "#FF4560" },
      { name: "Critical", value: c, color: "#B00020" },
    ];
  }, []);

  const filteredAlerts = useMemo(() => {
    let r = [...alerts];
    if (tierFilter) {
      r = r.filter((a) => {
        const t = tierFromWrs(a.wrs);
        return t === tierFilter;
      });
    }
    if (facultyFilter) r = r.filter((a) => a.faculty === facultyFilter);
    if (search) r = r.filter((a) => a.studentId.toLowerCase().includes(search.toLowerCase()) || a.faculty.toLowerCase().includes(search.toLowerCase()));
    return r;
  }, [alerts, tierFilter, facultyFilter, search]);

  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(filteredAlerts.length / pageSize));
  const pageRows = filteredAlerts.slice((page - 1) * pageSize, page * pageSize);

  const activeHighRiskCount = useMemo(() => {
    return alerts.filter(a => tierFromWrs(a.wrs) === "Red" || tierFromWrs(a.wrs) === "Critical").length;
  }, [alerts]);

  const kpis = [
    { label: "Total Students Monitored", value: STUDENTS.length, icon: Users, scrollTo: "trend" },
    { label: "Active High-Risk Alerts", value: activeHighRiskCount, icon: AlertTriangle, danger: true, scrollTo: "alerts" },
    { label: "Check-ins This Week", value: "—", icon: ClipboardCheck, scrollTo: "faculty" },
    { label: "Avg Campus WRS", value: "—", icon: Activity, scrollTo: "trend" },
  ];

  const handleSidebar = (label: string) => {
    if (label === "Reports") {
      downloadCSV("safespace_report.csv", [
        ["Student ID", "Faculty", "WRS", "Psychologist"],
        ...STUDENTS.map((s) => [s.id, s.faculty, String(s.wrs), s.counselor]),
      ]);
      toast.success("Report downloaded");
    }
  };

  // Wrap sidebar items so Reports triggers download
  const items: SidebarItem[] = adminItems.map((it) =>
    it.label === "Reports"
      ? { ...it, to: "/admin", icon: it.icon }
      : it
  );

  const leaderboard = [...FACULTY_WRS].sort((a, b) => b.avg - a.avg);

  return (
    <AppShell items={items}>
      <div className="flex items-center justify-between h-16 px-8 border-b border-border">
        <div className="flex items-center gap-4">
          <h1 className="font-display text-xl font-bold">University Overview</h1>
          <Select value={range} onValueChange={(v: Range) => setRange(v)}>
            <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(RANGE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleSidebar("Reports")}><FileText className="h-3.5 w-3.5 mr-1.5" /> Export Report</Button>
          <ThemeToggle />
        </div>
      </div>

      <div className="p-8 space-y-6">
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
                <div className={cn("font-display text-3xl font-bold mt-3 tabular-nums", k.danger && "text-destructive")}>
                  {k.value}
                </div>
                <div className="text-xs text-muted-foreground mt-1">{k.label}</div>
              </button>
            );
          })}
        </div>

        {/* Charts grid */}
        <div className="grid lg:grid-cols-3 gap-4">
          <div id="trend" className="lg:col-span-2 glass border border-border rounded-3xl p-6">
            <div className="label-eyebrow mb-1">Campus WRS Trend</div>
            <div className="font-display text-lg font-bold mb-4">Last {days} days</div>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="wrsg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                <Area type="monotone" dataKey="wrs" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#wrsg)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="glass border border-border rounded-3xl p-6">
            <div className="label-eyebrow mb-1">Risk distribution</div>
            <div className="font-display text-lg font-bold mb-4">By tier</div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={tierData} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={3} onClick={(d: any) => { setTierFilter(d.name); setPage(1); }} cursor="pointer">
                  {tierData.map((d, i) => <Cell key={i} fill={d.color} opacity={tierFilter && tierFilter !== d.name ? 0.3 : 1} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-3 text-xs">
              {tierData.map((d) => (
                <button key={d.name} onClick={() => { setTierFilter(d.name === tierFilter ? null : d.name); setPage(1); }} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: d.color }} /> {d.name} ({d.value})
                </button>
              ))}
            </div>
          </div>

          <div id="faculty" className="lg:col-span-2 glass border border-border rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="label-eyebrow">Check-ins per faculty</div>
                <div className="font-display text-lg font-bold">Click bar to filter alerts</div>
              </div>
              {facultyFilter && <Button size="sm" variant="outline" onClick={() => setFacultyFilter(null)}>Clear: {facultyFilter}</Button>}
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={FACULTY_WRS} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                <XAxis dataKey="faculty" stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => v.split(" ")[0]} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                <Bar dataKey="count" radius={[8, 8, 0, 0]} fill="hsl(var(--primary))" cursor="pointer" onClick={(d: any) => { setFacultyFilter(d.faculty); setPage(1); }}>
                  {FACULTY_WRS.map((d, i) => <Cell key={i} fill="hsl(var(--primary))" opacity={facultyFilter && facultyFilter !== d.faculty ? 0.3 : 1} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="glass border border-border rounded-3xl p-6">
            <div className="label-eyebrow mb-1">Most at-risk faculties</div>
            <div className="font-display text-lg font-bold mb-4">Leaderboard</div>
            <div className="space-y-3">
              {leaderboard.map((f, i) => (
                <div key={f.faculty}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium">{i + 1}. {f.faculty}</span>
                    <span className="font-mono" style={{ color: colorFromWrs(f.avg) }}>{f.avg}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${f.avg}%`, background: colorFromWrs(f.avg) }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Alerts table */}
        <div id="alerts" className="glass border border-border rounded-3xl p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <h2 className="font-display text-xl font-bold">Recent alerts</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search ID or faculty..." className="pl-9 h-9 w-64" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="text-left p-3">Student ID</th>
                  <th className="text-left p-3">Faculty</th>
                  <th className="text-left p-3">WRS</th>
                  <th className="text-left p-3">Tier</th>
                  <th className="text-left p-3">Time</th>
                  <th className="text-left p-3">Psychologist</th>
                  <th className="text-left p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((a, i) => {
                  const color = colorFromWrs(a.wrs);
                  const tier = tierFromWrs(a.wrs);
                  return (
                    <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="p-3 font-mono">{a.studentId}</td>
                      <td className="p-3 text-muted-foreground">{a.faculty}</td>
                      <td className="p-3"><span className="px-2 py-0.5 rounded-full text-xs font-mono font-semibold" style={{ backgroundColor: `${color}25`, color }}>{a.wrs}</span></td>
                      <td className="p-3">
                        <span
                          className={cn("px-2 py-0.5 rounded-full text-xs font-medium", tier === "Critical" && "animate-pulse")}
                          style={{ backgroundColor: `${color}25`, color }}
                        >
                          {tier}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground">{a.alertTime}</td>
                      <td className="p-3 text-muted-foreground">{a.counselor}</td>
                      <td className="p-3">
                        <button
                          onClick={() => setAlerts((arr) => arr.map((x) => x.studentId === a.studentId ? { ...x, status: x.status === "Pending" ? "Resolved" : "Pending" } : x))}
                          className={cn("text-xs px-2.5 py-0.5 rounded-full font-medium transition", a.status === "Pending" ? "bg-warning/15 text-warning hover:bg-warning/25" : "bg-success/15 text-foreground hover:bg-success/25")}
                        >
                          {a.status}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {pageRows.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No alerts.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
            <span>Showing {pageRows.length} of {filteredAlerts.length}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
              <span className="px-3 py-1.5">{page} / {pageCount}</span>
              <Button size="sm" variant="outline" disabled={page >= pageCount} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
