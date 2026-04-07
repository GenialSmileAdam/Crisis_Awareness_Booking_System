import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppLayout } from "@/components/AppLayout";
import { mockAppointments } from "@/data/mockData";
import { CalendarPlus, History, Brain, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";

const StudentDashboard = () => {
  const navigate = useNavigate();
  const upcoming = mockAppointments.filter(a => a.studentId === "s1" && a.status !== "completed").slice(0, 3);

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Student Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="cursor-pointer hover:shadow-md transition" onClick={() => navigate("/student/book-appointment")}>
            <CardContent className="flex items-center gap-3 p-6">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <CalendarPlus className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Book Appointment</p>
                <p className="text-sm text-muted-foreground">Schedule a session</p>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition" onClick={() => navigate("/student/sessions")}>
            <CardContent className="flex items-center gap-3 p-6">
              <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <History className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="font-medium">My Sessions</p>
                <p className="text-sm text-muted-foreground">View past sessions</p>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition" onClick={() => navigate("/student/ai-summary")}>
            <CardContent className="flex items-center gap-3 p-6">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Brain className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">AI Summary</p>
                <p className="text-sm text-muted-foreground">View insights</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Upcoming Appointments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcoming.length === 0 && <p className="text-sm text-muted-foreground">No upcoming appointments.</p>}
              {upcoming.map((apt) => (
                <div key={apt.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium text-sm">{apt.counselorName}</p>
                    <p className="text-xs text-muted-foreground">{apt.date} at {apt.time}</p>
                  </div>
                  <Badge variant={apt.status === "confirmed" ? "default" : "secondary"}>{apt.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Heart className="h-5 w-5 text-accent" /> Wellness Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Overall Wellness</span>
                  <span className="font-semibold text-primary">78/100</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2.5">
                  <div className="bg-primary h-2.5 rounded-full" style={{ width: "78%" }} />
                </div>
                <p className="text-sm text-muted-foreground">Your wellness score has improved by 5 points since last month. Keep up the great work!</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default StudentDashboard;
