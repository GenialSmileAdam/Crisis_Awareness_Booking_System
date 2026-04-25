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

const TIER_LEVELS = ["Green", "Orange", "Red"] as const;

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

  const tierColor = tier === "Red" ? "destructive" : tier === "Orange" ? "warning" : "success";

  const regenerate = () => {
    setRegenerating(true);
    setTimeout(() => {
      setNotes((n) => (n === MOCK_NOTES_VARIANTS[0] ? MOCK_NOTES_VARIANTS[1] : MOCK_NOTES_VARIANTS[0]));
      setRegenerating(false);
      toast.success("Summary regenerated");
    }, 1500);
  };

  const onFile = (f?: File) => {
    if (!f) return;
    if (!/\.(mp3|wav)$/i.test(f.name)) return toast.error("Please upload .mp3 or .wav");
    setFilename(f.name);
    setProgress(0);
    setPlaying(false);
    toast.success(`Loaded ${f.name}`);
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
        {/* Audio panel — col-span-5 */}
        <div className="lg:col-span-5 surface-card p-6 space-y-5 self-start">
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

          <input ref={fileRef} type="file" accept=".wav,.mp3" hidden onChange={(e) => onFile(e.target.files?.[0])} />
          <Button variant="outline" onClick={() => fileRef.current?.click()} className="w-full"><Upload className="h-4 w-4 mr-2" /> Upload New Audio</Button>
        </div>

        {/* AI output — col-span-7 */}
        <div className="lg:col-span-7 surface-card p-6 space-y-4">
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
      </div>
    </AppShell>
  );
}
