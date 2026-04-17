import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/AppLayout";
import { 
  ChevronRight, 
  BookOpen, 
  Headphones, 
  Smile, 
  CalendarCheck, 
  MoreHorizontal,
  RefreshCcw,
  History,
  FileText,
  Settings
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useBooking } from "@/contexts/BookingContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { bookedSessions } = useBooking();
  const { user } = useAuth();

  // Get upcoming sessions (future dates)
  const now = new Date();
  const upcomingSessions = bookedSessions
    .filter((s) => s.status === "upcoming" && s.date >= now)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 2); // Show top 2 for the dashboard

  // Get up to 3 most recent past sessions
  const recentHistory = bookedSessions
    .filter((s) => s.date < now || s.status === "completed")
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 3);

  const handleRefresh = () => {
    toast.success("Dashboard data updated");
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl">
        {/* Hero */}
        <Card className="overflow-hidden border-none bg-gradient-to-br from-primary/5 via-background to-background ring-1 ring-primary/10">
          <CardContent className="p-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Hello, {user?.name.split(' ')[0] || "Alex"}.
              </h1>
              <p className="text-muted-foreground mb-6 max-w-md">
                Your wellbeing matters. Book a session with a counselor, track your journey, and access support whenever you need it.
              </p>
              <div className="flex gap-3">
                <Button onClick={() => navigate("/student/book-appointment")} className="rounded-lg shadow-sm">
                  Book a Session
                </Button>
                <Button variant="outline" className="rounded-lg" onClick={() => navigate("/student/sessions")}>
                  <CalendarCheck className="h-4 w-4 mr-2" />
                  View My Sessions
                </Button>
              </div>
            </div>
            <div className="hidden md:block h-32 w-32 bg-primary/10 rounded-full blur-2xl absolute -right-10 top-0" />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-stretch">
          {/* Upcoming Sessions & Resources */}
          <div className="lg:col-span-3 flex flex-col space-y-6">
            <div className="flex flex-col space-y-6 h-full">
              <div className="flex-none">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">Upcoming Sessions</h2>
                  <button 
                    className="text-sm text-primary font-semibold hover:underline" 
                    onClick={() => navigate("/student/sessions")}
                  >
                    View All
                  </button>
                </div>

                <div className="space-y-3">
                  {upcomingSessions.length > 0 ? (
                    upcomingSessions.map((session) => (
                      <Card
                        key={session.id}
                        className="cursor-pointer hover:shadow-md transition-all border-l-4 border-l-primary"
                        onClick={() => navigate("/student/sessions")}
                      >
                        <CardContent className="p-4 flex items-center gap-4">
                          <div className="text-center min-w-[40px]">
                            <p className="text-2xl font-bold text-primary">
                              {session.date.toLocaleDateString("en-US", { day: "numeric" })}
                            </p>
                            <p className="text-xs text-primary uppercase font-bold">
                              {session.date.toLocaleDateString("en-US", { month: "short" })}
                            </p>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className="bg-primary/10 text-primary border-0 text-[10px] uppercase font-bold tracking-tight">
                                Upcoming
                              </Badge>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <RefreshCcw className="h-3 w-3" />
                                {session.time}
                              </span>
                            </div>
                            <p className="font-bold text-sm">{session.sessionType}</p>
                            <p className="text-xs text-muted-foreground">{session.counselorName}</p>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <Card className="border-dashed">
                      <CardContent className="p-8 text-center">
                        <div className="h-12 w-12 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                          <CalendarCheck className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-semibold text-foreground mb-1">No upcoming sessions</p>
                        <p className="text-xs text-muted-foreground mb-6">Book a session to get started on your wellness journey.</p>
                        <Button size="sm" onClick={() => navigate("/student/book-appointment")} className="rounded-full px-6">
                          Book Now
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>

              {/* Resources - now using flex-1 to grow */}
              <Card className="flex-1 flex flex-col">
                <CardContent className="p-5 flex-1 flex flex-col">
                  <h3 className="font-bold mb-4">Mental Health Resources</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-orange-50/50 border border-orange-100 cursor-pointer hover:bg-orange-50 transition-colors h-full">
                      <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                        <BookOpen className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">Anxiety Guide</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-semibold">4 min read</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50/50 border border-emerald-100 cursor-pointer hover:bg-emerald-50 transition-colors h-full">
                      <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                        <Headphones className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">Deep Sleep</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-semibold">12 min audio</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-sky-50/50 border border-sky-100 cursor-pointer hover:bg-sky-50 transition-colors h-full">
                      <div className="h-10 w-10 rounded-lg bg-sky-100 flex items-center justify-center shrink-0">
                        <Headphones className="h-5 w-5 text-sky-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">Ease Up</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-semibold">5 min audio</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-violet-50/50 border border-violet-100 cursor-pointer hover:bg-violet-50 transition-colors h-full">
                      <div className="h-10 w-10 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                        <Smile className="h-5 w-5 text-violet-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">Mood Log</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-semibold">External Tool</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Recent History & Crisis */}
          <div className="lg:col-span-2 flex flex-col space-y-6">
            {/* Recent History - using flex-1 to grow */}
            <Card className="flex-1 flex flex-col">
              <CardContent className="p-5 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-6 flex-none">
                  <h3 className="font-bold">Recent History</h3>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleRefresh}>
                        <RefreshCcw className="mr-2 h-4 w-4" />
                        <span>Refresh Data</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/student/sessions")}>
                        <History className="mr-2 h-4 w-4" />
                        <span>Full History</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => toast.info("Report downloading...")}>
                        <FileText className="mr-2 h-4 w-4" />
                        <span>Export Report</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <div className="space-y-5 flex-1">
                  {recentHistory.length > 0 ? (
                    recentHistory.map((item, i) => (
                      <div key={item.id} className="flex gap-4 group">
                        <div className="relative">
                          <div className={`w-1 h-full rounded-full bg-primary/20 group-hover:bg-primary transition-colors`} />
                          {i === 0 && <div className="absolute top-0 left-0 w-1 h-3 rounded-full bg-primary" />}
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            {item.date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                          <p className="text-sm font-bold">{item.sessionType}</p>
                          <p className="text-xs text-muted-foreground">Completed with {item.counselorName}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 flex-1 flex flex-col justify-center">
                      <div className="h-10 w-10 bg-secondary rounded-full flex items-center justify-center mx-auto mb-3">
                        <History className="h-5 w-5 text-muted-foreground opacity-50" />
                      </div>
                      <p className="text-xs text-muted-foreground px-4">
                        Your session history will appear here once interactions are completed.
                      </p>
                    </div>
                  )}
                </div>
                
                {recentHistory.length > 0 && (
                  <Button 
                    variant="outline" 
                    className="w-full mt-6 text-primary text-xs font-bold h-9 flex-none"
                    onClick={() => navigate("/student/sessions")}
                  >
                    View All History
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Crisis card - flex-none to keep its size */}
            <Card className="bg-accent text-accent-foreground overflow-hidden relative group flex-none">
              <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              <CardContent className="p-5 relative">
                <div className="h-8 w-8 rounded-lg bg-accent-foreground/20 flex items-center justify-center mb-3">
                  <Smile className="h-4 w-4" />
                </div>
                <h3 className="font-bold text-lg mb-1">Are you having a Crisis?</h3>
                <p className="text-xs text-accent-foreground/80 mb-4 leading-relaxed">
                  If you or someone else is in immediate danger, please press this button for immediate help.
                </p>
                <a 
                  href="tel:+23480174890"
                  className="bg-accent-foreground/10 hover:bg-accent-foreground/20 transition-colors rounded-xl p-3 flex items-center justify-between no-underline"
                >
                  <span className="font-bold text-sm text-accent-foreground">Call +23480174890</span>
                  <span className="text-lg">📞</span>
                </a>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default StudentDashboard;
