import { useState, useEffect } from "react";
import { ChevronRight, X, ArrowLeft, Shield, CheckCircle2, TrendingDown, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

// ── Visual panels ────────────────────────────────────────────────────────────

function WelcomeVisual({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-6">
      <div className="h-20 w-20 rounded-2xl gradient-primary flex items-center justify-center shadow-xl">
        <Shield className="h-10 w-10 text-primary-foreground" />
      </div>
      <div className="text-center space-y-2">
        <p className="text-2xl font-bold font-display">Hi, {name || "there"} 👋</p>
        <p className="text-muted-foreground text-sm">You're now inside SafeSpace</p>
      </div>
      <div className="w-full max-w-xs space-y-2">
        {["Private & secure", "Evidence-based tools", "Your counsellor is here"].map((item) => (
          <div key={item} className="flex items-center gap-3 glass border border-border rounded-xl px-4 py-2.5">
            <CheckCircle2 className="h-4 w-4 text-[#A8FF3E] shrink-0" />
            <span className="text-sm">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CheckinVisual() {
  const [selected, setSelected] = useState<number | null>(1);
  const opts = ["Not at all", "Several days", "More than half", "Nearly every day"];
  return (
    <div className="flex flex-col h-full p-6 gap-4">
      <div className="glass border border-border rounded-2xl p-4 flex-1 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">PHQ-9 · Q3 of 9</span>
        </div>
        <p className="text-sm font-medium leading-relaxed">Trouble falling asleep, staying asleep, or sleeping too much?</p>
        <div className="grid grid-cols-2 gap-2">
          {opts.map((o, i) => (
            <button
              key={o}
              onClick={() => setSelected(i)}
              className={cn(
                "text-xs rounded-xl px-3 py-2 border transition text-left",
                selected === i
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border hover:bg-muted"
              )}
            >
              {o}
            </button>
          ))}
        </div>
        <div className="mt-auto">
          <div className="w-full bg-muted rounded-full h-1.5">
            <div className="bg-primary h-1.5 rounded-full" style={{ width: "33%" }} />
          </div>
          <p className="text-xs text-muted-foreground mt-1">3 of 9 answered</p>
        </div>
      </div>
      <div className="flex gap-2">
        {["PHQ-9", "GAD-7", "Pulse"].map((t) => (
          <span key={t} className={cn("text-xs px-3 py-1 rounded-full border", t === "PHQ-9" ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground")}>{t}</span>
        ))}
      </div>
    </div>
  );
}

function WrsVisual() {
  const tiers = [
    { label: "Green", range: "0–39", color: "#A8FF3E", desc: "Low concern" },
    { label: "Amber", range: "40–64", color: "#FF8C42", desc: "Monitor closely" },
    { label: "Red", range: "65–84", color: "#FF4560", desc: "Escalate soon" },
    { label: "Critical", range: "85–100", color: "#B00020", desc: "Act immediately" },
  ];
  return (
    <div className="flex flex-col h-full p-6 gap-4 justify-center">
      <div className="glass border border-border rounded-2xl p-4 space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Your Wellness Risk Score</p>
        <div className="flex items-end gap-3">
          <span className="text-5xl font-bold font-mono">24</span>
          <span className="text-xs px-2.5 py-1 rounded-full font-medium mb-2" style={{ backgroundColor: "#A8FF3E25", color: "#A8FF3E" }}>Green · Low</span>
        </div>
        <div className="flex gap-1 h-2 rounded-full overflow-hidden">
          <div className="flex-1 rounded-l-full" style={{ background: "#A8FF3E" }} />
          <div className="flex-1" style={{ background: "#FF8C42" }} />
          <div className="flex-1" style={{ background: "#FF4560" }} />
          <div className="flex-1 rounded-r-full" style={{ background: "#B00020" }} />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground px-0.5">
          <span>0</span><span>40</span><span>65</span><span>85</span><span>100</span>
        </div>
      </div>
      <div className="space-y-2">
        {tiers.map((t) => (
          <div key={t.label} className="flex items-center gap-3 glass border border-border rounded-xl px-3 py-2">
            <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: t.color }} />
            <span className="text-xs font-medium w-14">{t.label}</span>
            <span className="text-xs text-muted-foreground font-mono">{t.range}</span>
            <span className="text-xs text-muted-foreground ml-auto">{t.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AppointmentVisual() {
  const slots = ["9:00 AM", "10:00 AM", "2:00 PM", "3:00 PM"];
  const [picked, setPicked] = useState("10:00 AM");
  return (
    <div className="flex flex-col h-full p-6 gap-4 justify-center">
      <div className="glass border border-border rounded-2xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Book a Session</p>
          <span className="text-xs text-muted-foreground">June 2026</span>
        </div>
        <div className="flex items-center gap-2 p-2 rounded-xl bg-muted/40">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">AA</div>
          <div>
            <p className="text-xs font-medium">Dr. Amara Adeyemi</p>
            <p className="text-[10px] text-muted-foreground">Clinical Psychologist</p>
          </div>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-2">Available slots — Tuesday, Jun 10</p>
          <div className="grid grid-cols-2 gap-2">
            {slots.map((s) => (
              <button
                key={s}
                onClick={() => setPicked(s)}
                className={cn(
                  "text-xs rounded-xl px-3 py-2 border transition",
                  picked === s ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 p-2 rounded-xl border border-destructive/30 bg-destructive/5">
          <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
          <p className="text-[10px] text-destructive">Need urgent support? Mark as Crisis</p>
        </div>
      </div>
    </div>
  );
}

function ForumVisual() {
  const posts = [
    { tag: "Anxiety", time: "2h ago", text: "Anyone else struggle with exam pressure? I can barely sleep anymore..." },
    { tag: "Support", time: "4h ago", text: "The breathing exercises from last week's resource really helped me. Sharing in case others need it." },
  ];
  return (
    <div className="flex flex-col h-full p-6 gap-3 justify-center">
      {posts.map((p) => (
        <div key={p.tag} className="glass border border-border rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">A</div>
            <span className="text-xs text-muted-foreground">Anonymous · {p.time}</span>
            <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">{p.tag}</span>
          </div>
          <p className="text-xs leading-relaxed">{p.text}</p>
          <div className="flex gap-3 text-[10px] text-muted-foreground">
            <span>💬 3 replies</span>
            <span>❤️ 12 supports</span>
          </div>
        </div>
      ))}
      <p className="text-[11px] text-muted-foreground text-center">Your name is never shown. Ever.</p>
    </div>
  );
}

function PrivacyVisual() {
  const [consent, setConsent] = useState(true);
  return (
    <div className="flex flex-col h-full p-6 gap-4 justify-center">
      <div className="glass border border-border rounded-2xl p-4 space-y-4">
        <p className="text-sm font-semibold">Your Consent Settings</p>
        <div className="space-y-3">
          {[
            { label: "Allow wellbeing monitoring", sub: "Your counsellor can view your WRS score", checked: consent, toggle: true },
            { label: "Anonymous forum participation", sub: "Post and reply without revealing your identity", checked: true, toggle: false },
            { label: "Crisis escalation alerts", sub: "Counsellors are notified in emergencies only", checked: true, toggle: false },
          ].map((item) => (
            <div key={item.label} className="flex items-start gap-3 p-3 rounded-xl bg-muted/30">
              <button
                onClick={() => item.toggle && setConsent(!consent)}
                className={cn(
                  "mt-0.5 h-5 w-9 rounded-full transition-colors shrink-0",
                  item.checked ? "bg-primary" : "bg-muted-foreground/30"
                )}
              >
                <div className={cn("h-3.5 w-3.5 rounded-full bg-white mx-0.5 transition-transform", item.checked ? "translate-x-3.5" : "translate-x-0")} />
              </button>
              <div>
                <p className="text-xs font-medium">{item.label}</p>
                <p className="text-[10px] text-muted-foreground">{item.sub}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground">You can change these anytime from your profile.</p>
      </div>
    </div>
  );
}

// ── Slide definitions ─────────────────────────────────────────────────────────

const slides = [
  {
    title: "Welcome to SafeSpace",
    description: "A private, secure space designed to support your mental wellbeing at Nile University.",
    bullets: ["100% confidential", "Evidence-based assessments", "Direct access to your counsellor"],
    Visual: WelcomeVisual,
  },
  {
    title: "Daily Check-ins",
    description: "Take 2 minutes to tell us how you're feeling. Your responses are scored using the same tools clinical psychologists use.",
    bullets: ["PHQ-9 measures depression symptoms", "GAD-7 measures anxiety symptoms", "Pulse is a quick daily mood check"],
    Visual: CheckinVisual,
  },
  {
    title: "Your Risk Score",
    description: "Every check-in updates your Wellness Risk Score (WRS) — a 0–100 number your counsellor uses to understand how you're doing over time.",
    bullets: ["Green (0–39): Doing well", "Amber/Red: Counsellor checks in", "Critical: Immediate support triggered"],
    Visual: WrsVisual,
  },
  {
    title: "Book Appointments",
    description: "Need to talk? Request a session with your assigned psychologist in a few taps. Crisis cases are automatically prioritised.",
    bullets: ["Choose your preferred time slot", "Mark as Crisis for same-day priority", "Get reminders before your session"],
    Visual: AppointmentVisual,
  },
  {
    title: "Anonymous Forum",
    description: "Connect with other students without anyone knowing who you are. Your identity is mathematically separated from your posts.",
    bullets: ["No names, no photos, no identifiers", "Tag posts by topic (anxiety, academics…)", "Counsellors can see posts but not who wrote them"],
    Visual: ForumVisual,
  },
  {
    title: "You're in control",
    description: "Your data is yours. You decide what your counsellor can see, and you can change your mind at any time.",
    bullets: ["Toggle wellbeing monitoring on/off", "Crisis alerts are always-on for your safety", "Download or delete your data anytime"],
    Visual: PrivacyVisual,
  },
];

// ── Shell ─────────────────────────────────────────────────────────────────────

export function OnboardingSlides() {
  const { user } = useAuth();
  const storageKey = `safespace_onboarding_v2_${user?.sub}`;
  const [isVisible, setIsVisible] = useState(false);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!user?.sub) return;
    if (!localStorage.getItem(storageKey)) setIsVisible(true);
  }, [storageKey, user?.sub]);

  const done = () => { localStorage.setItem(storageKey, "true"); setIsVisible(false); };
  const next = () => current < slides.length - 1 ? setCurrent(c => c + 1) : done();
  const prev = () => current > 0 && setCurrent(c => c - 1);

  if (!isVisible) return null;

  const slide = slides[current];
  const { Visual } = slide;
  const firstName = user?.name?.split(" ")[0] || "";

  return (
    <div className="fixed inset-0 z-[100] bg-background/98 backdrop-blur-md flex flex-col animate-in fade-in duration-400">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md gradient-primary" />
          <span className="text-sm font-semibold">SafeSpace</span>
        </div>
        <Button variant="ghost" size="sm" onClick={done} className="text-muted-foreground gap-1.5">
          Skip <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left: text */}
        <div className="flex flex-col justify-center px-8 md:px-12 lg:px-16 py-6 md:py-0 md:w-[45%] shrink-0">
          <div key={current} className="animate-in slide-in-from-bottom-4 fade-in duration-400 space-y-5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                {current + 1} / {slides.length}
              </span>
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight leading-tight">
              {slide.title}
            </h2>
            <p className="text-muted-foreground leading-relaxed text-base">
              {slide.description}
            </p>
            <ul className="space-y-2.5 pt-1">
              {slide.bullets.map((b) => (
                <li key={b} className="flex items-start gap-2.5 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right: visual */}
        <div className="flex-1 flex items-center justify-center p-4 md:p-8 md:border-l border-border overflow-hidden">
          <div
            key={`visual-${current}`}
            className="animate-in slide-in-from-right-8 fade-in duration-500 w-full max-w-sm h-full max-h-[420px] md:max-h-none"
          >
            <Visual name={firstName} />
          </div>
        </div>
      </div>

      {/* Nav */}
      <div className="px-8 md:px-12 lg:px-16 py-5 flex items-center justify-between border-t border-border shrink-0">
        <div className="w-24">
          {current > 0 ? (
            <Button variant="ghost" onClick={prev} className="text-muted-foreground gap-1.5">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          ) : <div />}
        </div>

        <div className="flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                i === current ? "w-6 bg-primary" : "w-2 bg-primary/20 hover:bg-primary/40"
              )}
            />
          ))}
        </div>

        <Button onClick={next} className="gradient-primary text-primary-foreground border-0 gap-1.5">
          {current === slides.length - 1 ? "Get Started" : (<>Next <ChevronRight className="h-4 w-4" /></>)}
        </Button>
      </div>
    </div>
  );
}
