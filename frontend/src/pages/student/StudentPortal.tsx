import { useMemo, useState } from "react";
import { Bell, Home, ClipboardList, History, BookOpen, Calendar, MessageSquare, ChevronRight, Check } from "lucide-react";
import { AppShell, SidebarItem } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import { Link } from "react-router-dom";
import { useWrs } from "@/context/WrsContext";
import { useAuth } from "@/context/AuthContext";
import { tierFromWrs, RECENT_CHECKINS, PHQ9_QUESTIONS, PHQ9_OPTIONS, GAD7_QUESTIONS, GAD7_OPTIONS, PULSE_QUESTIONS, colorFromWrs } from "@/data/mock";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { sessionCheckInComplete, setSessionCheckInComplete } from "@/components/StudentRoute";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { CrisisBanner, BookingModal, HotlineModal } from "@/components/CrisisBanner";

type SurveyTab = "pulse" | "phq9" | "gad7";

const baseItems: SidebarItem[] = [
  { icon: Home, label: "Home", to: "/student", end: true },
  { icon: ClipboardList, label: "Check-in", to: "/student" },
  { icon: Calendar, label: "Appointments", to: "/student/appointments" },
  { icon: History, label: "My History", to: "/student/history" },
  { icon: BookOpen, label: "Resources", to: "/student/resources" },
];

function PHQ9Form({ onSubmit }: { onSubmit: (responses: Record<string, number>) => void }) {
  const [answers, setAnswers] = useState<number[]>(Array(9).fill(-1));
  const submit = () => {
    if (answers.some((a) => a < 0)) return toast.error("Please answer all questions");
    const responses: Record<string, number> = {};
    answers.forEach((v, i) => { responses[`q${i + 1}`] = v; });
    onSubmit(responses);
  };
  return (
    <div className="space-y-5">
      {PHQ9_QUESTIONS.map((q, i) => (
        <div key={i} className="space-y-2">
          <div className="text-sm font-medium">{i + 1}. {q}</div>
          <div className="flex flex-wrap gap-2">
            {PHQ9_OPTIONS.map((opt) => (
              <button key={opt.value} onClick={() => setAnswers((a) => a.map((v, j) => (j === i ? opt.value : v)))} className={cn("px-3 py-1.5 text-xs rounded-full border transition", answers[i] === opt.value ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted")}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      ))}
      <Button onClick={submit} className="w-full gradient-primary text-primary-foreground border-0">Submit Check-in</Button>
    </div>
  );
}

function GAD7Form({ onSubmit }: { onSubmit: (responses: Record<string, number>) => void }) {
  const [answers, setAnswers] = useState<number[]>(Array(7).fill(-1));
  const submit = () => {
    if (answers.some((a) => a < 0)) return toast.error("Please answer all questions");
    const responses: Record<string, number> = {};
    answers.forEach((v, i) => { responses[`q${i + 1}`] = v; });
    onSubmit(responses);
  };
  return (
    <div className="space-y-5">
      {GAD7_QUESTIONS.map((q, i) => (
        <div key={i} className="space-y-2">
          <div className="text-sm font-medium">{i + 1}. {q}</div>
          <div className="flex flex-wrap gap-2">
            {GAD7_OPTIONS.map((opt) => (
              <button key={opt.value} onClick={() => setAnswers((a) => a.map((v, j) => (j === i ? opt.value : v)))} className={cn("px-3 py-1.5 text-xs rounded-full border transition", answers[i] === opt.value ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted")}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      ))}
      <Button onClick={submit} className="w-full gradient-primary text-primary-foreground border-0">Submit Check-in</Button>
    </div>
  );
}

function PulseForm({ onSubmit }: { onSubmit: (responses: Record<string, number>) => void }) {
  const [vals, setVals] = useState<number[]>(Array(5).fill(3));
  const submit = () => {
    const responses: Record<string, number> = {};
    vals.forEach((v, i) => { responses[`q${i + 1}`] = v; });
    onSubmit(responses);
  };
  const emojis = ["😢", "😕", "😐", "🙂", "😄"];
  return (
    <div className="space-y-6">
      {PULSE_QUESTIONS.map((q, i) => (
        <div key={i}>
          <div className="text-sm font-medium mb-3">{i + 1}. {q}</div>
          <div className="flex items-center gap-4">
            <Slider value={[vals[i]]} min={1} max={5} step={1} onValueChange={(v) => setVals((arr) => arr.map((x, j) => (j === i ? v[0] : x)))} className="flex-1" />
            <span className="text-2xl w-10 text-center">{emojis[vals[i] - 1]}</span>
          </div>
        </div>
      ))}
      <Button onClick={submit} className="w-full gradient-primary text-primary-foreground border-0">Submit Check-in</Button>
    </div>
  );
}

export default function StudentPortal() {
  const { wrs, setWrs } = useWrs();
  const { user } = useAuth();
  const studentName = user?.name || "Student";

  // Pending survey tracking
  const [completedSurveys, setCompletedSurveys] = useState<Set<SurveyTab>>(new Set());
  const pendingSurveys = useMemo(() => {
    const pending: SurveyTab[] = [];
    if (!completedSurveys.has("pulse")) pending.push("pulse");
    if (!completedSurveys.has("phq9")) pending.push("phq9");
    if (!completedSurveys.has("gad7")) pending.push("gad7");
    return pending;
  }, [completedSurveys]);

  const allComplete = pendingSurveys.length === 0;
  const [tab, setTab] = useState<SurveyTab>(pendingSurveys[0] || "pulse");

  const [bookingOpen, setBookingOpen] = useState(false);
  const [hotlineOpen, setHotlineOpen] = useState(false);
  const tier = tierFromWrs(wrs);

  const [hasCompletedRecently, setHasCompletedRecently] = useState(sessionCheckInComplete);

  const handleSubmit = (responses: Record<string, number>) => {
    // Calculate score from responses for WRS
    const values = Object.values(responses);
    const maxPossible = tab === "pulse" ? 25 : tab === "phq9" ? 27 : 21;
    const total = values.reduce((a, b) => a + b, 0);
    const score = Math.round((total / maxPossible) * 100);
    setWrs(score);

    // Mark this survey as complete
    setCompletedSurveys(prev => {
      const next = new Set(prev);
      next.add(tab);
      // Check if all are now complete
      if (next.size === 3) {
        setSessionCheckInComplete(true);
        setHasCompletedRecently(true);
      }
      return next;
    });

    toast.success(`${tab === "phq9" ? "PHQ-9" : tab === "gad7" ? "GAD-7" : "Pulse Survey"} check-in recorded.`);

    // Auto-switch to next pending survey
    const remaining = pendingSurveys.filter(s => s !== tab);
    if (remaining.length > 0) {
      setTab(remaining[0]);
    }
  };

  const portalItems = useMemo(() => {
    return baseItems.map(item => ({
      ...item,
      disabled: !hasCompletedRecently,
      ...(item.label === "Check-in" && pendingSurveys.length > 0 && !hasCompletedRecently ? { badge: String(pendingSurveys.length) } : {}),
    }));
  }, [hasCompletedRecently, pendingSurveys.length]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  }, []);

  const tierColor = colorFromWrs(wrs);

  const tabLabels: Record<SurveyTab, string> = { pulse: "Pulse Survey", phq9: "PHQ-9", gad7: "GAD-7" };

  return (
    <AppShell items={portalItems}>
      <div className="flex items-center justify-between h-16 px-8 border-b border-border bg-background/60 backdrop-blur-sm sticky top-0 z-30">
        <div>
          <h1 className="font-display text-2xl font-bold">{greeting} 👋</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Last check-in: 2 days ago
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full relative">
                <Bell className="h-4 w-4" />
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuItem className="flex-col items-start py-3">
                <div className="text-sm font-medium">Session reviewed</div>
                <div className="text-xs text-muted-foreground">Your counselor Dr. Amara reviewed your last session.</div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <ThemeToggle />
        </div>
      </div>

      <CrisisBanner />
      <div className="p-6 lg:p-8 space-y-6 pt-0">
        {/* Check-in banner (All Complete State) */}
        {hasCompletedRecently && (
          <div
            className="flex items-center justify-between px-4 h-12 w-full rounded-xl animate-fade-in"
            style={{ backgroundColor: "#A8FF3E15", border: "1px solid #A8FF3E40" }}
          >
            <div className="flex items-center gap-2 text-sm font-medium">
              <Check className="h-4 w-4" style={{ color: "#A8FF3E" }} />
              Check-in complete for today 🌿
            </div>
            <div className="text-xs text-muted-foreground font-medium">
              Next check-in available tomorrow
            </div>
          </div>
        )}

        {/* Check-in component */}
        {!hasCompletedRecently && (
          <div className="surface-card surface-card-hover p-6 bg-card flex flex-col w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-3">
              <div>
                <h2 className="font-display text-xl font-bold">Daily Check-in</h2>
                <p className="text-sm text-primary/80 font-medium mt-1">
                  Checking in as: {studentName} · {pendingSurveys.length} survey{pendingSurveys.length !== 1 ? "s" : ""} pending
                </p>
              </div>
              <div className="flex gap-1 p-1 rounded-full bg-muted w-fit">
                {(["pulse", "phq9", "gad7"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={cn(
                      "px-4 py-1.5 text-xs font-semibold rounded-full transition relative",
                      tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                      completedSurveys.has(t) && "opacity-50"
                    )}
                  >
                    {tabLabels[t]}
                    {completedSurveys.has(t) && <Check className="inline h-3 w-3 ml-1" />}
                  </button>
                ))}
              </div>
            </div>

            {completedSurveys.has(tab) ? (
              <div className="flex items-center gap-2 p-4 rounded-xl bg-muted/30 text-sm text-muted-foreground">
                <Check className="h-4 w-4" style={{ color: "#A8FF3E" }} />
                {tabLabels[tab]} already submitted. Select another survey above.
              </div>
            ) : (
              tab === "phq9" ? <PHQ9Form onSubmit={handleSubmit} /> :
              tab === "gad7" ? <GAD7Form onSubmit={handleSubmit} /> :
              <PulseForm onSubmit={handleSubmit} />
            )}
          </div>
        )}

        {hasCompletedRecently && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Book appointment */}
          <div className="surface-card surface-card-hover p-5 bg-card flex flex-col">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-bold">Book an Appointment</h3>
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              <div className="text-xs text-muted-foreground mb-1">Next available</div>
              <div className="font-medium text-sm">Tomorrow · 11:00 AM · Dr. Amara Obi</div>
              <div className="flex gap-2 mt-4 mb-5">
                <Button size="sm" onClick={() => setBookingOpen(true)} className="gradient-primary text-primary-foreground border-0 flex-1">Book Now</Button>
                <Link to="/student/appointments" className="flex-1">
                  <Button size="sm" variant="outline" className="w-full">View all <ChevronRight className="h-3 w-3 ml-1" /></Button>
                </Link>
              </div>
            </div>
            <div className="pt-5 border-t border-border flex-1">
              <div className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Upcoming Sessions</div>
              <div className="space-y-3">
                <div className="flex items-start justify-between text-xs group">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium">Dr. Amara Obi</div>
                      <div className="text-muted-foreground">Tomorrow, 11:00 AM</div>
                      <div className="mt-1">
                        <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold bg-primary/10 text-primary">Virtual</span>
                      </div>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => toast.success("Appointment canceled")}>Cancel</Button>
                </div>
                <div className="flex items-start justify-between text-xs group">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium">Dr. Kelechi Eze</div>
                      <div className="text-muted-foreground">May 2, 2:00 PM</div>
                      <div className="mt-1">
                        <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold bg-muted text-foreground">In-Person</span>
                      </div>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => toast.success("Appointment canceled")}>Cancel</Button>
                </div>
              </div>
            </div>
          </div>

          {/* Recent check-ins */}
          <div className="surface-card surface-card-hover p-5 bg-card flex flex-col">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-bold">Recent Check-ins</h3>
                <Link to="/student/history" className="text-xs text-primary hover:underline">View all</Link>
              </div>
              <div className="space-y-1.5">
                {RECENT_CHECKINS.slice(0, 5).map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-xs p-2 rounded-lg hover:bg-muted/40 transition">
                    <div className="flex items-center gap-3">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: colorFromWrs(c.wrs) }} />
                      <span className="font-medium">{c.date}</span>
                      <span className="text-muted-foreground">{c.type}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="pt-4 mt-4 border-t border-border flex-1 flex flex-col">
              <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Your recent trend</div>
              <div className="flex-1 mt-2">
                <ResponsiveContainer width="100%" height={80}>
                  <LineChart data={[...RECENT_CHECKINS].reverse()}>
                    <Line type="monotone" dataKey="wrs" stroke="#A8FF3E" strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Counselor */}
          <div className="surface-card surface-card-hover p-5 bg-card flex flex-col">
            <div>
              <div className="label-eyebrow mb-3">Your Counselor</div>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full gradient-primary text-primary-foreground flex items-center justify-center font-semibold">AO</div>
                <div>
                  <div className="font-semibold">Dr. Amara Obi</div>
                  <div className="text-xs text-muted-foreground">Senior Wellness Counselor</div>
                </div>
              </div>
              <div className="flex gap-2 mt-4 mb-5">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => toast.success("Message sent to Dr. Amara")}>
                  <MessageSquare className="h-3.5 w-3.5 mr-1.5" /> Message
                </Button>
                <Button size="sm" onClick={() => setBookingOpen(true)} className="gradient-primary text-primary-foreground border-0 flex-1">Book</Button>
              </div>
            </div>
            <div className="pt-4 border-t border-border flex-1 flex flex-col">
              <div className="text-xs text-muted-foreground">Next available slot</div>
              <div className="font-bold text-sm mb-3">Tomorrow · 11:00 AM</div>
              <div className="text-xs text-muted-foreground leading-relaxed mb-4">
                Specializes in academic stress, anxiety, and student transitions. 8 years experience in university wellness.
              </div>
              <div className="flex items-center gap-2 mt-auto">
                <span className="h-2 w-2 rounded-full bg-[#A8FF3E] animate-pulse"></span>
                <span className="text-xs font-medium">Available this week</span>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>

      <BookingModal open={bookingOpen} onOpenChange={setBookingOpen} />
      <HotlineModal open={hotlineOpen} onOpenChange={setHotlineOpen} />
    </AppShell>
  );
}
