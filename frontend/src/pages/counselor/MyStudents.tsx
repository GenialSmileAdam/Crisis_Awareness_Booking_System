import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ArrowUpDown, AlertTriangle, MoreHorizontal, LogOut, ChevronLeft, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppSidebar";
import { counselorSidebarItems } from "@/data/sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { FACULTY_WRS, colorFromWrs, RiskTier } from "@/data/mock";
import { getRiskAlerts, getRiskCohort, overrideRiskTier } from "@/api/riskScores";
import { listStudents } from "@/api/students";
import { cn, formatWRS } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from "recharts";
import { toast } from "sonner";

const TIERS = ["All", "Green", "Amber", "Red", "Critical", "No Data"] as const;

export default function MyStudents() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [filter, setFilter] = useState<typeof TIERS[number]>("All");
  const [facultyFilter, setFacultyFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortDesc, setSortDesc] = useState(true);
  
  const [students, setStudents] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [cohort, setCohort] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [rosterPagination, setRosterPagination] = useState({ limit: 10, offset: 0 });
  const [overrides, setOverrides] = useState<Record<string, RiskTier>>({});
  const [overrideModal, setOverrideModal] = useState<{ id: string; name: string; currentTier: string; newTier: string; justification: string } | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        setError(null);
        const [studentsData, alertsData, cohortData] = await Promise.all([
          listStudents(1000, 0), // Fetch more for local filtering/sorting
          getRiskAlerts(1000, 0),
          getRiskCohort()
        ]);
        setStudents(studentsData.data || []);
        setAlerts(alertsData.data || []);
        setCohort(cohortData || []);
      } catch (err) {
        setError("Failed to load students data");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const colorFromTier = (t: string) => {
    switch (t.toLowerCase()) {
      case "green": return "#A8FF3E";
      case "amber": return "#FF8C42";
      case "red": return "#FF4560";
      case "critical": return "#B00020";
      default: return "#6B7280"; // Grey for No Data
    }
  };

  const tierData = useMemo(() => {
    const tierCounts: { [key: string]: number } = {
      Green: 0,
      Amber: 0,
      Red: 0,
      Critical: 0,
      "No Data": 0
    };
    
    students.forEach((student) => {
      const matchingAlert = alerts.find((a) => a.student_id === student.student_id);
      if (!matchingAlert || !matchingAlert.tier) {
        tierCounts["No Data"]++;
      } else {
        const tier = matchingAlert.tier.charAt(0).toUpperCase() + matchingAlert.tier.slice(1).toLowerCase();
        if (tierCounts[tier] !== undefined) {
          tierCounts[tier]++;
        }
      }
    });
    
    return [
      { name: "Green", value: tierCounts.Green, color: "#A8FF3E" },
      { name: "Amber", value: tierCounts.Amber, color: "#FF8C42" },
      { name: "Red", value: tierCounts.Red, color: "#FF4560" },
      { name: "Critical", value: tierCounts.Critical, color: "#B00020" },
      { name: "No Data", value: tierCounts["No Data"], color: "#6B7280" },
    ].filter(d => d.value > 0);
  }, [students, alerts]);

  const rows = useMemo(() => {
    let r = [...students];
    
    // Tier filter
    if (filter !== "All") {
      r = r.filter((s) => {
        const matchingAlert = alerts.find((a) => a.student_id === s.student_id);
        const tier = matchingAlert?.tier ? (matchingAlert.tier.charAt(0).toUpperCase() + matchingAlert.tier.slice(1).toLowerCase()) : "No Data";
        return tier === filter;
      });
    }

    // Faculty filter
    if (facultyFilter) r = r.filter((s) => s.faculty === facultyFilter);

    // Search filter
    if (search) {
      r = r.filter((s) => 
        (s.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
        String(s.student_id || "").toLowerCase().includes(search.toLowerCase())
      );
    }

    // Sorting
    r.sort((a, b) => {
      const aAlert = alerts.find((al) => al.student_id === a.student_id);
      const bAlert = alerts.find((al) => al.student_id === b.student_id);
      const aWrs = aAlert?.wrs_score ?? -1;
      const bWrs = bAlert?.wrs_score ?? -1;
      return sortDesc ? bWrs - aWrs : aWrs - bWrs;
    });

    return r;
  }, [filter, facultyFilter, search, sortDesc, students, alerts]);

  const rosterPageRows = rows.slice(rosterPagination.offset, rosterPagination.offset + rosterPagination.limit);

  const handleOverrideSubmit = async () => {
    if (!overrideModal) return;
    if (overrideModal.justification.trim().length < 20) {
      toast.error("Please provide a detailed justification");
      return;
    }
    
    try {
      await overrideRiskTier(overrideModal.id, {
        override_tier: overrideModal.newTier.toLowerCase(),
        justification: overrideModal.justification
      });
      setOverrides((prev) => ({ ...prev, [overrideModal.id]: overrideModal.newTier.toLowerCase() as RiskTier }));
      toast.success(`Risk tier overridden for ${overrideModal.name}`);
      setOverrideModal(null);
    } catch (err) {
      toast.error("Failed to override risk tier");
    }
  };

  return (
    <AppShell items={counselorSidebarItems}>
      <div className="flex items-start md:items-center justify-between py-4 md:h-16 px-4 md:px-8 border-b border-border bg-background md:bg-background/60 md:backdrop-blur-sm sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate("/counselor")} className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h1 className="font-display text-lg md:text-xl font-bold">My Students</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={() => { logout(); navigate("/login"); }} className="md:hidden rounded-full h-9 w-9">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="p-4 md:p-8 space-y-6">
        <div className="grid lg:grid-cols-12 gap-6 animate-fade-in">
          {/* Left col — Risk table */}
          <div className="lg:col-span-8 surface-card p-4 md:p-6">
            <div className="mb-6">
              <div className="mb-4">
                <h2 className="font-display text-lg font-bold">Risk Roster</h2>
                <p className="text-xs text-muted-foreground">Sorted by WRS score</p>
              </div>
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setRosterPagination(p => ({ ...p, offset: 0 })); }}
                    placeholder="Search student..."
                    className="pl-10 h-10 w-full"
                  />
                </div>
                
                <div className="flex overflow-x-auto scrollbar-none gap-1 p-1 rounded-full bg-muted w-full md:w-auto whitespace-nowrap">
                  {TIERS.map((t) => (
                    <button
                      key={t}
                      onClick={() => { setFilter(t); setRosterPagination(p => ({ ...p, offset: 0 })); }}
                      className={cn(
                        "px-4 py-1.5 text-xs font-semibold rounded-full transition text-center",
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
                    <th className="text-left p-3">
                      <button onClick={() => setSortDesc(!sortDesc)} className="inline-flex items-center gap-1 hover:text-foreground">
                        WRS <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="text-left p-3">Tier</th>
                    <th className="text-right p-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-border/60 last:border-0">
                        <td colSpan={5} className="p-3"><div className="h-6 bg-muted rounded animate-pulse" /></td>
                      </tr>
                    ))
                  ) : rosterPageRows.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No students match your filters.</td></tr>
                  ) : (
                    rosterPageRows.map((s, i) => {
                      const matchingAlert = alerts.find((a) => a.student_id === s.student_id);
                      const baseTierRaw = matchingAlert?.tier;
                      const baseTier = baseTierRaw ? (baseTierRaw.charAt(0).toUpperCase() + baseTierRaw.slice(1).toLowerCase()) : "No Data";
                      
                      const isOverridden = !!overrides[s.student_id];
                      const currentTier = isOverridden ? (overrides[s.student_id]!.charAt(0).toUpperCase() + overrides[s.student_id]!.slice(1).toLowerCase()) : baseTier;
                      
                      const color = colorFromTier(currentTier);
                      const wrsScore = matchingAlert?.wrs_score;
                      
                      return (
                        <tr key={s.student_id} className={cn("border-b border-border/60 last:border-0 hover:bg-primary/5 transition", i % 2 === 0 && "bg-muted/20")}>
                          <td className="p-3">
                            <div className="font-medium text-xs md:text-sm">{s.full_name}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">{s.student_id}</div>
                          </td>
                          <td className="hidden md:table-cell p-3 text-muted-foreground">{s.class_level || "—"}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] md:text-xs font-mono font-semibold" style={{ backgroundColor: wrsScore !== undefined ? `${colorFromWrs(wrsScore)}25` : "transparent", color: wrsScore !== undefined ? colorFromWrs(wrsScore) : "currentColor" }}>
                              {formatWRS(wrsScore)}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <span
                                className={cn("text-[10px] md:text-xs px-2.5 py-0.5 rounded-full font-medium", currentTier === "Critical" && "animate-pulse")}
                                style={{ backgroundColor: `${color}25`, color }}
                              >
                                {currentTier}
                              </span>
                              {isOverridden && (
                                <span className="hidden sm:inline-block text-[10px] uppercase tracking-wider font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                  Manual
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline" onClick={() => navigate(`/counselor/student/${s.student_id}`)} className="h-7 text-[10px] md:h-8 md:text-xs px-2">
                                View
                              </Button>
                              <Button size="sm" variant="secondary" onClick={() => setOverrideModal({ id: s.student_id, name: s.full_name, currentTier: baseTier, newTier: baseTier === "No Data" ? "Green" : baseTier, justification: "" })} className="h-7 text-[10px] md:h-8 md:text-xs px-2">
                                Override
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
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
                  <Button 
                    size="sm" 
                    variant="outline" 
                    disabled={rosterPagination.offset + rosterPagination.limit >= rows.length}
                    onClick={() => setRosterPagination(p => ({ ...p, offset: p.offset + p.limit }))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Right col — charts */}
          <div className="lg:col-span-4 space-y-6">
            <div className="surface-card p-4 md:p-6">
              <div className="label-eyebrow mb-1">Faculty WRS</div>
              <div className="font-display text-sm font-bold mb-4">Click bar to filter</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={FACULTY_WRS} margin={{ top: 20, right: 8, bottom: 0, left: -20 }}>
                  <XAxis dataKey="faculty" tick={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
                  <Bar dataKey="avg" radius={[6, 6, 0, 0]} cursor="pointer" onClick={(d: any) => { setFacultyFilter(d.faculty); setRosterPagination(p => ({ ...p, offset: 0 })); }}>
                    {FACULTY_WRS.map((d, i) => (
                      <Cell key={i} fill={colorFromWrs(d.avg)} opacity={facultyFilter && facultyFilter !== d.faculty ? 0.3 : 1} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="surface-card p-4 md:p-6">
              <div className="label-eyebrow mb-1">At-risk summary</div>
              <div className="font-display text-sm font-bold mb-4">Tier distribution</div>
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
                      onClick={(d: any) => { setFilter(d.name as typeof TIERS[number]); setRosterPagination(p => ({ ...p, offset: 0 })); }}
                    >
                      {tierData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-2 mt-4 w-full">
                  {tierData.map((d) => (
                    <button
                      key={d.name}
                      onClick={() => { setFilter(d.name as typeof TIERS[number]); setRosterPagination(p => ({ ...p, offset: 0 })); }}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-muted/50 text-[10px] transition"
                    >
                      <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                      <span className="text-muted-foreground">{d.name}</span>
                      <span className="font-mono font-bold">{d.value}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
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
                <div className="text-sm font-medium">Justification (min 20 chars)</div>
                <Textarea
                  placeholder="Why are you overriding the automated risk assessment?"
                  value={overrideModal.justification}
                  onChange={(e) => setOverrideModal({ ...overrideModal, justification: e.target.value })}
                  className="h-24"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOverrideModal(null)}>Cancel</Button>
            <Button onClick={handleOverrideSubmit} className="gradient-primary text-primary-foreground border-0">Confirm Override</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
