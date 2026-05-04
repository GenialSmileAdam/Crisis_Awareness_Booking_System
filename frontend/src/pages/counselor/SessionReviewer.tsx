import { createAISession, uploadSessionAudio, transcribeSession, summariseSession } from "@/api/ai";
import { getAppointment } from "@/api/appointments";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { LayoutDashboard, Users, Calendar, ChevronLeft, Play, Pause, Upload, Loader2, Check, RefreshCw, Volume2, LogOut, FileAudio, FileText, BrainCircuit } from "lucide-react";
import { AppShell, SidebarItem } from "@/components/AppSidebar";
import { counselorSidebarItems } from "@/data/sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

const TIER_LEVELS = ["Green", "Amber", "Red", "Critical"] as const;

export default function SessionReviewer() {
  const { logout } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [appointment, setAppointment] = useState<any>(null);
  const [aiSessionId, setAiSessionId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [filename, setFilename] = useState("");
  
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(80);
  const [tier, setTier] = useState<typeof TIER_LEVELS[number]>("Green");
  const [saved, setSaved] = useState(false);
  
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchAppointment = async () => {
      try {
        if (!id) return;
        const data = await getAppointment(id);
        setAppointment(data);
        
        // Auto-create AI session
        const session = await createAISession({
          appointment_id: id,
          client_name: data.student_full_name,
          notes: ""
        });
        setAiSessionId(session.id);
        toast.success("AI Session created successfully");
      } catch (err) {
        toast.error("Failed to initialize session");
        console.error("Initialization error:", err);
      }
    };
    fetchAppointment();
  }, [id]);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setProgress((p) => (p >= 100 ? 0 : p + 0.5)), 50);
    return () => clearInterval(t);
  }, [playing]);

  const fmt = (p: number) => {
    const total = 272; // 04:32
    const s = Math.round((p / 100) * total);
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  };

  const handleFileUpload = (f: File) => {
    if (!/\.(mp3|wav)$/i.test(f.name)) {
      return toast.error("Please upload .mp3 or .wav");
    }
    setAudioFile(f);
    setFilename(f.name);
  };

  const executeUpload = async () => {
    if (!aiSessionId || !audioFile) return;
    setLoading(true);
    try {
      await uploadSessionAudio(aiSessionId, audioFile);
      toast.success("Audio uploaded successfully");
    } catch (err) {
      toast.error("Upload failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const executeTranscription = async () => {
    if (!aiSessionId) return;
    setLoading(true);
    try {
      const data = await transcribeSession(aiSessionId);
      setTranscript(data.transcript);
      toast.success("Transcription complete");
    } catch (err) {
      toast.error("Transcription failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const executeSummarisation = async () => {
    if (!aiSessionId) return;
    setLoading(true);
    try {
      const data = await summariseSession(aiSessionId);
      setSummary(data.summary);
      toast.success("Summary generated");
    } catch (err) {
      toast.error("Summary failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const tierColor = tier === "Critical" ? "destructive" : tier === "Red" ? "destructive" : tier === "Amber" ? "warning" : "success";


  return (
    <AppShell items={counselorSidebarItems}>
      <div className="flex items-start md:items-center justify-between py-4 md:h-16 px-4 md:px-8 border-b border-border bg-background md:bg-background/60 md:backdrop-blur-sm sticky top-0 z-30">
        <div className="flex items-center gap-2 md:gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/counselor")} className="h-8 w-8 md:h-10 md:w-10"><ChevronLeft className="h-4 w-4" /></Button>
          <div>
            <div className="font-display text-lg md:text-xl font-bold">{appointment?.student_full_name || "Loading..."}</div>
            <div className="text-[10px] md:text-xs text-muted-foreground font-mono truncate max-w-[150px] md:max-w-xs">
              {appointment && (
                <>
                  {new Date(appointment.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · 
                  {new Date(appointment.start_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - 
                  {new Date(appointment.end_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={() => { logout(); navigate("/login"); }} className="md:hidden rounded-full h-9 w-9">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="p-4 md:p-8">
        {/* Step Indicator */}
        <div className="mb-8 flex items-center justify-center gap-4">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                step === s ? "bg-primary text-primary-foreground scale-110 shadow-lg" : 
                step > s ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"
              )}>
                {step > s ? <Check className="h-4 w-4" /> : s}
              </div>
              {s < 4 && <div className={cn("h-0.5 w-12 md:w-24 rounded-full", step > s ? "bg-success" : "bg-muted")} />}
            </div>
          ))}
        </div>

        <div className="max-w-4xl mx-auto">
          {step === 1 && (
            <div className="surface-card p-12 flex flex-col items-center justify-center text-center animate-fade-in min-h-[40vh]">
              <div className="h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-6">
                <BrainCircuit className="h-8 w-8" />
              </div>
              <h2 className="font-display text-2xl font-bold mb-3">AI Session Initialization</h2>
              <p className="text-muted-foreground text-sm mb-8 max-w-md">
                We're setting up a secure transcription environment for this appointment.
              </p>
              
              {!aiSessionId ? (
                <div className="flex items-center gap-3 text-primary font-medium animate-pulse">
                  <Loader2 className="h-5 w-5 animate-spin" /> Initializing...
                </div>
              ) : (
                <div className="space-y-6 flex flex-col items-center">
                  <div className="px-4 py-2 rounded-lg bg-success/10 text-success flex items-center gap-2 font-medium">
                    <Check className="h-4 w-4" /> Session created ✓
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono bg-muted/50 px-2 py-1 rounded">
                    ID: {aiSessionId}
                  </div>
                  <Button onClick={() => setStep(2)} className="gradient-primary text-primary-foreground border-0 px-8">
                    Next: Upload Audio &rarr;
                  </Button>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="surface-card p-12 flex flex-col items-center justify-center text-center animate-fade-in min-h-[40vh]">
              <div className="h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-6">
                <Upload className="h-8 w-8" />
              </div>
              <h2 className="font-display text-2xl font-bold mb-3">Upload Session Audio</h2>
              <p className="text-muted-foreground text-sm mb-8 max-w-md">
                Upload the recording from your session. Supported formats: .mp3, .wav (up to 50MB)
              </p>
              
              <input ref={fileRef} type="file" accept=".wav,.mp3" hidden onChange={(e) => handleFileUpload(e.target.files?.[0]!)} />
              
              {!audioFile ? (
                <Button onClick={() => fileRef.current?.click()} variant="outline" className="px-8">
                  Select Audio File
                </Button>
              ) : (
                <div className="space-y-6 flex flex-col items-center w-full">
                  <div className="p-4 rounded-xl bg-muted/50 w-full max-w-sm flex items-center gap-3 text-left">
                    <FileAudio className="h-8 w-8 text-primary shrink-0" />
                    <div className="overflow-hidden">
                      <div className="font-medium text-sm truncate">{filename}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{(audioFile.size / (1024 * 1024)).toFixed(2)} MB</div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setAudioFile(null)} className="ml-auto text-muted-foreground hover:text-destructive">
                      Change
                    </Button>
                  </div>
                  
                  <div className="flex gap-4">
                    <Button onClick={executeUpload} disabled={loading} className="gradient-primary text-primary-foreground border-0 px-8 min-w-[160px]">
                      {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Uploading...</> : "Upload Audio"}
                    </Button>
                    {!loading && (
                      <Button variant="secondary" onClick={() => setStep(3)} className="px-8">
                        Next: Transcribe &rarr;
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="surface-card p-12 flex flex-col items-center justify-center text-center animate-fade-in min-h-[40vh]">
              <div className="h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-6">
                <FileText className="h-8 w-8" />
              </div>
              <h2 className="font-display text-2xl font-bold mb-3">AI Transcription</h2>
              <p className="text-muted-foreground text-sm mb-8 max-w-md">
                SafeSpace AI will now convert the session audio into a time-stamped text transcript.
              </p>
              
              {!transcript ? (
                <Button onClick={executeTranscription} disabled={loading} className="gradient-primary text-primary-foreground border-0 px-8">
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Transcribing...</> : "Start Transcription"}
                </Button>
              ) : (
                <div className="space-y-6 w-full max-w-2xl">
                  <div className="p-6 rounded-xl bg-muted/30 border border-border text-left">
                    <div className="label-eyebrow mb-3">Transcript Preview</div>
                    <div className="font-mono text-xs h-48 overflow-y-auto leading-relaxed scrollbar-none">
                      {transcript}
                    </div>
                  </div>
                  <Button onClick={() => setStep(4)} className="gradient-primary text-primary-foreground border-0 px-8">
                    Next: Summarise &rarr;
                  </Button>
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="grid lg:grid-cols-12 gap-6 animate-fade-in">
              <div className="lg:col-span-5 space-y-6">
                <div className="surface-card p-6 flex flex-col items-center justify-center text-center min-h-[300px]">
                  <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
                    <RefreshCw className={cn("h-6 w-6", loading && "animate-spin")} />
                  </div>
                  <h3 className="font-display text-lg font-bold mb-2">Clinical Summary</h3>
                  <p className="text-muted-foreground text-xs mb-6">
                    Analyze the transcript to generate clinical notes and archetypes.
                  </p>
                  
                  {!summary ? (
                    <Button onClick={executeSummarisation} disabled={loading} className="gradient-primary text-primary-foreground border-0 w-full">
                      {loading ? "Generating..." : "Generate Summary"}
                    </Button>
                  ) : (
                    <div className="w-full space-y-3">
                      <div className="px-3 py-1 rounded-full bg-success/10 text-success text-xs font-semibold inline-block">
                        Summary Generated ✓
                      </div>
                      <Button variant="outline" onClick={executeSummarisation} disabled={loading} className="w-full text-xs">
                        <RefreshCw className="h-3 w-3 mr-2" /> Regenerate Summary
                      </Button>
                    </div>
                  )}
                </div>

                <div className="surface-card p-6 space-y-4">
                  <div className="label-eyebrow">Audio Playback</div>
                  <div className="space-y-2">
                    <Slider value={[progress]} max={100} step={0.5} onValueChange={(v) => setProgress(v[0])} />
                    <div className="flex justify-between text-[10px] font-mono text-muted-foreground"><span>{fmt(progress)}</span><span>04:32</span></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Button onClick={() => setPlaying((p) => !p)} className="rounded-full h-10 w-10 p-0 gradient-primary text-primary-foreground border-0">
                      {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                    </Button>
                    <div className="flex items-center gap-3 flex-1 max-w-[120px] ml-4">
                      <Volume2 className="h-3 w-3 text-muted-foreground" />
                      <Slider value={[volume]} max={100} onValueChange={(v) => setVolume(v[0])} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7 surface-card p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="label-eyebrow">SafeSpace AI Summary</div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 rounded-full bg-primary/15 text-primary text-[10px] font-semibold">
                    Patient: {appointment?.student_full_name}
                  </span>
                  <button
                    onClick={() => setTier(TIER_LEVELS[(TIER_LEVELS.indexOf(tier) + 1) % TIER_LEVELS.length])}
                    className={cn("px-3 py-1 rounded-full text-[10px] font-semibold transition", `bg-${tierColor}/15 text-${tierColor}`)}
                    style={{ backgroundColor: `hsl(var(--${tierColor}) / 0.15)`, color: `hsl(var(--${tierColor}))` }}
                  >
                    {tier} risk
                  </button>
                </div>

                <div>
                  <Textarea
                    placeholder="Clinical notes will appear here..."
                    value={summary || ""}
                    onChange={(e) => { setSummary(e.target.value); setSaved(false); }}
                    className="font-mono text-xs leading-relaxed bg-muted/40 min-h-[350px] scrollbar-none"
                  />
                  <div className="text-[10px] text-muted-foreground mt-1 text-right">{summary?.length || 0} chars</div>
                </div>

                <div className="pt-2">
                  <Button
                    onClick={() => { setSaved(true); toast.success(`Session notes saved for ${appointment?.student_full_name}.`); }}
                    disabled={!summary || saved}
                    className="w-full gradient-primary text-primary-foreground border-0 font-bold"
                  >
                    {saved ? <><Check className="h-4 w-4 mr-2" /> Saved to Records</> : "Confirm & Save to Database"}
                  </Button>
                  <p className="text-[10px] text-muted-foreground text-center mt-3">AI-generated summary. Always review before saving.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>

  );
}
