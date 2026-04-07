import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/AppLayout";
import { mockStudents } from "@/data/mockData";
import { useNavigate } from "react-router-dom";

const CounselorStudents = () => {
  const navigate = useNavigate();

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Student List</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mockStudents.map((s) => (
            <Card key={s.id} className="hover:shadow-md transition">
              <CardContent className="p-5 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{s.name}</p>
                    <p className="text-sm text-muted-foreground">{s.email} · {s.grade}</p>
                  </div>
                  <Badge variant={s.wellnessScore >= 70 ? "default" : "destructive"}>
                    {s.wellnessScore}/100
                  </Badge>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate(`/counselor/ai-summary/${s.id}`)}>
                  View AI Summary
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default CounselorStudents;
