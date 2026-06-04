import { useState } from "react";
import { ChevronLeft, LogOut, ClipboardList } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { AppShell } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { CrisisBanner } from "@/components/CrisisBanner";
import { useStudentCheckins } from "@/hooks/queries";
import { colorFromWrs, tierFromWrs } from "@/data/mock";
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

const PAGE_SIZE = 10;

export default function StudentHistory() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const studentId = user?.student_id;
  const [offset, setOffset] = useState(0);

  const checkinsQuery = useStudentCheckins(studentId, PAGE_SIZE, offset);

  const checkins = checkinsQuery.data?.data || [];
  const total = checkinsQuery.data?.pagination?.total || 0;
  const loading = checkinsQuery.isPending;

  return (
    <AppShell items={studentSidebarItems}>
      <div className="flex items-center justify-between h-16 px-4 md:px-8 border-b border-border bg-background md:bg-background/60 md:backdrop-blur-sm sticky top-0 z-30">
        <div className="flex items-center gap-2 md:gap-3">
          <Link to="/student">
            <Button variant="ghost" size="icon" className="h-8 w-8 md:h-10 md:w-10">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="font-display text-lg md:text-xl font-bold">My check-in history</h1>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={() => { logout(); navigate("/login"); }} className="md:hidden rounded-full h-9 w-9">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <CrisisBanner />

      <div className="p-4 md:p-8 pt-4 md:pt-6">
        {loading ? (
          <div className="glass border border-border rounded-3xl overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 border-t border-border first:border-0 bg-muted/20 animate-pulse" />
            ))}
          </div>
        ) : checkins.length === 0 ? (
          <div className="glass border border-border rounded-3xl flex flex-col items-center justify-center py-16 gap-3">
            <ClipboardList className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground text-sm">No check-ins recorded yet.</p>
            <Link to="/student">
              <Button size="sm" className="gradient-primary text-primary-foreground border-0">
                Take your first check-in
              </Button>
            </Link>
          </div>
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
                  {checkins.map((c) => {
                    const wrs = checkinWrs(c);
                    const color = wrs !== null ? colorFromWrs(wrs) : "#6B7280";
                    const tier = wrs !== null ? tierFromWrs(wrs) : null;
                    return (
                      <tr key={c.id} className="border-t border-border hover:bg-muted/30">
                        <td className="p-4 font-medium">
                          {new Date(c.submitted_at).toLocaleDateString("en-GB", {
                            day: "numeric", month: "short", year: "numeric",
                          })}
                        </td>
                        <td className="p-4 text-muted-foreground">{typeLabel(c.type)}</td>
                        <td className="p-4">
                          {c.score !== null ? (
                            <span className="font-mono text-xs">{c.score}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="p-4">
                          {tier ? (
                            <span
                              className={cn(
                                "text-xs px-2.5 py-0.5 rounded-full font-medium",
                                tier === "Critical" && "animate-pulse",
                              )}
                              style={{ backgroundColor: `${color}25`, color }}
                            >
                              {tier}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">N/A</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {total > PAGE_SIZE && (
              <div className="flex justify-between items-center mt-4 text-xs text-muted-foreground">
                <div>
                  Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm" variant="outline"
                    disabled={offset === 0}
                    onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm" variant="outline"
                    disabled={offset + PAGE_SIZE >= total}
                    onClick={() => setOffset(offset + PAGE_SIZE)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
