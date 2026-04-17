import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AppLayout } from "@/components/AppLayout";
import { mockStudentSessions } from "@/data/mockData";
import { CheckCircle, AlertTriangle, Filter, Search, MoreVertical } from "lucide-react";

const StudentSessions = () => {
  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Your Sessions History</h1>
          <p className="text-muted-foreground mt-1">
            A quiet space to reflect on your progress. Review past conversations with your counselor and prepare for upcoming sessions.
          </p>
        </div>

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
