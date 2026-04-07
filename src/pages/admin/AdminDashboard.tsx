import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/AppLayout";
import { mockStudents, mockCounselors, mockSessions, mockAppointments } from "@/data/mockData";
import { Monitor, AlertOctagon, ArrowUpRight, Clock, MoreVertical } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const AdminDashboard = () => {
  const [chartView, setChartView] = useState<"Weekly" | "Monthly">("Monthly");

  const stats = [
    { label: "Total Sessions", value: "2,842", change: "+12.4%", icon: Monitor, bgColor: "bg-card", textColor: "text-foreground" },
    { label: "Active Alerts", value: "08", badge: "URGENT", icon: AlertOctagon, bgColor: "bg-accent", textColor: "text-accent-foreground" },
    { label: "System Uptime", value: "99.9%", icon: ArrowUpRight, bgColor: "bg-card", textColor: "text-foreground" },
    { label: "Avg. Response", value: "1.4m", icon: Clock, bgColor: "bg-accent", textColor: "text-accent-foreground" },
  ];

  const barData = [
    { day: "MON", value: 60 }, { day: "TUE", value: 75 }, { day: "WED", value: 100 },
    { day: "THU", value: 55 }, { day: "FRI", value: 65 }, { day: "SAT", value: 40 }, { day: "SUN", value: 50 },
  ];

  const alerts = [
    { severity: "HIGH SEVERITY", time: "2m ago", title: "Session ID #902-X", description: "Potential self-harm keywords detected in active session. Escalating to supervisor.", action: "INTERCEPT", color: "text-accent" },
    { severity: "MEDIUM SEVERITY", time: "14m ago", title: "Queue Warning", description: "Wait times for Tier 2 counselors exceeding 5 minutes in Region West.", color: "text-amber-600" },
  ];

  const leaderboard = [
    { name: "Dr. Sarah Jenkins", role: "Crisis Intervention Specialist", score: "98.2%", rank: 1 },
    { name: "Michael Chen", role: "Senior Outreach Manager", score: "96.5%", rank: 2 },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard Overview</h1>
            <p className="text-muted-foreground">Monitoring global crisis response and counselor performance metrics.</p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">System Status:</span>
            <span className="font-semibold">Active</span>
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <Card key={i} className={`${s.bgColor} ${s.textColor} border-0 shadow-sm`}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className={`h-10 w-10 rounded-xl ${s.bgColor === "bg-accent" ? "bg-accent-foreground/20" : "bg-secondary"} flex items-center justify-center`}>
                    <s.icon className="h-5 w-5" />
                  </div>
                  {s.change && <span className="text-xs font-semibold text-emerald-500">{s.change}</span>}
                  {s.badge && <Badge className="bg-accent-foreground/20 text-accent-foreground border-0 text-[10px]">{s.badge}</Badge>}
                </div>
                <p className="text-xs uppercase tracking-wider opacity-70">{s.label}</p>
                <p className="text-3xl font-bold mt-1">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart */}
          <Card className="lg:col-span-2">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold">Crisis Activity Trend</h3>
                  <p className="text-sm text-muted-foreground">Real-time engagement tracking per hour</p>
                </div>
                <div className="flex gap-2">
                  {(["Weekly", "Monthly"] as const).map((v) => (
                    <Button key={v} size="sm" variant={chartView === v ? "default" : "outline"} onClick={() => setChartView(v)}>
                      {v}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex items-end justify-between h-48 px-4">
                {barData.map((bar) => (
                  <div key={bar.day} className="flex flex-col items-center gap-2 flex-1">
                    <div className="relative w-full flex justify-center">
                      {bar.value === 100 && (
                        <div className="absolute -top-7 bg-primary text-primary-foreground text-[10px] px-2 py-0.5 rounded font-semibold">420</div>
                      )}
                      <div
                        className={`w-10 rounded-lg ${bar.value === 100 ? "bg-primary" : "bg-secondary"}`}
                        style={{ height: `${bar.value * 1.8}px` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase">{bar.day}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Alerts */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Recent Alerts</h3>
              <MoreVertical className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="space-y-4">
              {alerts.map((alert, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[10px] uppercase font-bold ${alert.color}`}>{alert.severity}</span>
                      <span className="text-[10px] text-muted-foreground">{alert.time}</span>
                    </div>
                    <p className="font-semibold text-sm mb-1">{alert.title}</p>
                    <p className="text-xs text-muted-foreground mb-3">{alert.description}</p>
                    {alert.action && (
                      <Button size="sm" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground text-xs font-bold">
                        {alert.action}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Leaderboard */}
        <Card className="max-w-2xl">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold mb-6">Counselor Performance Leaderboard</h3>
            <div className="space-y-4">
              {leaderboard.map((person) => (
                <div key={person.rank} className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-secondary text-sm">
                        {person.name.split(" ").map(n => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold border-2 border-card">
                      {person.rank}
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{person.name}</p>
                    <p className="text-xs text-muted-foreground">{person.role}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">{person.score}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Satisfaction</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default AdminDashboard;
