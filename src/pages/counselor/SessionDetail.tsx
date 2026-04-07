import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { AppLayout } from "@/components/AppLayout";
import { mockSessions, mockAppointments } from "@/data/mockData";
import { toast } from "@/hooks/use-toast";
import { Brain, Save, Send } from "lucide-react";

const SessionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const session = mockSessions.find(s => s.id === id) || mockAppointments.find(a => a.id === id);

  const [notes, setNotes] = useState(('notes' in (session || {}) ? (session as any).notes : "") || "");
  const [mood, setMood] = useState(('moodRating' in (session || {}) ? (session as any).moodRating : 3) || 3);
  const [progress, setProgress] = useState(('progressRating' in (session || {}) ? (session as any).progressRating : 3) || 3);

  if (!session) {
    return <AppLayout><p className="text-muted-foreground">Session not found.</p></AppLayout>;
  }

  const handleSave = () => toast({ title: "Saved", description: "Session notes saved." });
  const handleSubmit = () => toast({ title: "Submitted", description: "Session submitted successfully." });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Session Detail</h1>
          <Badge variant="secondary">{session.status}</Badge>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-lg">Student Information</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><span className="text-muted-foreground">Student:</span><p className="font-medium">{session.studentName}</p></div>
            <div><span className="text-muted-foreground">Date:</span><p className="font-medium">{session.date || (session as any).date}</p></div>
            <div><span className="text-muted-foreground">Type:</span><p className="font-medium">{session.type}</p></div>
            <div><span className="text-muted-foreground">Counselor:</span><p className="font-medium">{session.counselorName}</p></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Session Notes</CardTitle></CardHeader>
          <CardContent>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Enter session notes..." rows={5} />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">Mood Rating</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Slider value={[mood]} onValueChange={(v) => setMood(v[0])} min={1} max={5} step={1} />
              <p className="text-sm text-muted-foreground text-center">{mood}/5</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-lg">Progress Rating</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Slider value={[progress]} onValueChange={(v) => setProgress(v[0])} min={1} max={5} step={1} />
              <p className="text-sm text-muted-foreground text-center">{progress}/5</p>
            </CardContent>
          </Card>
        </div>

        {'aiSummary' in (session || {}) && (session as any).aiSummary && (
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Brain className="h-5 w-5 text-primary" /> AI Summary</CardTitle></CardHeader>
            <CardContent><p className="text-sm">{(session as any).aiSummary}</p></CardContent>
          </Card>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={handleSave}><Save className="mr-2 h-4 w-4" />Save</Button>
          <Button onClick={handleSubmit}><Send className="mr-2 h-4 w-4" />Submit</Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default SessionDetail;
