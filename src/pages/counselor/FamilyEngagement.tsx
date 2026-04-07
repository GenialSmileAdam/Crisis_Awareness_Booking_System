import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AppLayout } from "@/components/AppLayout";
import { mockStudents } from "@/data/mockData";
import { toast } from "@/hooks/use-toast";
import { Send } from "lucide-react";

const FamilyEngagement = () => {
  const [selectedStudent, setSelectedStudent] = useState(mockStudents[0].id);
  const [message, setMessage] = useState("");

  const student = mockStudents.find(s => s.id === selectedStudent)!;

  const handleSend = () => {
    if (!message.trim()) {
      toast({ title: "Error", description: "Please enter a message.", variant: "destructive" });
      return;
    }
    toast({ title: "Sent!", description: `Update sent to ${student.familyContact?.name}.` });
    setMessage("");
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Family Engagement</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader><CardTitle className="text-lg">Students</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {mockStudents.map((s) => (
                <div
                  key={s.id}
                  onClick={() => setSelectedStudent(s.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition ${selectedStudent === s.id ? "border-primary bg-primary/5" : "hover:border-primary/50"}`}
                >
                  <p className="font-medium text-sm">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.familyContact?.name} · {s.familyContact?.relationship}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="text-lg">Message to {student.familyContact?.name}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Email:</span><p className="font-medium">{student.familyContact?.email}</p></div>
                <div><span className="text-muted-foreground">Phone:</span><p className="font-medium">{student.familyContact?.phone}</p></div>
              </div>
              <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write an update for the family..." rows={5} />
              <Button onClick={handleSend}><Send className="mr-2 h-4 w-4" />Send Update to Family</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default FamilyEngagement;
