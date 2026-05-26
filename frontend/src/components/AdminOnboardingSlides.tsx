import { useState, useEffect } from "react";
import { ChevronRight, X, ArrowLeft, CheckCircle2, AlertTriangle, TrendingDown, TrendingUp, Users, BookOpen, MessageSquare, Settings, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { AreaChart, Area, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from "recharts";

// ── Visual panels ─────────────────────────────────────────────────────────────

function WelcomeVisual({ name }: { name: string }) {
  const kpis = [
    { label: "Total students", value: "20", sub: "this semester", icon: Users, color: "text-primary" },
    { label: "High-risk alerts", value: "4", sub: "need attention now", icon: AlertTriangle, color: "text-[#FF8C42]", highlight: true },
    { label: "Check-in rate", value: "78%", sub: "weekly engagement", icon: CheckCircle2, color: "text-[#A8FF3E]" },
    { label: "Crisis cases", value: "2", sub: "unresolved", icon: Shield, color: "text-destructive" },
  ];
  return (
    <div className="flex flex-col h-full p-6 gap-4 justify-center">
      <div className="glass border border-border rounded-2xl p-4 space-y-1">
        <p className="text-xs text-muted-foreground">Signed in as Administrator</p>
        <p className="text-xl font-bold font-display">{name || "Admin"} 👋</p>
        <p className="text-xs text-muted-foreground">You have full visibility across the university.</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {kpis.map((k) => (
          <div key={k.label} className={cn("glass border rounded-2xl p-3 space-y-1", k.highlight ? "border-[#FF8C42]/30 bg-[#FF8C42]/5" : "border-border")}>
            <k.icon className={cn("h-4 w-4", k.color)} />
            <p className="text-lg font-bold font-mono">{k.value}</p>
            <p className="text-[10px] text-muted-foreground leading-tight">{k.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const wrsWeekly = [
  { w: "W1", avg: 38 }, { w: "W3", avg: 40 }, { w: "W5", avg: 39 },
  { w: "W7", avg: 54 }, { w: "W9", avg: 46 }, { w: "W11", avg: 43 },
  { w: "W13", avg: 47 }, { w: "W15", avg: 65 }, { w: "W17", avg: 52 },
];

const tierData = [
  { name: "Green", value: 10, color: "#A8FF3E" },
  { name: "Amber", value: 6, color: "#FF8C42" },
  { name: "Red", value: 2, color: "#FF4560" },
  { name: "Critical", value: 2, color: "#B00020" },
];

function AnalyticsVisual() {
  return (
    <div className="flex flex-col h-full p-6 gap-3 justify-center">
      <div className="glass border border-border rounded-2xl p-4 space-y-3">
        <p className="text-xs font-semibold">Campus WRS — Semester Average</p>
        <div className="h-24">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={wrsWeekly} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
              <defs>
                <linearGradient id="admin-wrs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#A8FF3E" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#A8FF3E" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip contentStyle={{ fontSize: 10 }} formatter={(v: number) => [`WRS ${v}`, ""]} labelFormatter={l => l} />
              <Area type="monotone" dataKey="avg" stroke="#A8FF3E" strokeWidth={2} fill="url(#admin-wrs)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex gap-2 text-[10px] text-muted-foreground justify-between px-1">
          <span>Sem start</span>
          <span className="text-[#FF8C42]">↑ Midterms W7</span>
          <span className="text-[#FF4560]">↑ Finals W15</span>
          <span>Now</span>
        </div>
      </div>

      <div className="glass border border-border rounded-2xl p-4 flex items-center gap-4">
        <div className="h-24 w-24 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={tierData} cx="50%" cy="50%" innerRadius={22} outerRadius={40} dataKey="value" stroke="none">
                {tierData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-1.5 flex-1">
          {tierData.map((t) => (
            <div key={t.name} className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full shrink-0" style={{ background: t.color }} />
              <span className="text-xs flex-1">{t.name}</span>
              <span className="text-xs font-mono font-medium">{t.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-2 p-2.5 rounded-xl bg-primary/10 border border-primary/20">
        <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
        <p className="text-[10px] leading-relaxed">
          <strong>What this means:</strong> 20% of your students are in Red or Critical. The WRS spike at W15 shows finals pressure is the highest-risk period — schedule additional counsellor hours before W14 next semester.
        </p>
      </div>
    </div>
  );
}

function KpiVisual() {
  const kpis = [
    { label: "Weekly Active Usage", value: "78%", target: "≥ 70%", met: true, desc: "Students completing at least one check-in per week" },
    { label: "Crisis Resolution Rate", value: "85%", target: "≥ 80%", met: true, desc: "Crisis cases resolved within 48 hours" },
    { label: "WRS Trend (30-day)", value: "−8%", target: "Decreasing", met: true, desc: "Average campus WRS is falling — interventions are working" },
    { label: "High-Risk Students", value: "20%", target: "< 25%", met: true, desc: "Students in Red or Critical tier this week" },
    { label: "Appt Completion Rate", value: "91%", target: "≥ 85%", met: true, desc: "Booked sessions that were attended" },
  ];
  return (
    <div className="flex flex-col h-full p-6 gap-3 justify-center">
      <p className="text-xs font-medium text-muted-foreground">Deployment KPIs (MDS Compliance)</p>
      <div className="space-y-2">
        {kpis.map((k) => (
          <div key={k.label} className="glass border border-border rounded-xl px-3 py-2.5 flex items-start gap-3">
            <div className={cn("h-5 w-5 rounded-full flex items-center justify-center shrink-0 mt-0.5", k.met ? "bg-[#A8FF3E]/20" : "bg-destructive/20")}>
              {k.met
                ? <TrendingDown className="h-3 w-3 text-[#A8FF3E]" />
                : <TrendingUp className="h-3 w-3 text-destructive" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-xs font-medium truncate">{k.label}</p>
                <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full shrink-0", k.met ? "bg-[#A8FF3E]/15 text-[#A8FF3E]" : "bg-destructive/15 text-destructive")}>
                  {k.met ? "On target" : "Below target"}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-base font-bold font-mono">{k.value}</span>
                <span className="text-[10px] text-muted-foreground">target: {k.target}</span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{k.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function UserMgmtVisual() {
  const users = [
    { name: "Kemi Obaseki", role: "Student", id: "STU008", tier: "Critical", color: "#B00020" },
    { name: "Dr. Amara Adeyemi", role: "Psychologist", id: "PSY001", tier: null, color: null },
    { name: "Chioma Okafor", role: "Student", id: "STU001", tier: "Green", color: "#A8FF3E" },
    { name: "Hassan Abdullahi", role: "Student", id: "STU018", tier: "Red", color: "#FF4560" },
  ];
  return (
    <div className="flex flex-col h-full p-6 gap-4 justify-center">
      <div className="glass border border-border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 bg-muted/40 flex items-center gap-2">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-xs font-medium">User Management</p>
          <Button size="sm" className="ml-auto h-6 text-[10px] gradient-primary text-primary-foreground border-0 px-2">+ Add User</Button>
        </div>
        {users.map((u) => (
          <div key={u.id} className="flex items-center gap-3 px-4 py-2.5 border-t border-border">
            <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">{u.name[0]}</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{u.name}</p>
              <p className="text-[10px] text-muted-foreground">{u.id} · {u.role}</p>
            </div>
            {u.tier && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0"
                style={{ backgroundColor: `${u.color}22`, color: u.color as string }}>
                {u.tier}
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="flex items-start gap-2 p-2.5 rounded-xl bg-primary/10 border border-primary/20">
        <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
        <p className="text-[10px] leading-relaxed">
          Import an entire student cohort from the registrar's CSV export in one step. Psychologist assignments can be set in bulk.
        </p>
      </div>
    </div>
  );
}

function ResourcesForumVisual() {
  return (
    <div className="flex flex-col h-full p-6 gap-3 justify-center">
      {/* Resources */}
      <div className="glass border border-border rounded-2xl p-4 space-y-2">
        <div className="flex items-center gap-2">
          <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-xs font-medium">Resources</p>
          <Button size="sm" className="ml-auto h-6 text-[10px] gradient-primary text-primary-foreground border-0 px-2">+ Upload</Button>
        </div>
        {["Managing exam anxiety", "Sleep & mental health guide", "Breathing techniques PDF"].map((r) => (
          <div key={r} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-muted/30">
            <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center shrink-0">
              <BookOpen className="h-3 w-3 text-primary" />
            </div>
            <p className="text-[10px] truncate">{r}</p>
          </div>
        ))}
      </div>

      {/* Forum moderation */}
      <div className="glass border border-border rounded-2xl p-4 space-y-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-xs font-medium">Forum — 3 posts today</p>
        </div>
        <div className="space-y-1.5">
          {[
            { text: "Anyone else struggling with group project stress?", flag: false },
            { text: "[Flagged] This post may violate community guidelines", flag: true },
          ].map((p) => (
            <div key={p.text} className={cn("flex items-start gap-2 p-2 rounded-lg text-[10px]", p.flag ? "bg-destructive/10 border border-destructive/20" : "bg-muted/30")}>
              {p.flag && <AlertTriangle className="h-3 w-3 text-destructive mt-0.5 shrink-0" />}
              <p className="leading-snug">{p.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SettingsVisual() {
  const opts = [
    { label: "AI-generated insights", on: true },
    { label: "Email notifications", on: true },
    { label: "Crisis SMS alerts", on: false },
    { label: "Google Calendar sync", on: false },
  ];
  const [states, setStates] = useState(opts.map(o => o.on));
  return (
    <div className="flex flex-col h-full p-6 gap-4 justify-center">
      <div className="glass border border-border rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Settings className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-xs font-medium">Platform Settings</p>
        </div>
        <div className="space-y-2">
          {opts.map((o, i) => (
            <div key={o.label} className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-muted/30">
              <p className="text-xs">{o.label}</p>
              <button
                onClick={() => setStates(s => s.map((v, j) => j === i ? !v : v))}
                className={cn("h-5 w-9 rounded-full transition-colors shrink-0", states[i] ? "bg-primary" : "bg-muted-foreground/30")}
              >
                <div className={cn("h-3.5 w-3.5 rounded-full bg-white mx-0.5 transition-transform", states[i] ? "translate-x-3.5" : "translate-x-0")} />
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-start gap-2 p-2.5 rounded-xl bg-muted/50 border border-border">
        <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          All optional integrations default to off. The platform works fully without external API keys.
        </p>
      </div>
    </div>
  );
}

// ── Slide definitions ─────────────────────────────────────────────────────────

const slides = [
  {
    title: "Welcome, Admin",
    description: "SafeSpace gives you a university-wide view of student mental health — every student, every counsellor, every risk event.",
    bullets: ["Full visibility across all psychologists and students", "Real-time crisis alerts with escalation history", "Deployment KPIs for compliance reporting"],
    Visual: WelcomeVisual,
  },
  {
    title: "Analytics & Trends",
    description: "The dashboard translates raw check-in scores into decisions. You don't need to be a data scientist — the system tells you what the numbers mean.",
    bullets: ["WRS trend shows when stress peaks hit campus-wide", "Risk tier breakdown shows exactly how many students need attention", "Semester patterns let you plan proactive support next year"],
    Visual: AnalyticsVisual,
  },
  {
    title: "Deployment KPIs",
    description: "Track whether the platform is actually improving student outcomes. Each KPI has a plain-English explanation so you can brief stakeholders without statistics.",
    bullets: ["Weekly engagement: are students using the tool?", "Crisis resolution rate: are emergencies handled quickly?", "WRS trend: is the average student improving over the semester?"],
    Visual: KpiVisual,
  },
  {
    title: "User Management",
    description: "Add students and counsellors, assign workloads, and bulk-import cohorts from your registrar's CSV. No technical skill required.",
    bullets: ["One CSV upload adds an entire year group", "Assign students to psychologists in bulk", "Deactivate accounts without deleting data"],
    Visual: UserMgmtVisual,
  },
  {
    title: "Resources & Forum",
    description: "Upload mental health resources for students and moderate the anonymous forum to keep the community safe.",
    bullets: ["Upload PDFs, articles, and videos for students", "Flagged forum posts appear at the top for review", "Remove harmful content with one click — anonymity preserved"],
    Visual: ResourcesForumVisual,
  },
  {
    title: "Platform Settings",
    description: "Control all integrations and platform behaviour from one place. Everything is feature-flagged — turn features on as you're ready.",
    bullets: ["AI insights, email, SMS, and calendar are all optional", "System runs fully without any external API keys", "Consent policies can be updated without a code change"],
    Visual: SettingsVisual,
  },
];

// ── Shell ─────────────────────────────────────────────────────────────────────

export function AdminOnboardingSlides() {
  const { user } = useAuth();
  const storageKey = `safespace_admin_onboarding_v2_${user?.sub}`;
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
          <div key={`visual-${current}`} className="animate-in slide-in-from-right-8 fade-in duration-500 w-full max-w-sm h-full max-h-[500px] md:max-h-none overflow-y-auto">
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
