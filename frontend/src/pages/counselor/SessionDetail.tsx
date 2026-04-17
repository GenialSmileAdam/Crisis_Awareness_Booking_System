import { useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { AppLayout } from "@/components/AppLayout";
import { mockSessions, mockAppointments } from "@/data/mockData";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Mic, Square, Pause, Upload, FileText, Download, CalendarDays } from "lucide-react";
import { useNavigate } from "react-router-dom";

const SessionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const session = mockSessions.find(s => s.id === id) || mockAppointments.find(a => a.id === id);

  const [behavioral, setBehavioral] = useState("");
  const [intervention, setIntervention] = useState("");
  const [notes, setNotes] = useState("");
  const [moodLevel, setMoodLevel] = useState<string>("Moderate");
  const [riskLevel, setRiskLevel] = useState<string>("Low");
  const [actionSteps, setActionSteps] = useState("");
  const [nextDate, setNextDate] = useState("05/14/2024");

  if (!session) {
    return <AppLayout><p className="text-muted-foreground">Session not found.</p></AppLayout>;
  }

  const handleSave = () => toast({ title: "Draft Saved", description: "Session draft saved." });
  const handleFinalize = () => toast({ title: "Session Finalized", description: "Session has been submitted." });

  const moodOptions = ["Stable", "Moderate", "Critical"];
  const riskOptions = ["Low", "Med", "High"];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-primary mb-2">
            <ArrowLeft className="h-4 w-4" /> SESSION #SR-2024-089
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Active Counseling Session</h1>
              <div className="flex items-center gap-3 mt-2">
                <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">◉ LIVE RECORDING</Badge>
                <span className="text-sm text-muted-foreground">Student: <strong>Alexander Wright</strong></span>
                <span className="text-sm text-muted-foreground">Duration: 00:24:15</span>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleSave}>Save Draft</Button>
              <Button className="bg-primary" onClick={handleFinalize}>Finalize Session</Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Forms */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <h3 className="font-bold text-lg">Clinical Observations</h3>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Primary Behavioral Indicators</label>
                  <Textarea value={behavioral} onChange={(e) => setBehavioral(e.target.value)} placeholder="Describe the student's initial state, body language, and immediate concerns..." className="bg-secondary/30 border-0" rows={3} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Intervention Techniques Applied</label>
                  <Textarea value={intervention} onChange={(e) => setIntervention(e.target.value)} placeholder="Cognitive reframing, grounding exercises, active listening..." className="bg-secondary/30 border-0" rows={3} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Write out your though...." className="bg-secondary/30 border-0" rows={4} />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Current Mood Intensity</label>
                    <div className="flex gap-2 mt-2">
                      {moodOptions.map((m) => (
                        <Button key={m} size="sm" variant={moodLevel === m ? "default" : "outline"} onClick={() => setMoodLevel(m)} className={moodLevel === m && m === "Moderate" ? "bg-primary" : ""}>
                          {m}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Safety Risk Level</label>
                    <div className="flex gap-2 mt-2">
                      {riskOptions.map((r) => (
                        <Button key={r} size="sm" variant={riskLevel === r ? "default" : "outline"} onClick={() => setRiskLevel(r)}
                          className={riskLevel === r && r === "Low" ? "bg-emerald-500 text-primary-foreground hover:bg-emerald-600 border-0" : ""}>
                          {r}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <h3 className="font-bold text-lg">Follow-up & Planning</h3>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Agreed Action Steps</label>
                  <Textarea value={actionSteps} onChange={(e) => setActionSteps(e.target.value)} placeholder="List items student has committed to before the next session..." className="bg-secondary/30 border-0" rows={3} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Suggested Next Appointment</label>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{nextDate}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Recording Center */}
            <Card className="bg-foreground text-background overflow-hidden">
              <CardContent className="p-5 text-center">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Mic className="h-4 w-4" />
                    <span className="text-sm font-semibold">Recording Center</span>
                  </div>
                  <Badge className="bg-accent text-accent-foreground text-[10px]">REC</Badge>
                </div>
                <div className="flex justify-center gap-1 mb-4 h-16 items-end">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div key={i} className="w-1 bg-primary rounded-full" style={{ height: `${Math.random() * 100}%` }} />
                  ))}
                </div>
                <div className="flex items-center justify-center gap-4 mb-3">
                  <button className="h-10 w-10 rounded-full bg-background/20 flex items-center justify-center"><Pause className="h-4 w-4" /></button>
                  <button className="h-12 w-12 rounded-full bg-accent flex items-center justify-center"><Square className="h-4 w-4 text-accent-foreground" /></button>
                  <button className="h-10 w-10 rounded-full bg-background/20 flex items-center justify-center"><Mic className="h-4 w-4" /></button>
                </div>
                <p className="text-xs text-background/60">Session automatically encrypted & saved</p>
              </CardContent>
            </Card>

            {/* Documents */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="h-5 w-5 text-primary" />
                  <h3 className="font-bold">Documents</h3>
                </div>
                <div className="space-y-3">
                  {[{ name: "Intake_Form_Wright...", size: "2.4 MB • Today" }, { name: "Mood_Board_A.jpg", size: "4.1 MB • Yesterday" }].map((doc, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs font-medium">{doc.name}</p>
                          <p className="text-[10px] text-muted-foreground">{doc.size}</p>
                        </div>
                      </div>
                      <Download className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
                <div className="mt-4 border-2 border-dashed rounded-lg p-6 text-center">
                  <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Upload Files</p>
                  <p className="text-[10px] text-muted-foreground">Drag & drop or click to browse</p>
                </div>
              </CardContent>
            </Card>

            {/* Student Insight */}
            <Card className="bg-secondary/50 border-0">
              <CardContent className="p-5">
                <p className="text-[10px] uppercase tracking-wider text-primary font-semibold mb-3">Student Insight</p>
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10" />
                  <div>
                    <p className="text-sm font-bold">Alexander Wright</p>
                    <p className="text-xs text-muted-foreground">11th Grade • Age 17</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground italic">
                  "Shows high resilience but struggles with social transitions. Prefers non-verbal expression tools."
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default SessionDetail;
