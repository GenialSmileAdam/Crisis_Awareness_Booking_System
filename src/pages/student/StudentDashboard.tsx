import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppLayout } from "@/components/AppLayout";
import { mockAppointments } from "@/data/mockData";
import { ChevronRight, BookOpen, Headphones, Smile } from "lucide-react";
import { useNavigate } from "react-router-dom";

const StudentDashboard = () => {
  const navigate = useNavigate();

  const recentHistory = [
    { date: "Oct 12, 2023", title: "Weekly Check-in Complete", detail: "Mood: Moderate • Energy: High", color: "bg-primary" },
    { date: "Oct 05, 2023", title: "Monthly Group Workshop", detail: "Topic: Mindfulness at Work", color: "bg-primary" },
    { date: "Sep 28, 2023", title: "Session with Dr. Jenkins", detail: "Outcome: Cognitive Mapping", color: "bg-emerald-500" },
  ];

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl">
        {/* Hero */}
        <Card className="overflow-hidden">
          <CardContent className="p-8 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 border-0 text-xs">😊 Stable</Badge>
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Hello, Alex Rivera.</h1>
              <p className="text-muted-foreground mb-6">
                Your next session is in <span className="text-primary font-semibold">2 days</span>. How are you feeling today?
              </p>
              <div className="flex gap-3">
                <Button onClick={() => navigate("/student/book-appointment")} className="rounded-lg">
                  Book a Session
                </Button>
                <Button variant="outline" className="rounded-lg">
                  Check Progress
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Upcoming Sessions */}
          <div className="lg:col-span-3 space-y-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Upcoming Sessions</h2>
                <button className="text-sm text-primary font-semibold hover:underline" onClick={() => navigate("/student/sessions")}>View All</button>
              </div>
              <Card>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">24</p>
                    <p className="text-xs text-primary uppercase">Oct</p>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-primary/10 text-primary border-0 text-[10px] uppercase font-semibold">Regular</Badge>
                      <span className="text-xs text-muted-foreground">10:30 AM — 11:30 AM</span>
                    </div>
                    <p className="font-semibold text-sm">Cognitive Behavioral Therapy</p>
                    <p className="text-xs text-muted-foreground">Dr. Sarah Jenkins</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
            </div>

            {/* Resources */}
            <Card>
              <CardContent className="p-5">
                <h3 className="font-semibold mb-4">Mental Health Resources</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                    <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                      <BookOpen className="h-5 w-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Anxiety Guide</p>
                      <p className="text-xs text-muted-foreground">4 min read</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                    <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <Headphones className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Deep Sleep Meditation</p>
                      <p className="text-xs text-muted-foreground">12 min audio</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recent History */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Recent History</h3>
                  <button className="text-muted-foreground">•••</button>
                </div>
                <div className="space-y-4">
                  {recentHistory.map((item, i) => (
                    <div key={i} className="flex gap-3">
                      <div className={`w-1 rounded-full ${item.color} shrink-0`} />
                      <div>
                        <p className="text-[10px] text-muted-foreground">{item.date}</p>
                        <p className="text-sm font-semibold">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full mt-4 text-primary text-sm">
                  Download Full Report
                </Button>
              </CardContent>
            </Card>

            {/* Crisis card */}
            <Card className="bg-accent text-accent-foreground overflow-hidden">
              <CardContent className="p-5">
                <div className="h-8 w-8 rounded-lg bg-accent-foreground/20 flex items-center justify-center mb-3">
                  <Smile className="h-4 w-4" />
                </div>
                <h3 className="font-bold text-lg mb-1">Are you having a Crisis?</h3>
                <p className="text-xs text-accent-foreground/80 mb-4">
                  If you or someone else is in immediate danger, please press this button if you are for immediate help.
                </p>
                <div className="bg-accent-foreground/10 rounded-xl p-3 flex items-center justify-between">
                  <span className="font-bold text-sm text-accent-foreground">Call +23480174890</span>
                  <span>📞</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default StudentDashboard;
