import { useEffect, useState } from "react";
import { Home, ClipboardList, History, BookOpen, Calendar, ChevronLeft, MessageSquare, LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import { AppShell, SidebarItem } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { CrisisBanner } from "@/components/CrisisBanner";
import { colorFromWrs, tierFromWrs } from "@/data/mock";
import { cn } from "@/lib/utils";
import { studentSidebarItems } from "@/data/sidebar";
import { getStudentCheckins, CheckinRecord } from "@/api/checkins";

export default function StudentHistory() {
  const { user, logout } = useAuth();
  const [checkins, setCheckins] = useState<CheckinRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, limit: 10, offset: 0, has_next: false });

  useEffect(() => {
    if (!user?.student_id) return;

    const fetchHistory = async () => {
      try {
        setLoading(true);
        const data = await getStudentCheckins(user.student_id!, pagination.limit, pagination.offset);
        setCheckins(data.data || []);
        setPagination(prev => ({
          ...prev,
          total: data.pagination.total,
          has_next: data.pagination.has_next
        }));
      } catch (err) {
        console.error("Failed to fetch history:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [user?.student_id, pagination.offset, pagination.limit]);

  const pageRows = checkins;

  return (
    <AppShell items={studentSidebarItems}>
      <div className="flex items-center justify-between h-16 px-4 md:px-8 border-b border-border bg-background md:bg-background/60 md:backdrop-blur-sm sticky top-0 z-30">
        <div className="flex items-center gap-2 md:gap-3">
          <Link to="/student"><Button variant="ghost" size="icon" className="h-8 w-8 md:h-10 md:w-10"><ChevronLeft className="h-4 w-4" /></Button></Link>
          <h1 className="font-display text-lg md:text-xl font-bold">My check-in history</h1>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={() => logout()} className="md:hidden rounded-full h-9 w-9">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <CrisisBanner />
      <div className="p-4 md:p-8 pt-4 md:pt-6">
        <div className="glass border border-border rounded-3xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left p-4">Date</th>
                <th className="text-left p-4">Survey type</th>
                <th className="text-left p-4">Risk tier</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-t border-border">
                    <td colSpan={3} className="p-4"><div className="h-6 bg-muted rounded animate-pulse" /></td>
                  </tr>
                ))
              ) : pageRows.length === 0 ? (
                <tr><td colSpan={3} className="p-8 text-center text-muted-foreground">No check-in history found.</td></tr>
              ) : (
                pageRows.map((c, i) => {
                  const color = colorFromWrs(c.score || 0);
                  const tier = tierFromWrs(c.score || 0);
                  return (
                    <tr key={i} className="border-t border-border hover:bg-muted/30">
                      <td className="p-4 font-medium">{new Date(c.submitted_at).toLocaleDateString()}</td>
                      <td className="p-4 text-muted-foreground capitalize">{c.type}</td>
                      <td className="p-4">
                        <span
                          className={cn("text-xs px-2.5 py-0.5 rounded-full font-medium", tier === "Critical" && "animate-pulse")}
                          style={{ backgroundColor: `${color}25`, color }}
                        >
                          {tier}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {pagination.total > pagination.limit && (
          <div className="flex justify-between items-center mt-4 text-xs text-muted-foreground">
            <div>
              Showing {pagination.offset + 1}-{Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={pagination.offset === 0} onClick={() => setPagination(p => ({ ...p, offset: Math.max(0, p.offset - p.limit) }))}>Previous</Button>
              <Button size="sm" variant="outline" disabled={pagination.offset + pagination.limit >= RECENT_CHECKINS.length} onClick={() => setPagination(p => ({ ...p, offset: p.offset + p.limit }))}>Next</Button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
