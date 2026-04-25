import { Home, ClipboardList, History, BookOpen, Calendar, ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { AppShell, SidebarItem } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { CrisisBanner } from "@/components/CrisisBanner";
import { RECENT_CHECKINS, colorFromWrs, tierFromWrs } from "@/data/mock";
import { cn } from "@/lib/utils";

const items: SidebarItem[] = [
  { icon: Home, label: "Home", to: "/student", end: true },
  { icon: ClipboardList, label: "Check-in", to: "/student" },
  { icon: Calendar, label: "Appointments", to: "/student/appointments" },
  { icon: History, label: "My History", to: "/student/history" },
  { icon: BookOpen, label: "Resources", to: "/student/resources" },
];

export default function StudentHistory() {
  return (
    <AppShell items={items}>
      <div className="flex items-center justify-between h-16 px-8 border-b border-border">
        <div className="flex items-center gap-3">
          <Link to="/student"><Button variant="ghost" size="icon"><ChevronLeft className="h-4 w-4" /></Button></Link>
          <h1 className="font-display text-xl font-bold">My check-in history</h1>
        </div>
        <ThemeToggle />
      </div>
      <CrisisBanner />
      <div className="p-8 pt-6">
        <div className="glass border border-border rounded-3xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left p-4">Date</th>
                <th className="text-left p-4">Survey type</th>
                <th className="text-left p-4">Risk tier</th>
              </tr>
            </thead>
            <tbody>
              {RECENT_CHECKINS.map((c, i) => {
                const color = colorFromWrs(c.wrs);
                const tier = tierFromWrs(c.wrs);
                return (
                  <tr key={i} className="border-t border-border hover:bg-muted/30">
                    <td className="p-4 font-medium">{c.date}</td>
                    <td className="p-4 text-muted-foreground">{c.type}</td>
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
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
