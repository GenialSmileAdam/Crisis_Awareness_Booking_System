import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppLayout } from "@/components/AppLayout";
import { mockAppointments, mockStudents, mockSessions } from "@/data/mockData";
import { useNavigate } from "react-router-dom";
import { Users, CalendarCheck, Clock } from "lucide-react";

const CounselorDashboard = () => {
  const navigate = useNavigate();
  const todayAppointments = mockAppointments.filter(a => a.counselorId === "c1");
  const assignedStudents = mockStudents.slice(0, 3);

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Counselor Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="flex items-center gap-3 p-6">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <CalendarCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{todayAppointments.length}</p>
                <p className="text-sm text-muted-foreground">Today's Appointments</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-6">
              <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{assignedStudents.length}</p>
                <p className="text-sm text-muted-foreground">Assigned Students</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-6">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockSessions.filter(s => s.status === "pending").length}</p>
                <p className="text-sm text-muted-foreground">Pending Sessions</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">Today's Appointments</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {todayAppointments.map((apt) => (
                <div key={apt.id} className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-secondary/50" onClick={() => navigate(`/counselor/session/${apt.id}`)}>
                  <div>
                    <p className="font-medium text-sm">{apt.studentName}</p>
                    <p className="text-xs text-muted-foreground">{apt.time} · {apt.type}</p>
                  </div>
                  <Badge variant={apt.status === "confirmed" ? "default" : "secondary"}>{apt.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Assigned Students</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {assignedStudents.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium text-sm">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.grade} · Wellness: {s.wellnessScore}/100</p>
                  </div>
                  <Badge variant={s.wellnessScore >= 70 ? "default" : "destructive"}>
                    {s.wellnessScore >= 70 ? "Good" : "At Risk"}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default CounselorDashboard;
