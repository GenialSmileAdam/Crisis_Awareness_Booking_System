import { useMemo, useState } from "react";
import { Calendar as CalendarIcon, Check, ChevronLeft, ChevronRight, Clock, Eye, Home, History, LifeBuoy, MessageSquare, RotateCcw, Sparkles, Video, MapPin } from "lucide-react";
import { AppShell, SidebarItem } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { CrisisBanner } from "@/components/CrisisBanner";

import { studentSidebarItems } from "@/data/sidebar";

const COUNSELORS = [
  { id: "c1", name: "Dr. Amara Obi", title: "Lead Counselor", specialty: "Anxiety & Stress" },
  { id: "c2", name: "Dr. Kelechi Eze", title: "Senior Counselor", specialty: "Depression Care" },
  { id: "c3", name: "Dr. Bola Adewale", title: "Wellness Counselor", specialty: "Academic Pressure" },
];

const TIMES = ["9:00 AM", "11:00 AM", "2:00 PM", "4:00 PM"];

const UPCOMING_INIT = [
  { id: "u1", counselor: COUNSELORS[0], date: "Apr 28, 2026", time: "11:00 AM", type: "Virtual", status: "Confirmed" },
  { id: "u2", counselor: COUNSELORS[1], date: "May 03, 2026", time: "2:00 PM", type: "In-Person", status: "Pending" },
  { id: "u3", counselor: COUNSELORS[2], date: "May 10, 2026", time: "9:00 AM", type: "Virtual", status: "Confirmed" },
];

const PAST = Array.from({ length: 8 }).map((_, i) => ({
  id: `p${i}`,
  date: `Mar ${28 - i * 3}, 2026`,
  counselor: COUNSELORS[i % COUNSELORS.length].name,
  type: i % 2 ? "Virtual" : "In-Person",
  notes: "Discussed exam stress and developed coping strategies. Student showed improved mood at end of session.",
}));

function buildMonth(year: number, month: number) {
  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function StudentAppointments() {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [counselorId, setCounselorId] = useState<string | null>(null);
  const [date, setDate] = useState<number | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [mode, setMode] = useState<"In-Person" | "Virtual">("Virtual");
  const [notes, setNotes] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [pastOpen, setPastOpen] = useState(false);
  const [viewing, setViewing] = useState<typeof PAST[number] | null>(null);
  const [upcoming, setUpcoming] = useState(UPCOMING_INIT);

  const cells = useMemo(() => buildMonth(viewYear, viewMonth), [viewYear, viewMonth]);
  const monthName = new Date(viewYear, viewMonth).toLocaleString("default", { month: "long", year: "numeric" });

  const step = confirmed ? 4 : !counselorId ? 1 : !(date && time) ? 2 : 3;
  const selectedCounselor = COUNSELORS.find((c) => c.id === counselorId);

  const reset = () => {
    setCounselorId(null);
    setDate(null);
    setTime(null);
    setNotes("");
    setMode("Virtual");
    setConfirmed(false);
  };

  const confirm = () => {
    setConfirmed(true);
    toast.success("Appointment confirmed!");
  };

  const scrollToBooking = () => {
    document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <AppShell items={studentSidebarItems}>
      {/* Top bar */}
      <div className="flex items-center justify-between h-16 px-8 border-b border-border">
        <div>
          <div className="font-display font-bold text-xl">My Appointments</div>
          <div className="text-xs text-muted-foreground">Book and manage your wellness sessions</div>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={scrollToBooking} className="gradient-primary text-primary-foreground border-0">
            <Sparkles className="h-4 w-4 mr-2" /> Book New Session
          </Button>
          <ThemeToggle />
        </div>
      </div>

      <CrisisBanner />
      <div className="p-8 space-y-8 pt-6">
        {/* Booking flow */}
        <section id="booking" className="surface-card p-6 space-y-6">
          {/* Step indicator */}
          <div className="flex items-center gap-3">
            {[1, 2, 3].map((n, i) => (
              <div key={n} className="flex items-center flex-1">
                <div
                  className={cn(
                    "h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold transition",
                    step >= n ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}
                >
                  {step > n ? <Check className="h-4 w-4" /> : n}
                </div>
                <div className="ml-3 text-sm font-medium">
                  {n === 1 ? "Counselor" : n === 2 ? "Date & Time" : "Confirm"}
                </div>
                {i < 2 && (
                  <div className="flex-1 mx-3 h-0.5 bg-muted relative overflow-hidden rounded-full">
                    <div
                      className="absolute inset-y-0 left-0 bg-primary transition-all duration-500"
                      style={{ width: step > n ? "100%" : "0%" }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Step 1 - Counselor selection */}
          <div>
            <div className="label-eyebrow mb-3">Step 1 — Select your counselor</div>
            <div className="grid md:grid-cols-3 gap-4">
              {COUNSELORS.map((c) => {
                const active = counselorId === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setCounselorId(c.id)}
                    className={cn(
                      "text-left p-5 rounded-2xl border transition-all",
                      active
                        ? "border-primary bg-primary/5 shadow-[0_0_0_1px_hsl(var(--primary))]"
                        : "border-border bg-card hover:border-primary/40"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold">
                        {c.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                      </div>
                      <div>
                        <div className="font-semibold">{c.name}</div>
                        <div className="text-xs text-muted-foreground">{c.title}</div>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs">{c.specialty}</span>
                      <span className="px-2 py-0.5 rounded-full bg-success/15 text-xs" style={{ color: "hsl(var(--success))" }}>
                        Available today
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2 - Date & time */}
          {counselorId && (
            <div className="animate-fade-in-up">
              <div className="label-eyebrow mb-3">Step 2 — Pick a date & time</div>
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Calendar */}
                <div className="rounded-2xl border border-border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <button
                      onClick={() => {
                        const d = new Date(viewYear, viewMonth - 1);
                        setViewMonth(d.getMonth());
                        setViewYear(d.getFullYear());
                      }}
                      className="p-1 rounded-md hover:bg-muted"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <div className="font-semibold text-sm">{monthName}</div>
                    <button
                      onClick={() => {
                        const d = new Date(viewYear, viewMonth + 1);
                        setViewMonth(d.getMonth());
                        setViewYear(d.getFullYear());
                      }}
                      className="p-1 rounded-md hover:bg-muted"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground mb-1">
                    {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => <div key={d}>{d}</div>)}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {cells.map((d, i) => {
                      if (d === null) return <div key={i} />;
                      const isPast = new Date(viewYear, viewMonth, d) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
                      const active = date === d;
                      return (
                        <button
                          key={i}
                          disabled={isPast}
                          onClick={() => setDate(d)}
                          className={cn(
                            "h-9 rounded-lg text-sm font-medium transition",
                            isPast && "text-muted-foreground/40 cursor-not-allowed",
                            !isPast && !active && "hover:bg-primary/10",
                            active && "bg-primary text-primary-foreground"
                          )}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time slots */}
                <div className="rounded-2xl border border-border p-4">
                  <div className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Available times
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {TIMES.map((t) => (
                      <button
                        key={t}
                        onClick={() => setTime(t)}
                        className={cn(
                          "px-3 py-3 rounded-xl border text-sm font-medium transition",
                          time === t
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border hover:border-primary/40"
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  {date && time && (
                    <div className="mt-4 text-xs text-muted-foreground">
                      Selected: {monthName.split(" ")[0]} {date} · {time}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 3 - Confirm */}
          {counselorId && date && time && (
            <div className="animate-fade-in-up">
              <div className="label-eyebrow mb-3">Step 3 — Review & confirm</div>
              {confirmed ? (
                <div className="rounded-2xl border border-primary/30 bg-primary/5 p-8 text-center space-y-3">
                  <div className="mx-auto h-14 w-14 rounded-full bg-success flex items-center justify-center">
                    <Check className="h-7 w-7" style={{ color: "hsl(var(--success-foreground))" }} />
                  </div>
                  <div className="font-display font-bold text-xl">Appointment confirmed!</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedCounselor?.name} · {monthName.split(" ")[0]} {date} · {time} · {mode}
                  </div>
                  <Button variant="outline" onClick={reset}>
                    <RotateCcw className="h-4 w-4 mr-2" /> Start Over
                  </Button>
                </div>
              ) : (
                <div className="grid lg:grid-cols-2 gap-6">
                  <div className="rounded-2xl border border-border p-5 space-y-3">
                    <div className="text-sm font-semibold">Summary</div>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                        {selectedCounselor?.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{selectedCounselor?.name}</div>
                        <div className="text-xs text-muted-foreground">{selectedCounselor?.title}</div>
                      </div>
                    </div>
                    <div className="text-sm flex items-center gap-2 text-muted-foreground">
                      <CalendarIcon className="h-4 w-4" /> {monthName.split(" ")[0]} {date} at {time}
                    </div>
                    <div className="flex gap-2 pt-2">
                      {(["In-Person", "Virtual"] as const).map((m) => (
                        <button
                          key={m}
                          onClick={() => setMode(m)}
                          className={cn(
                            "flex-1 px-3 py-2 rounded-xl border text-sm font-medium flex items-center justify-center gap-2 transition",
                            mode === m ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40"
                          )}
                        >
                          {m === "Virtual" ? <Video className="h-4 w-4" /> : <MapPin className="h-4 w-4" />} {m}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border p-5 space-y-3">
                    <div className="text-sm font-semibold">Notes (optional)</div>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={5}
                      placeholder="Anything you'd like your counselor to know..."
                    />
                    <Button onClick={confirm} className="w-full gradient-primary text-primary-foreground border-0 h-11">
                      Confirm Appointment
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Upcoming */}
        <section className="space-y-3">
          <div className="label-eyebrow">Upcoming appointments</div>
          <div className="grid md:grid-cols-3 gap-4">
            {upcoming.map((a) => (
              <div key={a.id} className="surface-card surface-card-hover p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                    {a.counselor.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{a.counselor.name}</div>
                    <div className="text-xs text-muted-foreground">{a.counselor.title}</div>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" /> {a.date} · {a.time}
                </div>
                <div className="flex gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs">{a.type}</span>
                  <span
                    className="px-2 py-0.5 rounded-full text-xs"
                    style={{
                      backgroundColor: a.status === "Confirmed" ? "hsl(var(--success) / 0.15)" : "hsl(var(--warning) / 0.15)",
                      color: a.status === "Confirmed" ? "hsl(var(--success))" : "hsl(var(--warning))",
                    }}
                  >
                    {a.status}
                  </span>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => toast.success(`Reschedule request sent for ${a.date}`)}
                  >
                    Reschedule
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      setUpcoming((prev) => prev.filter((x) => x.id !== a.id));
                      toast.success("Appointment cancelled");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Past */}
        <section className="surface-card p-6">
          <button
            onClick={() => setPastOpen((o) => !o)}
            className="w-full flex items-center justify-between"
          >
            <div className="font-semibold flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              Past Sessions ({PAST.length})
            </div>
            <ChevronRight className={cn("h-4 w-4 transition", pastOpen && "rotate-90")} />
          </button>
          {pastOpen && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground uppercase tracking-wider">
                  <tr className="border-b border-border">
                    <th className="text-left py-2">Date</th>
                    <th className="text-left py-2">Counselor</th>
                    <th className="text-left py-2">Type</th>
                    <th className="text-right py-2">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {PAST.map((p) => (
                    <tr key={p.id} className="border-b border-border/60 hover:bg-muted/30">
                      <td className="py-3">{p.date}</td>
                      <td className="py-3">{p.counselor}</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs">{p.type}</span>
                      </td>
                      <td className="py-3 text-right">
                        <Button size="sm" variant="ghost" onClick={() => setViewing(p)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Session notes — {viewing?.date}</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">
            <div className="mb-2"><span className="font-medium text-foreground">Counselor:</span> {viewing?.counselor}</div>
            <div className="mb-2"><span className="font-medium text-foreground">Type:</span> {viewing?.type}</div>
            <p className="mt-3 leading-relaxed">{viewing?.notes}</p>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
