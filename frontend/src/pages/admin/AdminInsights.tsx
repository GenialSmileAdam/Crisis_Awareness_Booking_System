import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { AppShell } from "@/components/AppSidebar";
import { adminSidebarItems } from "@/data/sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { NeonSpinner } from "@/components/NeonSpinner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useOrgInsights } from "@/hooks/queries";
import {
  LogOut, Users2, TrendingUp, TrendingDown, Minus, ShieldAlert, CalendarCheck, Activity,
} from "lucide-react";

const WINDOWS = [
  { label: "30d", value: 30 },
  { label: "90d", value: 90 },
  { label: "1y", value: 365 },
];

function Kpi({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="glass border border-border rounded-2xl p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <Icon className="h-4 w-4" style={color ? { color } : undefined} />
        <span className="text-xs">{label}</span>
      </div>
      <div className="font-display text-2xl font-bold tabular-nums" style={color ? { color } : undefined}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

export default function AdminInsights() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [days, setDays] = useState(30);
  const { data, isLoading } = useOrgInsights(days);

  const movement = data?.tier_movement ?? { improving: 0, worsening: 0, stable: 0 };
  const crisis = data?.crisis_resolution;

  return (
    <AppShell items={adminSidebarItems}>
      <div className="flex items-center justify-between py-4 md:h-16 px-4 md:px-8 border-b border-border bg-background/60 backdrop-blur-sm sticky top-0 z-30">
        <div>
          <h1 className="font-display text-xl md:text-2xl font-bold">Org Insights</h1>
          <p className="text-xs text-muted-foreground">Caseload, throughput, risk movement & crisis response</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-muted/40 p-1 rounded-xl">
            {WINDOWS.map((w) => (
              <button key={w.value} onClick={() => setDays(w.value)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${days === w.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                {w.label}
              </button>
            ))}
          </div>
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={() => { logout(); navigate("/login"); }} className="md:hidden rounded-full h-9 w-9">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading || !data ? (
        <div className="flex items-center justify-center min-h-[60vh]"><NeonSpinner size={40} /></div>
      ) : (
        <div className="p-4 md:p-8 space-y-6 max-w-6xl">

          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Kpi icon={TrendingDown} label="Improving" value={movement.improving} color="#A8FF3E" sub="students trending down in WRS" />
            <Kpi icon={TrendingUp} label="Worsening" value={movement.worsening} color="#FF4560" sub="students trending up in WRS" />
            <Kpi icon={Minus} label="Stable" value={movement.stable} color="#FF8C42" sub="little WRS change" />
            <Kpi
              icon={ShieldAlert}
              label="Crisis resolution"
              value={crisis ? `${crisis.resolved}/${crisis.total}` : "—"}
              color="#B00020"
              sub={crisis?.avg_resolution_hours != null ? `avg ${crisis.avg_resolution_hours}h to resolve` : "no crises in window"}
            />
          </div>

          {/* Caseload distribution */}
          <div className="glass border border-border rounded-3xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users2 className="h-5 w-5 text-primary" />
              <h2 className="font-display text-lg font-bold">Caseload Distribution</h2>
            </div>
            {data.caseload.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No students are currently assigned to counsellors.</p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(180, data.caseload.length * 44)}>
                <BarChart data={data.caseload} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="counselor" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={120} />
                  <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                  <Bar dataKey="students" radius={[0, 6, 6, 0]} fill="#7C5CFC" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Throughput */}
          <div className="glass border border-border rounded-3xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-5 w-5 text-primary" />
              <h2 className="font-display text-lg font-bold">Counsellor Throughput</h2>
              <span className="text-xs text-muted-foreground">completed sessions · last {days}d</span>
            </div>
            {data.throughput.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No completed sessions in this window.</p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(180, data.throughput.length * 44)}>
                <BarChart data={data.throughput} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="counselor" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={120} />
                  <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                  <Bar dataKey="completed" radius={[0, 6, 6, 0]} fill="#A8FF3E" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Attendance trend */}
          <div className="glass border border-border rounded-3xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <CalendarCheck className="h-5 w-5 text-primary" />
              <h2 className="font-display text-lg font-bold">Weekly Attendance</h2>
            </div>
            {data.attendance_trend.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No appointment activity in this window.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.attendance_trend} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="week" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                  <Bar dataKey="completed" stackId="a" fill="#A8FF3E" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="no_show" stackId="a" fill="#FF4560" />
                  <Bar dataKey="cancelled" stackId="a" fill="#FF8C42" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
            <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#A8FF3E]" /> Completed</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#FF4560]" /> No-show</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#FF8C42]" /> Cancelled</span>
            </div>
          </div>

        </div>
      )}
    </AppShell>
  );
}
