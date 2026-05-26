import { useState, useEffect } from "react";
import { ChevronRight, X, ArrowLeft, CheckCircle2, TrendingUp, TrendingDown, Minus, AlertTriangle, Users, Calendar, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { AreaChart, Area, ResponsiveContainer, ReferenceLine, Tooltip } from "recharts";

// ── Visual panels ─────────────────────────────────────────────────────────────

function WelcomeVisual({ name }: { name: string }) {
  const stats = [
    { label: "Your students", value: "20", sub: "across all risk tiers" },
    { label: "Need attention", value: "4", sub: "amber or above today", highlight: true },
    { label: "This week's sessions", value: "7", sub: "completed" },
  ];
  return (
    <div className="flex flex-col h-full p-6 gap-4 justify-center">
      <div className="glass border border-border rounded-2xl p-4 space-y-1">
        <p className="text-xs text-muted-foreground">Good morning,</p>
        <p className="text-xl font-bold font-display">{name || "Doctor"} 👋</p>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {stats.map((s) => (
          <div key={s.label} className={cn("glass border rounded-2xl px-4 py-3 flex items-center justify-between", s.highlight ? "border-[#FF8C42]/40 bg-[#FF8C42]/5" : "border-border")}>
            <div>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-xs text-muted-foreground">{s.sub}</p>
            </div>
            <p className={cn("text-2xl font-bold font-mono", s.highlight ? "text-[#FF8C42]" : "")}>{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// Mini WRS trend chart with insight callout
const wrsData = [
  { week: "W1", wrs: 38 }, { week: "W2", wrs: 35 }, { week: "W3", wrs: 40 },
  { week: "W4", wrs: 43 }, { week: "W5", wrs: 41 }, { week: "W6", wrs: 39 },
  { week: "W7", wrs: 54 }, // midterm peak
  { week: "W8", wrs: 48 }, { week: "W9", wrs: 44 }, { week: "W10", wrs: 42 },
  { week: "W11", wrs: 45 }, { week: "W12", wrs: 47 }, { week: "W13", wrs: 50 },
  { week: "W14", wrs: 53 },
  { week: "W15", wrs: 67 }, // finals peak
  { week: "W16", wrs: 58 }, { week: "W17", wrs: 52 },
];

function WrsTrendVisual() {
  return (
    <div className="flex flex-col h-full p-6 gap-4 justify-center">
      <div className="glass border border-border rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold">Campus Average WRS — This Semester</p>
          <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <div className="h-28">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={wrsData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
              <defs>
                <linearGradient id="psy-wrs-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#A8FF3E" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#A8FF3E" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip
                contentStyle={{ fontSize: 10, padding: "2px 8px", borderRadius: 8 }}
                formatter={(v: number) => [`WRS ${v}`, ""]}
                labelFormatter={(l) => l}
              />
              <ReferenceLine y={40} stroke="#FF8C42" strokeDasharray="3 3" strokeWidth={1} />
              <ReferenceLine y={65} stroke="#FF4560" strokeDasharray="3 3" strokeWidth={1} />
              <Area type="monotone" dataKey="wrs" stroke="#A8FF3E" strokeWidth={2} fill="url(#psy-wrs-grad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-[#FF8C42]/10 border border-[#FF8C42]/20">
          <AlertTriangle className="h-3.5 w-3.5 text-[#FF8C42] mt-0.5 shrink-0" />
          <p className="text-[10px] leading-relaxed text-[#FF8C42]">
            <strong>What this tells you:</strong> WRS spiked 42% during finals week (W15). Students who didn't have a session in the 2 weeks before W15 showed the steepest rises.
          </p>
        </div>
      </div>
    </div>
  );
}

function StudentListVisual() {
  const students = [
    { name: "Kemi O.", id: "STU008", wrs: 91, tier: "Critical", color: "#B00020", trend: "up" },
    { name: "Precious E.", id: "STU015", wrs: 88, tier: "Critical", color: "#B00020", trend: "up" },
    { name: "Zainab M.", id: "STU013", wrs: 69, tier: "Red", color: "#FF4560", trend: "up" },
    { name: "Emeka N.", id: "STU002", wrs: 48, tier: "Amber", color: "#FF8C42", trend: "stable" },
    { name: "Chioma O.", id: "STU001", wrs: 19, tier: "Green", color: "#A8FF3E", trend: "down" },
  ];
  const TrendIcon = ({ t }: { t: string }) =>
    t === "up" ? <TrendingUp className="h-3 w-3 text-destructive" />
    : t === "down" ? <TrendingDown className="h-3 w-3 text-[#A8FF3E]" />
    : <Minus className="h-3 w-3 text-muted-foreground" />;

  return (
    <div className="flex flex-col h-full p-6 gap-4 justify-center">
      <div className="glass border border-border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 bg-muted/40 flex items-center gap-2">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-xs font-medium">My Students</p>
          <span className="ml-auto text-xs text-muted-foreground">Sorted by risk</span>
        </div>
        {students.map((s) => (
          <div key={s.id} className="flex items-center gap-3 px-4 py-2.5 border-t border-border hover:bg-muted/20 transition">
            <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
              {s.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{s.name}</p>
              <p className="text-[10px] text-muted-foreground">{s.id}</p>
            </div>
            <TrendIcon t={s.trend} />
            <span className="text-xs font-mono font-medium w-8 text-right">{s.wrs}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${s.color}22`, color: s.color }}>
              {s.tier}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-start gap-2 p-2.5 rounded-xl bg-[#B00020]/10 border border-[#B00020]/20">
        <AlertTriangle className="h-3.5 w-3.5 text-[#B00020] mt-0.5 shrink-0" />
        <p className="text-[10px] leading-relaxed text-[#B00020]">
          <strong>2 Critical students</strong> have not had a session in over 3 weeks. They appear at the top of your list.
        </p>
      </div>
    </div>
  );
}

// Full student profile preview with WRS history
const studentWrs = [
  { w: "W1", v: 85 }, { w: "W3", v: 88 }, { w: "W5", v: 86 },
  { w: "W7", v: 95 }, { w: "W9", v: 91 }, { w: "W11", v: 89 },
  { w: "W13", v: 90 }, { w: "W15", v: 97 }, { w: "W17", v: 91 },
];

function StudentProfileVisual() {
  return (
    <div className="flex flex-col h-full p-6 gap-3 justify-center">
      <div className="glass border border-border rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-destructive/10 flex items-center justify-center font-bold text-destructive text-sm">K</div>
          <div>
            <p className="text-sm font-semibold">Kemi Obaseki</p>
            <p className="text-[10px] text-muted-foreground">STU008 · 300L Engineering</p>
          </div>
          <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full animate-pulse font-medium" style={{ backgroundColor: "#B0002022", color: "#B00020" }}>Critical</span>
        </div>

        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground">WRS History — Semester</p>
          <div className="h-20">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={studentWrs} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                <defs>
                  <linearGradient id="crit-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#B00020" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#B00020" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <ReferenceLine y={85} stroke="#B00020" strokeDasharray="3 3" strokeWidth={1} />
                <Area type="monotone" dataKey="v" stroke="#B00020" strokeWidth={2} fill="url(#crit-grad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-muted/40 rounded-xl p-2">
            <p className="text-sm font-bold">91</p>
            <p className="text-[9px] text-muted-foreground">Current WRS</p>
          </div>
          <div className="bg-muted/40 rounded-xl p-2">
            <p className="text-sm font-bold">4</p>
            <p className="text-[9px] text-muted-foreground">Sessions</p>
          </div>
          <div className="bg-muted/40 rounded-xl p-2">
            <p className="text-sm font-bold">2</p>
            <p className="text-[9px] text-muted-foreground">Crisis logs</p>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2 p-2.5 rounded-xl bg-primary/10 border border-primary/20">
        <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
        <p className="text-[10px] leading-relaxed">
          <strong>WRS has stayed above 85 for the entire semester.</strong> This student's score has never dropped below Critical. Consider increasing session frequency.
        </p>
      </div>
    </div>
  );
}

function SessionsVisual() {
  const appts = [
    { student: "Kemi O.", date: "Tomorrow, 10:00 AM", status: "upcoming", crisis: true },
    { student: "Precious E.", date: "Thu, 2:00 PM", status: "upcoming", crisis: false },
    { student: "Zainab M.", date: "Mon, 9:00 AM — Done", status: "completed", crisis: false },
  ];
  return (
    <div className="flex flex-col h-full p-6 gap-4 justify-center">
      <div className="glass border border-border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 bg-muted/40 flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-xs font-medium">Sessions</p>
        </div>
        {appts.map((a) => (
          <div key={a.student} className="flex items-center gap-3 px-4 py-3 border-t border-border">
            <div className={cn("h-2 w-2 rounded-full shrink-0", a.status === "completed" ? "bg-[#A8FF3E]" : "bg-primary animate-pulse")} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-medium">{a.student}</p>
                {a.crisis && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">Crisis</span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">{a.date}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-start gap-2 p-2.5 rounded-xl bg-primary/10 border border-primary/20">
        <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
        <p className="text-[10px] leading-relaxed">
          Students marked <strong>Crisis</strong> are automatically placed first in your schedule. The system notifies their emergency contact if a session is missed.
        </p>
      </div>
    </div>
  );
}

// ── Slide definitions ─────────────────────────────────────────────────────────

const slides = [
  {
    title: "Welcome, Doctor",
    description: "SafeSpace gives you a live view of your students' mental wellbeing — so you spend less time on admin and more time on care.",
    bullets: ["Real-time Wellness Risk Scores for all your students", "Instant crisis alerts and priority flagging", "Semester-long trend data to spot patterns early"],
    Visual: WelcomeVisual,
  },
  {
    title: "Campus Risk Trends",
    description: "The WRS trend chart shows the average student risk score across the whole semester. It tells you not just who is struggling — but when and why.",
    bullets: ["Peaks at midterms (W7) and finals (W15) are predictable", "Drops after your interventions show measurable impact", "Use trends to schedule proactive check-ins before crises occur"],
    Visual: WrsTrendVisual,
  },
  {
    title: "Your Student List",
    description: "Every student assigned to you is listed by risk, highest first. You'll always know who needs your attention most without reading through notes.",
    bullets: ["Red/Critical students surface automatically at the top", "Trend arrows show if a student is improving or worsening", "Tap any student for their full profile and history"],
    Visual: StudentListVisual,
  },
  {
    title: "Student Profile",
    description: "Each student has a full profile showing their WRS history as a chart, past sessions, check-in records, and crisis logs — all in one place.",
    bullets: ["WRS chart shows the whole semester at a glance", "Flat or rising lines are early warning signs", "You can override a student's risk tier with a written reason"],
    Visual: StudentProfileVisual,
  },
  {
    title: "Sessions & Scheduling",
    description: "Manage all your upcoming and completed sessions. Crisis-flagged appointments are highlighted and prioritised automatically.",
    bullets: ["Crisis students appear first — always", "Completed sessions are logged against the student's profile", "Missed appointments trigger an alert to the student's emergency contact"],
    Visual: SessionsVisual,
  },
];

// ── Shell ─────────────────────────────────────────────────────────────────────

export function PsychologistOnboardingSlides() {
  const { user } = useAuth();
  const storageKey = `safespace_psychologist_onboarding_v2_${user?.sub}`;
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
      <div className="flex items-center justify-between px-6 py-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md gradient-primary" />
          <span className="text-sm font-semibold">SafeSpace</span>
        </div>
        <Button variant="ghost" size="sm" onClick={done} className="text-muted-foreground gap-1.5">
          Skip <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <div className="flex flex-col justify-center px-8 md:px-12 lg:px-16 py-6 md:py-0 md:w-[45%] shrink-0">
          <div key={current} className="animate-in slide-in-from-bottom-4 fade-in duration-400 space-y-5">
            <span className="text-xs font-medium text-muted-foreground">{current + 1} / {slides.length}</span>
            <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight leading-tight">
              {slide.title}
            </h2>
            <p className="text-muted-foreground leading-relaxed text-base">{slide.description}</p>
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

        <div className="flex-1 flex items-center justify-center p-4 md:p-8 md:border-l border-border overflow-hidden">
          <div key={`visual-${current}`} className="animate-in slide-in-from-right-8 fade-in duration-500 w-full max-w-sm h-full max-h-[460px] md:max-h-none">
            <Visual name={firstName} />
          </div>
        </div>
      </div>

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
            <button key={i} onClick={() => setCurrent(i)}
              className={cn("h-2 rounded-full transition-all duration-300", i === current ? "w-6 bg-primary" : "w-2 bg-primary/20 hover:bg-primary/40")}
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
