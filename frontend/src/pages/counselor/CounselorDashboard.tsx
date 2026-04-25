import { useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Calendar, Bell, Search, ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle, CalendarCheck, Activity, MoreHorizontal, Video, XCircle, Clock, FileText, LogOut } from "lucide-react";
import { AppShell, SidebarItem } from "@/components/AppSidebar";
import { counselorSidebarItems } from "@/data/sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { STUDENTS, FACULTY_WRS, UPCOMING_SESSIONS, tierFromWrs, colorFromWrs, RiskTier } from "@/data/mock";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from "recharts";
import { toast } from "sonner";

const TIERS = ["All", "Green", "Amber", "Red", "Critical"] as const;

export default function CounselorDashboard() {
  const { user, logout } = useAuth();
  const [filter, setFilter] = useState<typeof TIERS[number]>("All");
  const [facultyFilter, setFacultyFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortDesc, setSortDesc] = useState(true);
  const location = useLocation();
  const currentView = location.pathname === "/counselor/sessions" ? "schedule" : "dashboard";
  const [sessions, setSessions] = useState(UPCOMING_SESSIONS);
  const [rosterPagination, setRosterPagination] = useState({ limit: 10, offset: 0 });
  const [sessionsPagination, setSessionsPagination] = useState({ limit: 10, offset: 0 });
  const [overrides, setOverrides] = useState<Record<string, RiskTier>>({});
  const [overrideModal, setOverrideModal] = useState<{ id: string; name: string; currentTier: string; newTier: string; justification: string } | null>(null);
  const navigate = useNavigate();

  const colorFromTier = (t: string) => t === "Green" ? "#A8FF3E" : t === "Amber" ? "#FF8C42" : t === "Red" ? "#FF4560" : "#B00020";

  const activeHighRiskCount = useMemo(() => {
    return STUDENTS.filter(s => tierFromWrs(s.wrs) === "Red" || tierFromWrs(s.wrs) === "Critical").length;
  }, []);

  const kpis = [
    { label: "Total Students", value: STUDENTS.length, icon: Users, action: () => { navigate("/counselor/students"); } },
    { label: "Active High-Risk Alerts", value: activeHighRiskCount, icon: AlertTriangle, danger: true, action: () => { navigate("/counselor/students"); setFilter("Critical"); } },
    { label: "Sessions This Week", value: sessions.length, icon: CalendarCheck, action: () => navigate("/counselor/sessions") },
    { label: "Avg Campus WRS", value: "—", icon: Activity, action: () => toast.info("Data will be available after integration") },
  ];

  const rows = useMemo(() => {
    let r = [...STUDENTS];
    if (filter !== "All") r = r.filter((s) => (overrides[s.id] || tierFromWrs(s.wrs)) === filter);
    if (facultyFilter) r = r.filter((s) => s.faculty === facultyFilter);
    if (search) r = r.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));
    r.sort((a, b) => (sortDesc ? b.wrs - a.wrs : a.wrs - b.wrs));
    return r;
  }, [filter, facultyFilter, search, sortDesc]);

  const rosterPageRows = rows.slice(rosterPagination.offset, rosterPagination.offset + rosterPagination.limit);
  const sessionsPageRows = sessions.slice(sessionsPagination.offset, sessionsPagination.offset + sessionsPagination.limit);

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

  const handleAction = (id: string, actionName: string) => {
    if (actionName === "join") toast.success("Opening secure video meeting...");
    if (actionName === "reschedule") toast.info("Rescheduling dialog opened.");
    if (actionName === "cancel") {
      setSessions(sessions.map(s => s.id === id ? { ...s, status: "Canceled" } : s));
      toast.success("Session canceled successfully.");
    }
  };

  const handleOverrideSubmit = () => {
    if (!overrideModal) return;
    if (overrideModal.justification.trim().length < 20) {
      toast.error("Please provide a detailed justification");
      return;
    }
    setOverrides((prev) => ({ ...prev, [overrideModal.id]: overrideModal.newTier as RiskTier }));
    toast.success(`Risk tier overridden for ${overrideModal.name}`);
    setOverrideModal(null);
  };

  const sidebarItems: SidebarItem[] = [
    ...counselorSidebarItems,
    { icon: LogOut, label: "Logout", onClick: () => { logout(); navigate("/login"); } }
  ];

  return (
    <AppShell items={sidebarItems}>
      <div className="flex items-start md:items-center justify-between py-4 md:h-16 px-4 md:px-8 border-b border-border bg-background md:bg-background/60 md:backdrop-blur-sm sticky top-0 z-30">
        <h1 className="font-display text-lg md:text-xl font-bold">Welcome, {user?.name} 👋</h1>
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
                <div className={cn("font-display text-2xl md:text-3xl font-bold mt-2 md:mt-3 tabular-nums", k.danger && "text-destructive")}>
                  {k.value}
                </div>
                <div className="text-[10px] md:text-xs text-muted-foreground mt-0.5 md:mt-1">{k.label}</div>
              </button>
            );
          })}
        </div>

        {currentView === "dashboard" ? (
          <div className="grid lg:grid-cols-12 gap-6 animate-fade-in">
            {/* Left col — Risk table */}
            <div className="lg:col-span-8 surface-card p-4 md:p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                <div>
                  <h2 className="font-display text-base md:text-xl font-bold">Risk roster</h2>
                  <p className="text-[10px] md:text-xs text-muted-foreground">Sorted by WRS, highest risk first</p>
                </div>
                <div className="flex items-center gap-3 flex-col sm:flex-row w-full sm:w-auto">
                  <div className="relative w-full sm:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); setRosterPagination(p => ({ ...p, offset: 0 })); }}
                      placeholder="Search student..."
                      className="pl-9 h-9 w-full sm:w-56"
                    />
                  </div>
                  <div className="flex overflow-x-auto scrollbar-none gap-1 p-1 rounded-full bg-muted w-full sm:w-auto whitespace-nowrap">
                    {TIERS.map((t) => (
                      <button
                        key={t}
                        onClick={() => { setFilter(t); setRosterPagination(p => ({ ...p, offset: 0 })); }}
                        className={cn(
                          "px-4 py-1 text-xs font-semibold rounded-full transition text-center",
                          filter === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {facultyFilter && (
                <div className="mb-3 flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Filtered by:</span>
                  <button
                    onClick={() => { setFacultyFilter(null); setRosterPagination(p => ({ ...p, offset: 0 })); }}
                    className="px-2 py-0.5 rounded-full bg-primary/15 text-primary font-medium"
                  >
                    {facultyFilter} ✕
                  </button>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                    <tr className="border-b border-border">
                      <th className="text-left p-3">Student</th>
                      <th className="hidden md:table-cell text-left p-3">Level</th>
                      <th className="hidden md:table-cell text-left p-3">Faculty</th>
                      <th className="text-left p-3">
                        <button onClick={() => setSortDesc(!sortDesc)} className="inline-flex items-center gap-1 hover:text-foreground">
                          WRS <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </th>
                      <th className="text-left p-3">Tier</th>
                      <th className="hidden md:table-cell text-left p-3">Last Severity</th>
                      <th className="hidden md:table-cell text-left p-3">Last check-in</th>
                      <th className="text-right p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rosterPageRows.map((s, i) => {
                      const baseTier = tierFromWrs(s.wrs);
                      const isOverridden = !!overrides[s.id];
                      const tier = overrides[s.id] || baseTier;
                      const color = colorFromTier(tier);
                      return (
                        <tr key={s.id} className={cn("border-b border-border/60 last:border-0 hover:bg-primary/5 transition", i % 2 === 0 && "bg-muted/20")}>
                          <td className="p-3 font-medium text-xs md:text-sm">{s.name}</td>
                          <td className="hidden md:table-cell p-3 text-muted-foreground">{s.classLevel}</td>
                          <td className="hidden md:table-cell p-3 text-muted-foreground">{s.faculty}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] md:text-xs font-mono font-semibold" style={{ backgroundColor: `${colorFromWrs(s.wrs)}25`, color: colorFromWrs(s.wrs) }}>
                              {s.wrs}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <span
                                className={cn("text-[10px] md:text-xs px-2.5 py-0.5 rounded-full font-medium", tier === "Critical" && "animate-pulse")}
                                style={{ backgroundColor: `${color}25`, color }}
                              >
                                {tier}
                              </span>
                              {isOverridden && (
                                <span className="hidden sm:inline-block text-[10px] uppercase tracking-wider font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                  Overridden
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="hidden md:table-cell p-3 text-muted-foreground text-xs">{s.lastSeverity}</td>
                          <td className="hidden md:table-cell p-3 text-muted-foreground text-xs font-mono">{s.lastCheckIn}</td>
                          <td className="p-3 text-right">
                            <div className="flex flex-col sm:flex-row justify-end gap-1.5 md:gap-2">
                              <Button size="sm" variant="outline" onClick={() => navigate(`/counselor/session/${s.id}`)} className="h-7 text-[10px] md:h-9 md:text-sm px-2">
                                View
                              </Button>
                              <Button size="sm" variant="secondary" onClick={() => setOverrideModal({ id: s.id, name: s.name, currentTier: baseTier, newTier: baseTier, justification: "" })} className="h-7 text-[10px] md:h-9 md:text-sm px-2">
                                Override
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {rosterPageRows.length === 0 && (
                      <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No students match your filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {rows.length > rosterPagination.limit && (
                <div className="flex justify-between items-center mt-4 text-xs text-muted-foreground">
                  <div>
                    Showing {rosterPagination.offset + 1}-{Math.min(rosterPagination.offset + rosterPagination.limit, rows.length)} of {rows.length}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={rosterPagination.offset === 0} onClick={() => setRosterPagination(p => ({ ...p, offset: Math.max(0, p.offset - p.limit) }))}>Previous</Button>
                    <Button size="sm" variant="outline" disabled={rosterPagination.offset + rosterPagination.limit >= rows.length} onClick={() => setRosterPagination(p => ({ ...p, offset: p.offset + p.limit }))}>Next</Button>
                  </div>
                </div>
              )}
            </div>

            {/* Right col — charts stacked */}
            <div className="lg:col-span-4 space-y-6">
              {/* Faculty WRS bar chart */}
              <div className="surface-card p-4 md:p-6">
                <div className="label-eyebrow mb-1">Faculty WRS</div>
                <div className="font-display text-sm md:text-base font-bold mb-4">Click bar to filter</div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={FACULTY_WRS} margin={{ top: 20, right: 8, bottom: 0, left: -20 }}>
                    <XAxis
                      dataKey="faculty"
                      tick={false}
                      axisLine={false}
                    />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
                    <Bar dataKey="avg" radius={[6, 6, 0, 0]} cursor="pointer" onClick={(d: { faculty: string }) => { setFacultyFilter(d.faculty); setRosterPagination(p => ({ ...p, offset: 0 })); }} label={{ position: 'top', fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}>
                      {FACULTY_WRS.map((d, i) => (
                        <Cell key={i} fill={colorFromWrs(d.avg)} opacity={facultyFilter && facultyFilter !== d.faculty ? 0.3 : 1} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* At-risk summary donut */}
              <div className="surface-card p-4 md:p-6">
                <div className="label-eyebrow mb-1 text-[10px] md:text-xs">At-risk summary</div>
                <div className="font-display text-sm md:text-base font-bold mb-4">Tier distribution</div>
                <div className="flex flex-col items-center">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={tierData}
                        dataKey="value"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        cursor="pointer"
                        onClick={(d: { name: string }) => { setFilter(d.name as typeof TIERS[number]); setRosterPagination(p => ({ ...p, offset: 0 })); }}
                      >
                        {tierData.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap justify-center gap-2 md:gap-3 mt-4 w-full">
                    {tierData.map((d) => (
                      <button
                        key={d.name}
                        onClick={() => { setFilter(d.name as typeof TIERS[number]); setRosterPagination(p => ({ ...p, offset: 0 })); }}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-muted/50 text-[10px] md:text-xs transition"
                      >
                        <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                        <span className="text-muted-foreground">{d.name}</span>
                        <span className="font-mono font-bold tabular-nums">{d.value}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="surface-card p-4 md:p-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
              <div>
                <h2 className="font-display text-base md:text-2xl font-bold">Upcoming Sessions</h2>
                <p className="text-sm text-muted-foreground mt-1">Manage your schedule and appointments</p>
              </div>
              <Button onClick={() => setCurrentView("dashboard")} variant="outline" size="sm">
                &larr; Back to Dashboard
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="text-left p-3">Date & Time</th>
                    <th className="text-left p-3">Student</th>
                    <th className="text-left p-3">Level</th>
                    <th className="text-left p-3">Type</th>
                    <th className="text-left p-3">WRS</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-right p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sessionsPageRows.map((s, i) => (
                    <tr key={s.id} className={cn("border-b border-border/60 last:border-0", i % 2 === 0 && "bg-muted/20")}>
                      <td className="p-3 font-medium">
                        <div className="flex flex-col">
                          <span>{new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(s.date))}</span>
                          <span className="text-xs text-muted-foreground">{s.time}</span>
                        </div>
                      </td>
                      <td className="p-3 font-medium">
                        {s.studentName}
                        <div className="text-xs text-muted-foreground">{s.studentId}</div>
                      </td>
                      <td className="p-3 text-muted-foreground">{s.classLevel}</td>
                      <td className="p-3 text-muted-foreground">{s.type}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-mono font-semibold" style={{ backgroundColor: `${colorFromWrs(s.wrs)}25`, color: colorFromWrs(s.wrs) }}>
                          {s.wrs}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={cn(
                          "px-2.5 py-0.5 rounded-full text-xs font-medium",
                          s.status === "Scheduled" || s.status === "Rescheduled" ? "bg-primary/10 text-primary" :
                          s.status === "In Progress" ? "bg-success/15 text-success-foreground" :
                          "bg-muted text-muted-foreground"
                        )}>
                          {s.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleAction(s.id, "join")}
                            disabled={s.status === "Canceled"}
                            className="bg-primary/10 text-primary hover:bg-primary/20"
                          >
                            <Video className="h-4 w-4 mr-1.5" /> Join
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Session Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => navigate(`/counselor/session/${s.studentId}`)}>
                                <FileText className="h-4 w-4 mr-2" /> View Notes
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleAction(s.id, "reschedule")} disabled={s.status === "Canceled"}>
                                <Clock className="h-4 w-4 mr-2" /> Reschedule
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleAction(s.id, "cancel")} disabled={s.status === "Canceled"} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                <XCircle className="h-4 w-4 mr-2" /> Cancel Session
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {sessionsPageRows.length === 0 && (
                    <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No upcoming sessions.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {sessions.length > sessionsPagination.limit && (
              <div className="flex justify-between items-center mt-4 text-xs text-muted-foreground">
                <div>
                  Showing {sessionsPagination.offset + 1}-{Math.min(sessionsPagination.offset + sessionsPagination.limit, sessions.length)} of {sessions.length}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={sessionsPagination.offset === 0} onClick={() => setSessionsPagination(p => ({ ...p, offset: Math.max(0, p.offset - p.limit) }))}>Previous</Button>
                  <Button size="sm" variant="outline" disabled={sessionsPagination.offset + sessionsPagination.limit >= sessions.length} onClick={() => setSessionsPagination(p => ({ ...p, offset: p.offset + p.limit }))}>Next</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

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
