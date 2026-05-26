import { useMemo, useState, useEffect } from "react";
import { Bell, Home, ClipboardList, History, BookOpen, Calendar, MessageSquare, ChevronRight, Check, AlertTriangle, LogOut } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
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
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { CrisisBanner, BookingModal, HotlineModal } from "@/components/CrisisBanner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
type SurveyTab = "pulse" | "phq9" | "gad7";
import { PendingCheckin, getPendingCheckins, submitCheckin, getStudentCheckins, CheckinRecord } from "@/api/checkins";
import { listAppointments, getNextAvailableSlot, NextAvailableSlot, Appointment } from "@/api/appointments";
import { studentSidebarItems } from "@/data/sidebar";
import { OnboardingSlides } from "@/components/OnboardingSlides";

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
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
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
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
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
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const studentName = user?.name || "Student";
  const firstName = user?.name?.split(" ")[0] || "";
  const studentId = user?.student_id;
  
  const isCheckinView = location.pathname === "/student/checkin";

  // API State
  const [pendingSurveys, setPendingSurveys] = useState<PendingCheckin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState<SurveyTab>("pulse");
  const [hasCompletedRecently, setHasCompletedRecently] = useState(false);
  const [isTriggered, setIsTriggered] = useState(false);
  const [pendingLoadError, setPendingLoadError] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const pending = await getPendingCheckins();
        setPendingSurveys(pending);
        if (pending.length > 0) setTab(pending[0].type as SurveyTab);
        else setHasCompletedRecently(true);
      } catch {
        setPendingLoadError(true);
      } finally {
        setIsLoading(false);
      }
    };

    checkStatus();
  }, [studentId, navigate]);

  const [bookingOpen, setBookingOpen] = useState(false);
  const [hotlineOpen, setHotlineOpen] = useState(false);
  const tier = tierFromWrs(wrs);

  // Real data for home cards
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [recentCheckins, setRecentCheckins] = useState<CheckinRecord[]>([]);
  const [nextSlot, setNextSlot] = useState<NextAvailableSlot | null>(null);
  const [homeLoading, setHomeLoading] = useState(true);

  useEffect(() => {
    const fetchHomeData = async () => {
      if (!studentId) return;
      try {
        const [apptData, checkinData, slotData] = await Promise.allSettled([
          listAppointments(10, 0),
          getStudentCheckins(studentId, 5, 0),
          getNextAvailableSlot(),
        ]);
        if (apptData.status === "fulfilled") {
          const upcoming = (apptData.value.data || []).filter(
            (a) => a.status === "booked" && new Date(a.start_time) > new Date()
          );
          setUpcomingAppointments(upcoming);
        }
        if (checkinData.status === "fulfilled") setRecentCheckins(checkinData.value.data || []);
        if (slotData.status === "fulfilled") setNextSlot(slotData.value);
      } catch {
        // non-fatal
      } finally {
        setHomeLoading(false);
      }
    };
    fetchHomeData();
  }, [studentId]);

  const handleSubmit = async (responses: Record<string, number>) => {
    if (!studentId) return;
    const score = tab === "phq9" || tab === "gad7"
      ? Object.values(responses).reduce((a, b) => a + b, 0)
      : null;
    try {
      const result = await submitCheckin({ student_id: studentId, type: tab, responses, score });
      if (result.crisis_escalation_required) {
        toast.error("A counselor has been alerted. Please reach out if you need immediate support.", { duration: 8000 });
      } else {
        toast.success("Check-in recorded. Thank you.");
      }
      if (score !== null) {
        const newWrs = Math.round((score / 27) * 100);
        setWrs(newWrs);
      }
    } catch {
      toast.error("Failed to submit check-in. Please try again.");
      return;
    }
    const pending = pendingSurveys.filter(p => p.type !== tab);
    setPendingSurveys(pending);
    if (pending.length > 0) {
      setTab(pending[0].type as SurveyTab);
    } else {
      setHasCompletedRecently(true);
      if (location.pathname === "/student/checkin") {
        navigate("/student");
      }
    }
  };

  const portalItems = useMemo(() => {
    return studentSidebarItems.map(item => ({
      ...item,
      disabled: false,
      ...(item.label === "Check-in" && (pendingSurveys.length > 0 || isTriggered) && !hasCompletedRecently ? { badge: "!" } : {}),
    }));
  }, [hasCompletedRecently, pendingSurveys.length, isTriggered]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  }, []);

  const tabLabels: Record<SurveyTab, string> = { pulse: "Pulse Survey", phq9: "PHQ-9", gad7: "GAD-7" };

  return (
    <>
      <OnboardingSlides />
      <AppShell items={portalItems}>
      <div className="flex items-start md:items-center justify-between py-4 md:h-16 px-4 md:px-8 border-b border-border bg-background md:bg-background/60 md:backdrop-blur-sm sticky top-0 z-30">
        <div className="flex-1">
          <h1 className="font-display text-xl md:text-2xl font-bold">
            {greeting}{firstName ? `, ${firstName}` : ""} 👋
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            You're all caught up for today
          </p>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
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
          <Button variant="ghost" size="icon" onClick={() => { localStorage.removeItem("checkin_gate_passed"); logout(); navigate("/login"); }} className="md:hidden rounded-full h-9 w-9">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <CrisisBanner />
      <div className="p-4 md:p-8 space-y-6 pt-0 md:pt-0">
        {/* Triggered Check-in Modal */}
        <Dialog open={false}>
          <DialogContent className="sm:max-w-[500px] [&>button]:hidden">
            <div className="flex flex-col items-center text-center space-y-4 py-4">
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <h2 className="font-display text-xl font-bold">Required Check-in</h2>
              <p className="text-sm text-muted-foreground">
                We noticed you recently accessed crisis resources. Please complete this quick pulse survey to help us understand how you're feeling right now.
              </p>
              <div className="w-full text-left bg-muted/30 p-4 rounded-xl border border-border mt-4">
                <PulseForm onSubmit={handleSubmit} />
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Check-in banner (All Complete State) */}
        {hasCompletedRecently && !isCheckinView && (
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
        {(isCheckinView || !hasCompletedRecently) && (
          <div className="surface-card surface-card-hover p-6 bg-card flex flex-col w-full animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-3">
              <div>
                <h2 className="font-display text-xl font-bold">Daily Check-in</h2>
                <p className="text-sm text-primary/80 font-medium mt-1">
                  Checking in as: {studentName} · {pendingSurveys.length} survey{pendingSurveys.length !== 1 ? "s" : ""} pending
                </p>
              </div>
              <div className="flex gap-1 p-1 rounded-full bg-muted w-fit">
                {(["pulse", "phq9", "gad7"] as const).map((t) => {
                  const isPending = pendingSurveys.some(p => p.type === t);
                  return (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={cn(
                        "px-4 py-1.5 text-xs font-semibold rounded-full transition relative",
                        tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                        !isPending && "opacity-50"
                      )}
                    >
                      {tabLabels[t]}
                      {!isPending && <Check className="inline h-3 w-3 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {!pendingSurveys.some(p => p.type === tab) ? (
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

        {pendingLoadError && (
          <div className="mt-3 p-3 rounded-md bg-yellow-50 border border-yellow-100 text-sm text-muted-foreground">
            Unable to load pending check-ins. You can still complete your check-in below.
          </div>
        )}

        {isLoading && !hasCompletedRecently && (
          <div className="flex flex-col items-center justify-center p-12 space-y-4">
            <div className="h-8 w-8 rounded-full border-2 border-muted border-t-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Loading your check-ins...</p>
          </div>
        )}

        {!isCheckinView && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Book appointment */}
          <div className="surface-card surface-card-hover p-5 bg-card flex flex-col">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-bold">Book an Appointment</h3>
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              {homeLoading ? (
                <div className="h-4 bg-muted rounded animate-pulse mb-1" />
              ) : nextSlot ? (
                <>
                  <div className="text-xs text-muted-foreground mb-1">Next available</div>
                  <div className="font-medium text-sm">
                    {new Date(nextSlot.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    {" · "}
                    {new Date(nextSlot.slot.split(" / ")[0]).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </div>
                </>
              ) : (
                <div className="text-xs text-muted-foreground mb-1">No slots available in the next 2 weeks</div>
              )}
              <div className="flex gap-2 mt-4 mb-5">
                <Link to="/student/appointments" className="flex-1">
                  <Button size="sm" className="gradient-primary text-primary-foreground border-0 w-full">Book Now</Button>
                </Link>
                <Link to="/student/appointments" className="flex-1">
                  <Button size="sm" variant="outline" className="w-full">View all <ChevronRight className="h-3 w-3 ml-1" /></Button>
                </Link>
              </div>
            </div>
            <div className="pt-5 border-t border-border flex-1">
              <div className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Upcoming Sessions</div>
              {homeLoading ? (
                <div className="space-y-2">
                  {[1, 2].map(i => <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />)}
                </div>
              ) : upcomingAppointments.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-4">No upcoming sessions</div>
              ) : (
                <div className="space-y-3">
                  {upcomingAppointments.slice(0, 3).map((a) => {
                    const initials = (a.psychologist_full_name || "?").split(" ").map(p => p[0]).slice(0, 2).join("");
                    return (
                      <div key={a.id} className="flex items-start justify-between text-xs group">
                        <div className="flex items-start gap-3">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-[10px]">
                            {initials}
                          </div>
                          <div>
                            <div className="font-medium">{a.psychologist_full_name || "Counselor"}</div>
                            <div className="text-muted-foreground">
                              {new Date(a.start_time).toLocaleDateString("en-US", { month: "short", day: "numeric" })},{" "}
                              {new Date(a.start_time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                            </div>
                            <div className="mt-1">
                              <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold bg-primary/10 text-primary capitalize">
                                {a.booking_source?.replace("_", " ") || "session"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="surface-card surface-card-hover p-5 bg-card flex flex-col">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-bold">Recent Check-ins</h3>
                <Link to="/student/history" className="text-xs text-primary hover:underline">View all</Link>
              </div>
              {homeLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <div key={i} className="h-8 bg-muted rounded animate-pulse" />)}
                </div>
              ) : recentCheckins.length === 0 ? (
                <div className="py-4 flex flex-col items-center justify-center text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">No recent data</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Complete a check-in to see history</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentCheckins.slice(0, 4).map((c) => {
                    const typeLabel = c.type === "phq9" ? "PHQ-9" : c.type === "gad7" ? "GAD-7" : "Pulse";
                    const wrs = (c.type === "phq9" || c.type === "gad7") && c.score !== null
                      ? Math.round((c.score / 27) * 100) : null;
                    const color = wrs !== null ? colorFromWrs(wrs) : "#6B7280";
                    return (
                      <div key={c.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border/50 last:border-0">
                        <div>
                          <span className="font-medium">{typeLabel}</span>
                          <span className="text-muted-foreground ml-2">
                            {new Date(c.submitted_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        </div>
                        {wrs !== null && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold" style={{ backgroundColor: `${color}25`, color }}>
                            {wrs}/100
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="pt-4 mt-auto border-t border-border flex flex-col">
              <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Your recent trend</div>
              {recentCheckins.length >= 2 ? (
                <ResponsiveContainer width="100%" height={60}>
                  <LineChart data={recentCheckins.slice().reverse().map(c => ({
                    wrs: (c.type === "phq9" || c.type === "gad7") && c.score !== null ? Math.round((c.score / 27) * 100) : null
                  })).filter(d => d.wrs !== null)}>
                    <Line type="monotone" dataKey="wrs" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-16 flex items-center justify-center bg-muted/20 rounded-lg border border-dashed border-border">
                  <span className="text-[10px] text-muted-foreground/40 font-medium">Complete more check-ins for trend</span>
                </div>
              )}
            </div>
          </div>

          {/* Counselor */}
          <div className="surface-card surface-card-hover p-5 bg-card flex flex-col">
            <div>
              <div className="label-eyebrow mb-3">Your Counselor</div>
              {homeLoading ? (
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 rounded-full bg-muted animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-muted rounded animate-pulse" />
                    <div className="h-2.5 bg-muted rounded w-2/3 animate-pulse" />
                  </div>
                </div>
              ) : upcomingAppointments.length > 0 ? (
                <>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full gradient-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
                      {(upcomingAppointments[0].psychologist_full_name || "?").split(" ").map(p => p[0]).slice(0, 2).join("")}
                    </div>
                    <div>
                      <div className="font-semibold">{upcomingAppointments[0].psychologist_full_name}</div>
                      <div className="text-xs text-muted-foreground">Counselor</div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4 mb-5">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => toast.success("Message feature coming soon")}>
                      <MessageSquare className="h-3.5 w-3.5 mr-1.5" /> Message
                    </Button>
                    <Link to="/student/appointments" className="flex-1">
                      <Button size="sm" className="gradient-primary text-primary-foreground border-0 w-full">Book</Button>
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-muted/40 text-muted-foreground flex items-center justify-center">
                      <MessageSquare className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm">No counselor assigned</div>
                      <div className="text-xs text-muted-foreground">Book a session to get started</div>
                    </div>
                  </div>
                  <div className="mt-4 mb-5">
                    <Link to="/student/appointments">
                      <Button size="sm" className="gradient-primary text-primary-foreground border-0 w-full">Find a Counselor</Button>
                    </Link>
                  </div>
                </>
              )}
            </div>
            <div className="pt-4 border-t border-border flex-1 flex flex-col">
              {nextSlot && (
                <>
                  <div className="text-xs text-muted-foreground">Next available slot</div>
                  <div className="font-bold text-sm mb-3">
                    {new Date(nextSlot.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    {" · "}
                    {new Date(nextSlot.slot.split(" / ")[0]).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </div>
                </>
              )}
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
    </>
  );
}
