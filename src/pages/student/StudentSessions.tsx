import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppLayout } from "@/components/AppLayout";
import { useBooking, BookedSession } from "@/contexts/BookingContext";
import {
  CalendarClock,
  Clock,
  MoreVertical,
  Filter,
  Search,
  History,
  X,
  User,
  CalendarDays,
  FileText,
  Stethoscope,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const SessionDetailModal = ({
  session,
  onClose,
}: {
  session: BookedSession;
  onClose: () => void;
}) => {
  const formattedDate = session.date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      {/* Panel — stop propagation so clicking inside doesn't close */}
      <div
        className="bg-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-primary/5 border-b px-6 py-5 flex items-start justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-primary font-semibold mb-1">
              Session Details
            </p>
            <h2 className="text-lg font-bold text-foreground">
              {session.sessionType}
            </h2>
            <Badge className="mt-2 bg-primary/10 text-primary border-0 text-[10px] uppercase font-semibold">
              Upcoming
            </Badge>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Date */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <CalendarDays className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                Date
              </p>
              <p className="text-sm font-semibold text-foreground">
                {formattedDate}
              </p>
            </div>
          </div>

          {/* Time */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Clock className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                Time
              </p>
              <p className="text-sm font-semibold text-foreground">
                {session.time}
              </p>
            </div>
          </div>

          {/* Counselor */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                Counselor
              </p>
              <p className="text-sm font-semibold text-foreground">
                {session.counselorName}
              </p>
            </div>
          </div>

          {/* Session type */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Stethoscope className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                Session Type
              </p>
              <p className="text-sm font-semibold text-foreground">
                {session.sessionType}
              </p>
            </div>
          </div>

          {/* Note */}
          {session.note && (
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  Your Note
                </p>
                <p className="text-sm text-foreground leading-relaxed">
                  {session.note}
                </p>
              </div>
            </div>
          )}

          {!session.note && (
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                <FileText className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  Your Note
                </p>
                <p className="text-sm text-muted-foreground italic">
                  No note added
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <Button className="w-full rounded-xl h-11" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

const StudentSessions = () => {
  const { bookedSessions } = useBooking();
  const navigate = useNavigate();
  const [selectedSession, setSelectedSession] = useState<BookedSession | null>(
    null
  );

  const upcomingSessions = bookedSessions
    .filter((s) => s.status === "upcoming")
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Your Sessions History
          </h1>
          <p className="text-muted-foreground mt-1">
            A quiet space to reflect on your progress. Review past conversations
            with your counselor and prepare for upcoming sessions.
          </p>
        </div>

        {/* Upcoming Booked Sessions */}
        {upcomingSessions.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
              Upcoming Appointments
            </p>
            <div className="space-y-0 divide-y rounded-xl border bg-card">
              {upcomingSessions.map((session) => {
                const formattedDate = session.date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                });

                return (
                  <div
                    key={session.id}
                    className="flex items-center gap-4 p-4"
                  >
                    <div className="shrink-0">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <CalendarClock className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">
                          {session.sessionType}
                        </span>
                        <Badge
                          variant="secondary"
                          className="text-[10px] uppercase bg-primary/10 text-primary"
                        >
                          UPCOMING
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        with {session.counselorName}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground whitespace-nowrap">
                        {formattedDate}
                      </p>
                      <div className="flex items-center gap-1 justify-end mt-0.5">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">
                          {session.time}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs text-primary"
                      onClick={() => setSelectedSession(session)}
                    >
                      View Details
                    </Button>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
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
              <p className="text-sm font-semibold text-foreground mb-1">
                No upcoming appointments
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                Book a new session to see it appear here.
              </p>
              <Button
                size="sm"
                onClick={() => navigate("/student/book-appointment")}
              >
                Book a Session
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Past Interactions */}
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
            Past Interactions
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Empty state for past interactions */}
        <Card className="border-dashed border-muted">
          <CardContent className="p-10 flex flex-col items-center justify-center text-center">
            <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center mb-4">
              <History className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">
              No past interactions yet
            </p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Your completed session history will appear here once you've had
              your first counseling session.
            </p>
          </CardContent>
        </Card>

        {/* SOS Button */}
        <div className="fixed bottom-6 right-6">
          <button className="h-14 w-14 rounded-full bg-accent text-accent-foreground font-bold text-sm shadow-lg hover:shadow-xl transition">
            SOS
          </button>
        </div>
      </div>

      {/* Session Detail Modal */}
      {selectedSession && (
        <SessionDetailModal
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
        />
      )}
    </AppLayout>
  );
};

export default StudentSessions;
