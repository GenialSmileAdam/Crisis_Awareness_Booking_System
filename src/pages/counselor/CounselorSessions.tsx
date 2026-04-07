import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppLayout } from "@/components/AppLayout";
import { mockSessions } from "@/data/mockData";
import { useNavigate } from "react-router-dom";

const CounselorSessions = () => {
  const navigate = useNavigate();
  const sessions = mockSessions.filter(s => s.counselorId === "c1");

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Session History</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sessions.map((session) => (
            <Card key={session.id} className="hover:shadow-md transition cursor-pointer" onClick={() => navigate(`/counselor/session/${session.id}`)}>
              <CardContent className="p-5 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{session.studentName}</p>
                    <p className="text-sm text-muted-foreground">{session.date} · {session.type}</p>
                  </div>
                  <Badge variant={session.status === "completed" ? "default" : "secondary"}>{session.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default CounselorSessions;
