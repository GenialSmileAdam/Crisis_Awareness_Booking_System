import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppLayout } from "@/components/AppLayout";
import { mockStudentSessions } from "@/data/mockData";
import { useBooking } from "@/contexts/BookingContext";
import { CheckCircle, AlertTriangle, Filter, Search, MoreVertical, CalendarClock, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

const StudentSessions = () => {
  const { bookedSessions } = useBooking();
  const navigate = useNavigate();

  const upcomingSessions = bookedSessions
    .filter((s) => s.status === "upcoming")
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Your Sessions History</h1>
          <p className="text-muted-foreground mt-1">
            A quiet space to reflect on your progress. Review past conversations with your counselor and prepare for upcoming sessions.
          </p>
        </div>

        {/* Upcoming Booked Sessions */}
        {upcomingSessions.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Upcoming Appointments</p>
            <div className="space-y-0 divide-y rounded-xl border bg-card">
              {upcomingSessions.map((session) => {
                const day = session.date.toLocaleDateString("en-US", { day: "numeric" });
                const month = session.date.toLocaleDateString("en-US", { month: "short" });
                const year = session.date.getFullYear();
                const formattedDate = `${month} ${day}, ${year}`;

                return (
                  <div key={session.id} className="flex items-center gap-4 p-4">
                    <div className="shrink-0">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <CalendarClock className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{session.sessionType}</span>
                        <Badge
                          variant="secondary"
                          className="text-[10px] uppercase bg-primary/10 text-primary"
                        >
                          UPCOMING
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">with {session.counselorName}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground whitespace-nowrap">{formattedDate}</p>
                      <div className="flex items-center gap-1 justify-end mt-0.5">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">{session.time}</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs text-primary"
                    >
                      View Details
                    </Button>
                    <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {upcomingSessions.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="p-6 text-center">
              <CalendarClock className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-semibold text-foreground mb-1">No upcoming appointments</p>
              <p className="text-xs text-muted-foreground mb-4">Book a new session to see it appear here.</p>
              <Button size="sm" onClick={() => navigate("/student/book-appointment")}>
                Book a Session
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Past Sessions */}
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Past Interactions</p>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon"><Filter className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon"><Search className="h-4 w-4" /></Button>
          </div>
        </div>

        <div className="space-y-0 divide-y rounded-xl border bg-card">
          {mockStudentSessions.map((session) => (
            <div key={session.id} className={`flex items-center gap-4 p-4 ${session.icon === "alert" ? "border-l-4 border-l-accent" : ""}`}>
              <div className="shrink-0">
                {session.icon === "check" ? (
                  <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-muted-foreground" />
                  </div>
                ) : (
                  <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-accent" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{session.title}</span>
                  <Badge
                    variant="secondary"
                    className={`text-[10px] uppercase ${session.type === "CRISIS RESPONSE" ? "bg-accent/10 text-accent" : "bg-secondary text-muted-foreground"}`}
                  >
                    {session.type}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">with {session.counselorName}</p>
              </div>
              <p className="text-xs text-muted-foreground whitespace-nowrap">{session.date}</p>
              <Button
                variant="outline"
                size="sm"
                className={`text-xs ${session.type === "CRISIS RESPONSE" ? "text-accent border-accent/30" : "text-primary"}`}
              >
                {session.action}
              </Button>
              <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>

        {/* SOS Button */}
        <div className="fixed bottom-6 right-6">
          <button className="h-14 w-14 rounded-full bg-accent text-accent-foreground font-bold text-sm shadow-lg hover:shadow-xl transition">
            SOS
          </button>
        </div>
      </div>
    </AppLayout>
  );
};

export default StudentSessions;
