import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { LayoutDashboard, Users, Calendar, ChevronLeft, Play, Pause, Upload, Loader2, Check, RefreshCw, Volume2 } from "lucide-react";
import { AppShell, SidebarItem } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { STUDENTS, MOCK_NOTES_VARIANTS, tierFromWrs } from "@/data/mock";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const items: SidebarItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", to: "/counselor", end: true },
  { icon: Users, label: "My Students", to: "/counselor" },
  { icon: Calendar, label: "Schedule", to: "/counselor" },
];

const TIER_LEVELS = ["Green", "Amber", "Red", "Critical"] as const;

export default function SessionReviewer() {
  const { id } = useParams();
  const student = STUDENTS.find((s) => s.id === id) || STUDENTS[0];
  const navigate = useNavigate();
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(80);
  const [filename, setFilename] = useState(`session_${student.name.split(" ")[0].toLowerCase()}_${student.lastCheckIn}.mp3`);
  const [archetype, setArchetype] = useState("Burnt-Out Student");
  const [editingArch, setEditingArch] = useState(false);
  const [tier, setTier] = useState<typeof TIER_LEVELS[number]>(tierFromWrs(student.wrs));
  const [notes, setNotes] = useState(MOCK_NOTES_VARIANTS[0]);
  const [saved, setSaved] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [step, setStep] = useState(1);
  const [loadingMsg, setLoadingMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

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

  const tierColor = tier === "Critical" ? "destructive" : tier === "Red" ? "destructive" : tier === "Amber" ? "warning" : "success";

  const regenerate = () => {
    setRegenerating(true);
    setTimeout(() => {
      setNotes((n) => (n === MOCK_NOTES_VARIANTS[0] ? MOCK_NOTES_VARIANTS[1] : MOCK_NOTES_VARIANTS[0]));
      setRegenerating(false);
      toast.success("Summary regenerated");
    }, 1500);
  };

  const handleUpload = (f?: File) => {
    if (!f) return;
    if (!/\.(mp3|wav)$/i.test(f.name)) return toast.error("Please upload .mp3 or .wav");
    setFilename(f.name);
    setStep(1);
    setLoadingMsg("Uploading audio file...");
    
    setTimeout(() => {
      setStep(2);
      setLoadingMsg("Generating transcript with AI...");
      
      setTimeout(() => {
        setStep(3);
        setLoadingMsg("Generating clinical summary...");
        
        setTimeout(() => {
          setStep(4);
          setLoadingMsg("");
          setProgress(0);
          setPlaying(false);
          toast.success(`Analysis complete for ${f.name}`);
        }, 2000);
      }, 2000);
    }, 2000);
  };

  return (
    <AppShell items={items}>
      <div className="flex items-center justify-between h-16 px-8 border-b border-border">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/counselor")}><ChevronLeft className="h-4 w-4" /></Button>
          <div>
            <div className="font-display font-bold">{student.name}</div>
            <div className="text-xs text-muted-foreground font-mono">{filename} · {student.lastCheckIn}</div>
          </div>
        </div>
        <ThemeToggle />
      </div>

      <div className="p-8 grid lg:grid-cols-12 gap-6">
        {step === 1 && !loadingMsg && (
          <div className="lg:col-span-12 surface-card p-12 flex flex-col items-center justify-center border-dashed border-2 border-border/50 text-center animate-fade-in min-h-[50vh]">
            <div className="h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
              <Upload className="h-8 w-8" />
            </div>
            <h2 className="font-display text-xl font-bold mb-2">Upload Session Audio</h2>
            <p className="text-muted-foreground text-sm mb-6 max-w-md">
              Upload the raw audio recording of your session. SafeSpace AI will automatically transcribe and summarize it.
            </p>
            <input ref={fileRef} type="file" accept=".wav,.mp3" hidden onChange={(e) => handleUpload(e.target.files?.[0])} />
            <Button onClick={() => fileRef.current?.click()} className="gradient-primary text-primary-foreground border-0 mb-4">
              Select Audio File
            </Button>
            <div className="text-xs text-muted-foreground">.mp3 or .wav up to 50MB</div>
            
            <div className="mt-8 pt-8 border-t border-border/50 w-full max-w-sm flex flex-col items-center">
              <p className="text-xs text-muted-foreground mb-3">Or review an existing session:</p>
              <Button variant="outline" size="sm" onClick={() => setStep(4)}>Skip to Review mode</Button>
            </div>
          </div>
        )}

        {loadingMsg && (
          <div className="lg:col-span-12 surface-card p-12 flex flex-col items-center justify-center text-center animate-fade-in min-h-[50vh]">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-6" />
            <h2 className="font-display text-xl font-bold mb-2">{loadingMsg}</h2>
            <p className="text-muted-foreground text-sm mb-8">This may take a few moments...</p>
            
            <div className="w-64 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-1000 ease-out" 
                style={{ width: step === 1 ? '33%' : step === 2 ? '66%' : '100%' }}
              />
            </div>
            
            <div className="mt-6 flex gap-3 text-xs font-medium text-muted-foreground">
              <span className={cn(step >= 1 && "text-primary font-bold")}>Upload</span> &rarr;
              <span className={cn(step >= 2 && "text-primary font-bold")}>Transcribe</span> &rarr;
              <span className={cn(step >= 3 && "text-primary font-bold")}>Summarize</span>
            </div>
          </div>
        )}

        {step === 4 && !loadingMsg && (
          <>
            {/* Audio panel — col-span-5 */}
            <div className="lg:col-span-5 surface-card p-6 space-y-5 self-start animate-fade-in">
              <div className="label-eyebrow">Session audio</div>

              {/* Waveform */}
              <div className="h-28 flex items-end justify-center gap-1 px-2">
                {Array.from({ length: 60 }).map((_, i) => {
                  const active = (i / 60) * 100 < progress;
                  const h = 20 + Math.abs(Math.sin(i * 0.5)) * 60 + Math.random() * 10;
                  return (
                    <div
                      key={i}
                      className={cn("w-1.5 rounded-full transition-colors", active ? "bg-primary" : "bg-muted")}
                      style={{ height: `${h}%`, animation: playing && active ? `wave 0.8s ${i * 0.04}s ease-in-out infinite` : undefined }}
                    />
                  );
                })}
              </div>

              <div className="space-y-2">
                <Slider value={[progress]} max={100} step={0.5} onValueChange={(v) => setProgress(v[0])} />
                <div className="flex justify-between text-xs font-mono text-muted-foreground"><span>{fmt(progress)}</span><span>04:32</span></div>
              </div>

              <div className="flex items-center justify-between">
                <Button onClick={() => setPlaying((p) => !p)} className="rounded-full h-12 w-12 p-0 gradient-primary text-primary-foreground border-0">
                  {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
                </Button>
                <div className="flex items-center gap-3 flex-1 max-w-[180px] ml-6">
                  <Volume2 className="h-4 w-4 text-muted-foreground" />
                  <Slider value={[volume]} max={100} onValueChange={(v) => setVolume(v[0])} />
                </div>
              </div>

              <input ref={fileRef} type="file" accept=".wav,.mp3" hidden onChange={(e) => handleUpload(e.target.files?.[0])} />
              <Button variant="outline" onClick={() => fileRef.current?.click()} className="w-full"><Upload className="h-4 w-4 mr-2" /> Upload New Audio</Button>
            </div>

            {/* AI output — col-span-7 */}
            <div className="lg:col-span-7 surface-card p-6 space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="label-eyebrow">SafeSpace AI Summary</div>
              </div>

              <div className="flex flex-wrap gap-2">
                {editingArch ? (
                  <input
                    autoFocus
                    value={archetype}
                    onChange={(e) => setArchetype(e.target.value)}
                    onBlur={() => setEditingArch(false)}
                    onKeyDown={(e) => e.key === "Enter" && setEditingArch(false)}
                    className="px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-semibold outline-none border border-primary/30"
                  />
                ) : (
                  <button onClick={() => setEditingArch(true)} className="px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-semibold hover:bg-primary/25 transition">
                    {archetype} ✎
                  </button>
                )}
                <button
                  onClick={() => setTier(TIER_LEVELS[(TIER_LEVELS.indexOf(tier) + 1) % TIER_LEVELS.length])}
                  className={cn("px-3 py-1 rounded-full text-xs font-semibold transition", `bg-${tierColor}/15 text-${tierColor}`)}
                  style={{ backgroundColor: `hsl(var(--${tierColor}) / 0.15)`, color: `hsl(var(--${tierColor}))` }}
                >
                  {tier} risk
                </button>
              </div>

              <div>
                <Textarea
                  value={notes}
                  onChange={(e) => { setNotes(e.target.value); setSaved(false); }}
                  className="font-mono text-xs leading-relaxed bg-muted/40 min-h-[300px]"
                />
                <div className="text-xs text-muted-foreground mt-1 text-right">{notes.length} chars</div>
              </div>

              <div className="space-y-2">
                <Button variant="outline" onClick={regenerate} disabled={regenerating} className="w-full">
                  {regenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />} Regenerate Summary
                </Button>
                <Button
                  onClick={() => { setSaved(true); toast.success(`Session notes saved for ${student.name}.`); }}
                  disabled={saved}
                  className="w-full gradient-primary text-primary-foreground border-0"
                >
                  {saved ? <><Check className="h-4 w-4 mr-2" /> Saved</> : "Confirm & Save to Database"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">AI-generated summary. Always review before saving.</p>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
