import { useState, useMemo } from "react";
import { ChevronLeft, LogOut, ClipboardList, Calendar } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { AppShell } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { CrisisBanner } from "@/components/CrisisBanner";
import { useStudentCheckins } from "@/hooks/queries";
import { useStudentAppointments } from "@/hooks/queries";
import { colorFromWrs, tierFromWrs } from "@/lib/wrs";
import { cn } from "@/lib/utils";
import { studentSidebarItems } from "@/data/sidebar";

function checkinWrs(c: { type: string; score?: number | null }): number | null {
  if ((c.type === "phq9" || c.type === "gad7") && c.score !== null && c.score !== undefined) {
    return Math.round((c.score / 27) * 100);
  }
  return null;
}

function typeLabel(t: string) {
  switch (t) {
    case "phq9": return "PHQ-9";
    case "gad7": return "GAD-7";
    case "pulse": return "Pulse";
    case "crisis": return "Crisis";
    default: return t.toUpperCase();
  }
}

type TabType = "all" | "checkins" | "sessions";

const PAGE_SIZE = 20;

export default function StudentHistory() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const studentId = user?.student_id;
  const [tab, setTab] = useState<TabType>("all");
  const [checkinsOffset, setCheckinsOffset] = useState(0);
  const [sessionsOffset, setSessionsOffset] = useState(0);

  const checkinsQuery = useStudentCheckins(studentId, PAGE_SIZE, checkinsOffset);
  const appointmentsQuery = useStudentAppointments(studentId ?? "", PAGE_SIZE, sessionsOffset);

  const checkins = checkinsQuery.data?.data || [];
  const checkinsTotal = checkinsQuery.data?.pagination?.total || 0;
  const appointments = (appointmentsQuery.data?.data || []).filter(a => a.status === "completed");
  const sessionsTotal = (appointmentsQuery.data?.data || []).filter(a => a.status === "completed").length;

  const loading = checkinsQuery.isPending || (!!studentId && appointmentsQuery.isPending);

  // Build unified timeline for "all" tab
  const timeline = useMemo(() => {
    if (tab !== "all") return [];
    const items = [
      ...checkins.map(c => ({ kind: "checkin" as const, date: c.submitted_at, data: c })),
      ...appointments.map(a => ({ kind: "session" as const, date: a.start_time, data: a })),
    ];
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [checkins, appointments, tab]);

  const TABS: { id: TabType; label: string }[] = [
    { id: "all", label: "All" },
    { id: "checkins", label: "Check-ins" },
    { id: "sessions", label: "Sessions" },
  ];

  return (
    <AppShell items={studentSidebarItems}>
      <div className="flex items-center justify-between h-16 px-4 md:px-8 border-b border-border bg-background md:bg-background/60 md:backdrop-blur-sm sticky top-0 z-30">
        <div className="flex items-center gap-2 md:gap-3">
          <Link to="/student">
            <Button variant="ghost" size="icon" className="h-8 w-8 md:h-10 md:w-10">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="font-display text-lg md:text-xl font-bold">My history</h1>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={() => { logout(); navigate("/login"); }} className="md:hidden rounded-full h-9 w-9">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <CrisisBanner />

      <div className="p-4 md:p-8 pt-4 md:pt-6 space-y-4">
        {/* Tab bar */}
        <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
                tab === t.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="glass border border-border rounded-3xl overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 border-t border-border first:border-0 bg-muted/20 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* All tab — unified timeline */}
            {tab === "all" && (
              timeline.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="glass border border-border rounded-3xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="text-left p-4">Date</th>
                        <th className="text-left p-4">Type</th>
                        <th className="text-left p-4">Detail</th>
                        <th className="text-left p-4">Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {timeline.map((item, idx) => {
                        if (item.kind === "checkin") {
                          const c = item.data;
                          const wrs = checkinWrs(c);
                          const color = wrs !== null ? colorFromWrs(wrs) : "#6B7280";
                          const tier = wrs !== null ? tierFromWrs(wrs) : null;
                          return (
                            <tr key={idx} className="border-t border-border hover:bg-muted/30">
                              <td className="p-4 font-medium">
                                {new Date(c.submitted_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                              </td>
                              <td className="p-4">
                                <span className="flex items-center gap-1.5 text-muted-foreground">
                                  <ClipboardList className="h-3.5 w-3.5" />
                                  {typeLabel(c.type)}
                                </span>
                              </td>
                              <td className="p-4 text-muted-foreground">
                                {c.score !== null && c.score !== undefined ? (
                                  <span className="font-mono text-xs">Score {c.score}</span>
                                ) : "—"}
                              </td>
                              <td className="p-4">
                                {tier ? (
                                  <span
                                    className={cn("text-xs px-2.5 py-0.5 rounded-full font-medium", tier === "Critical" && "animate-pulse")}
                                    style={{ backgroundColor: `${color}25`, color }}
                                  >
                                    {tier}
                                  </span>
                                ) : <span className="text-xs text-muted-foreground">N/A</span>}
                              </td>
                            </tr>
                          );
                        } else {
                          const a = item.data;
                          return (
                            <tr key={idx} className="border-t border-border hover:bg-muted/30">
                              <td className="p-4 font-medium">
                                {new Date(a.start_time).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                              </td>
                              <td className="p-4">
                                <span className="flex items-center gap-1.5 text-muted-foreground">
                                  <Calendar className="h-3.5 w-3.5" />
                                  Session
                                </span>
                              </td>
                              <td className="p-4 text-muted-foreground text-xs">{a.psychologist_full_name || "—"}</td>
                              <td className="p-4">
                                <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-green-500/15 text-green-600">Completed</span>
                              </td>
                            </tr>
                          );
                        }
                      })}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {/* Check-ins tab */}
            {tab === "checkins" && (
              checkins.length === 0 ? (
                <EmptyState message="No check-ins recorded yet." />
              ) : (
                <>
                  <div className="glass border border-border rounded-3xl overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                        <tr>
                          <th className="text-left p-4">Date</th>
                          <th className="text-left p-4">Survey type</th>
                          <th className="text-left p-4">Score</th>
                          <th className="text-left p-4">Risk tier</th>
                        </tr>
                      </thead>
                      <tbody>
                        {checkins.map(c => {
                          const wrs = checkinWrs(c);
                          const color = wrs !== null ? colorFromWrs(wrs) : "#6B7280";
                          const tier = wrs !== null ? tierFromWrs(wrs) : null;
                          return (
                            <tr key={c.id} className="border-t border-border hover:bg-muted/30">
                              <td className="p-4 font-medium">
                                {new Date(c.submitted_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                              </td>
                              <td className="p-4 text-muted-foreground">{typeLabel(c.type)}</td>
                              <td className="p-4">
                                {c.score !== null ? <span className="font-mono text-xs">{c.score}</span> : <span className="text-muted-foreground">—</span>}
                              </td>
                              <td className="p-4">
                                {tier ? (
                                  <span
                                    className={cn("text-xs px-2.5 py-0.5 rounded-full font-medium", tier === "Critical" && "animate-pulse")}
                                    style={{ backgroundColor: `${color}25`, color }}
                                  >
                                    {tier}
                                  </span>
                                ) : <span className="text-xs text-muted-foreground">N/A</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <Pagination offset={checkinsOffset} total={checkinsTotal} pageSize={PAGE_SIZE} onChange={setCheckinsOffset} />
                </>
              )
            )}

            {/* Sessions tab */}
            {tab === "sessions" && (
              appointments.length === 0 ? (
                <EmptyState message="No completed sessions yet." />
              ) : (
                <>
                  <div className="glass border border-border rounded-3xl overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                        <tr>
                          <th className="text-left p-4">Date</th>
                          <th className="text-left p-4">Psychologist</th>
                          <th className="text-left p-4">Duration</th>
                          <th className="text-left p-4">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {appointments.map(a => {
                          const duration = Math.round(
                            (new Date(a.end_time).getTime() - new Date(a.start_time).getTime()) / 60000
                          );
                          return (
                            <tr key={a.id} className="border-t border-border hover:bg-muted/30">
                              <td className="p-4 font-medium">
                                {new Date(a.start_time).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                              </td>
                              <td className="p-4 text-muted-foreground">{a.psychologist_full_name || "—"}</td>
                              <td className="p-4 text-muted-foreground">{duration} min</td>
                              <td className="p-4">
                                <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-green-500/15 text-green-600">Completed</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <Pagination offset={sessionsOffset} total={sessionsTotal} pageSize={PAGE_SIZE} onChange={setSessionsOffset} />
                </>
              )
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

function EmptyState({ message = "Nothing recorded yet." }: { message?: string }) {
  return (
    <div className="glass border border-border rounded-3xl flex flex-col items-center justify-center py-16 gap-3">
      <ClipboardList className="h-10 w-10 text-muted-foreground/40" />
      <p className="text-muted-foreground text-sm">{message}</p>
      <Link to="/student">
        <Button size="sm" className="gradient-primary text-primary-foreground border-0">
          Go to dashboard
        </Button>
      </Link>
    </div>
  );
}

function Pagination({ offset, total, pageSize, onChange }: { offset: number; total: number; pageSize: number; onChange: (o: number) => void }) {
  if (total <= pageSize) return null;
  return (
    <div className="flex justify-between items-center text-xs text-muted-foreground">
      <div>Showing {offset + 1}–{Math.min(offset + pageSize, total)} of {total}</div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" disabled={offset === 0} onClick={() => onChange(Math.max(0, offset - pageSize))}>Previous</Button>
        <Button size="sm" variant="outline" disabled={offset + pageSize >= total} onClick={() => onChange(offset + pageSize)}>Next</Button>
      </div>
    </div>
  );
}
