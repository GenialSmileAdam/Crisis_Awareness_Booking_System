import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppLayout } from "@/components/AppLayout";
import { mockSessions } from "@/data/mockData";
import { useNavigate } from "react-router-dom";

const StudentSessions = () => {
  const navigate = useNavigate();
  const sessions = mockSessions.filter(s => s.studentId === "s1");

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">My Sessions</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sessions.map((session) => (
            <Card key={session.id} className="hover:shadow-md transition">
              <CardContent className="p-5 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{session.counselorName}</p>
                    <p className="text-sm text-muted-foreground">{session.date}</p>
                  </div>
                  <Badge variant={session.status === "completed" ? "default" : "secondary"}>{session.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">Type: {session.type}</p>
                <Button variant="outline" size="sm" onClick={() => navigate("/student/ai-summary")}>
                  View Summary
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default StudentSessions;
