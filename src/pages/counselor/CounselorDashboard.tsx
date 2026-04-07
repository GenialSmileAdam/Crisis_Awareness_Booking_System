import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppLayout } from "@/components/AppLayout";
import { mockAppointments, mockCrisisAlerts } from "@/data/mockData";
import { useNavigate } from "react-router-dom";
import { CalendarDays, ChevronRight, FileText, X, AlertTriangle, Plus } from "lucide-react";

const CounselorDashboard = () => {
  const navigate = useNavigate();

  const schedule = mockAppointments.filter(a => a.counselorId === "c1");

  const reports = [
    { title: "Weekly Sentiment Shift", time: "Generated 2 hours ago", description: "Cross-platform analysis indicates a 15% increase in negative..." },
    { title: "Weekly Sentiment Shift", time: "Generated 2 hours ago", description: "Cross-platform analysis indicates a 15% increase in negative..." },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Crisis Alerts */}
        <div>
          <p className="text-xs text-accent font-bold uppercase tracking-wider mb-1">Immediate Attention Required</p>
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold">Crisis Alerts</h1>
            <button className="text-sm text-primary font-semibold hover:underline">View all flags</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mockCrisisAlerts.map((alert) => (
              <Card key={alert.id} className="bg-accent text-accent-foreground overflow-hidden">
                <CardContent className="p-5 relative">
                  <button className="absolute top-3 right-3"><X className="h-5 w-5 text-accent-foreground/70" /></button>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-8 w-8 rounded-full bg-accent-foreground/20 flex items-center justify-center">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-bold text-lg">{alert.name.split(" ")[0]}</p>
                      <p className="font-bold">{alert.name.split(" ")[1]}</p>
                    </div>
                  </div>
                  <p className="text-xs text-accent-foreground/70 mb-1">{alert.age}, {alert.level}</p>
                  <p className="text-xs text-accent-foreground/80 mb-4">{alert.description}</p>
                  <Button variant="secondary" className="w-full bg-accent-foreground/10 text-accent-foreground border-0 hover:bg-accent-foreground/20 font-semibold">
                    Book Emergency Appointment
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Schedule */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Daily Schedule</h2>
              <CalendarDays className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="space-y-3">
              {schedule.map((apt, i) => (
                <Card key={apt.id} className="hover:shadow-md transition cursor-pointer" onClick={() => navigate(`/counselor/session/${apt.id}`)}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className={`w-1 h-12 rounded-full ${i === 0 ? "bg-primary" : i === 1 ? "bg-emerald-500" : "bg-muted-foreground"}`} />
                    <div className="text-xs text-muted-foreground text-center w-12 shrink-0">
                      {apt.time.replace(" ", "\n")}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{apt.studentName}</p>
                      <p className="text-xs text-muted-foreground">{apt.type}</p>
                    </div>
                    {apt.status === "pending" && <Badge variant="secondary" className="text-[10px]">Internal</Badge>}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              ))}
              <button className="w-full text-center text-sm text-primary font-semibold py-3">+ Add Appointment</button>
            </div>
          </div>

          {/* Recent Reports */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Recent Reports</h2>
              <Button variant="ghost" size="icon"><Filter className="h-4 w-4" /></Button>
            </div>
            <div className="space-y-4">
              {reports.map((report, i) => (
                <Card key={i}>
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-sm">{report.title}</p>
                        <p className="text-[10px] text-muted-foreground mb-2">{report.time}</p>
                        <p className="text-xs text-muted-foreground">{report.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex -space-x-2">
                        <div className="h-6 w-6 rounded-full bg-primary text-[8px] text-primary-foreground flex items-center justify-center border-2 border-card">AI</div>
                        <div className="h-6 w-6 rounded-full bg-emerald-500 text-[8px] text-primary-foreground flex items-center justify-center border-2 border-card">DS</div>
                      </div>
                      <button className="text-xs text-accent font-bold uppercase hover:underline">Review Data</button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

const Filter = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
);

export default CounselorDashboard;
