import { useStudentAppointments, usePsychologists, useAppointmentAvailability } from "@/hooks/queries";
import { useBookAppointment } from "@/hooks/mutations";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar as CalendarIcon, Check, ChevronLeft, ChevronRight, Clock, MessageSquare, RotateCcw, Sparkles, Video, MapPin, LogOut, Pencil } from "lucide-react";
import { NeonSpinner } from "@/components/NeonSpinner";
import { AppShell } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { CrisisBanner } from "@/components/CrisisBanner";
import { studentSidebarItems } from "@/data/sidebar";

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
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const studentId = user?.student_id;
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());

  const appointmentsQuery = useStudentAppointments(studentId, 50, 0);
  const psychologistsQuery = usePsychologists();
  const availabilityQuery = useAppointmentAvailability(
    selectedPsychologist?.user_id,
    selectedDate
  );
  const bookMutation = useBookAppointment();

  const [selectedPsychologist, setSelectedPsychologist] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [step, setStep] = useState(1);

  const [mode, setMode] = useState<"In-Person" | "Virtual">("Virtual");
  const [notes, setNotes] = useState("");
  const [pastOpen, setPastOpen] = useState(false);
  const [viewing, setViewing] = useState<any>(null);

  const step2Ref = useRef<HTMLDivElement>(null);
  const step3Ref = useRef<HTMLDivElement>(null);
  const bookingRef = useRef<HTMLElement>(null);

  // Handle psychologist errors
  useEffect(() => {
    if (psychologistsQuery.error) {
      toast.error("Failed to load counselors. Please retry.");
    }
  }, [psychologistsQuery.error]);

  const myAppointments = appointmentsQuery.data?.data || [];
  const psychologists = psychologistsQuery.data || [];
  const availableSlots = availabilityQuery.data || [];
  const appointmentsLoading = appointmentsQuery.isPending;
  const psychologistsLoading = psychologistsQuery.isPending;
  const slotsLoading = availabilityQuery.isPending;
  const loading = bookMutation.isPending;

  // Auto-scroll to the active step when it advances
  useEffect(() => {
    if (step === 2 && step2Ref.current) {
      setTimeout(() => {
        step2Ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    } else if (step === 3 && step3Ref.current) {
      setTimeout(() => {
        step3Ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
  }, [step]);

  const cells = useMemo(() => buildMonth(viewYear, viewMonth), [viewYear, viewMonth]);
  const monthName = new Date(viewYear, viewMonth).toLocaleString("default", { month: "long", year: "numeric" });

  const reset = () => {
    setSelectedPsychologist(null);
    setSelectedDate(null);
    setSelectedSlot(null);
    setAvailableSlots([]);
    setNotes("");
    setMode("Virtual");
    setBookingSuccess(false);
    setStep(1);
    setTimeout(() => {
      bookingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const selectCounselor = (p: any) => {
    setSelectedPsychologist(p);
    setSelectedDate(null);
    setSelectedSlot(null);
    setAvailableSlots([]);
    setStep(2);
  };

  const handleDayClick = (dateStr: string) => {
    setSelectedDate(dateStr);
    setSelectedSlot(null);
  };

  useEffect(() => {
    if (availabilityQuery.error) {
      toast.error("Failed to load availability for this date");
    }
  }, [availabilityQuery.error]);

  const selectSlot = (slot: string) => {
    setSelectedSlot(slot);
    setStep(3);
  };

  const confirmBooking = () => {
    if (!selectedSlot || !selectedPsychologist) return;
    const [start, end] = selectedSlot.split(" / ");
    bookMutation.mutate(
      {
        psychologist_id: selectedPsychologist.user_id,
        start_time: start,
        end_time: end,
        notes: notes || undefined,
      },
      {
        onSuccess: (response) => {
          setBookingSuccess(true);
          toast.success("Appointment requested! Awaiting counselor confirmation.");
        },
        onError: () => {
          toast.error("Failed to book appointment. Please try again.");
        },
      }
    );
  };

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const fmtTime = (d: string) =>
    new Date(d).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  return (
    <AppShell items={studentSidebarItems}>
      {/* Top bar */}
      <div className="flex items-start md:items-center justify-between py-4 md:h-16 px-4 md:px-8 border-b border-border bg-background md:bg-background/60 md:backdrop-blur-sm sticky top-0 z-30">
        <div className="flex-1">
          <div className="font-display font-bold text-xl md:text-2xl">My Appointments</div>
          <div className="text-xs text-muted-foreground mt-0.5">Book and manage your wellness sessions</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={() => bookingRef.current?.scrollIntoView({ behavior: "smooth" })}
            size="sm"
            className="hidden md:flex gradient-primary text-primary-foreground border-0"
          >
            <Sparkles className="h-4 w-4 mr-2" /> Book Session
          </Button>
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={() => { logout(); navigate("/login"); }} className="md:hidden rounded-full h-9 w-9">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <CrisisBanner />
      <div className="p-4 md:p-8 space-y-8 pt-4 md:pt-6">

        {/* ── Booking wizard ── */}
        <section ref={bookingRef} id="booking" className="surface-card p-6 space-y-6">
          {/* Step indicator */}
          <div className="flex items-center gap-3">
            {[1, 2, 3].map((n, i) => (
              <div key={n} className="flex items-center flex-1">
                <div className={cn(
                  "h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold transition shrink-0",
                  step > n ? "bg-[#A8FF3E] text-black" : step === n ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                  {step > n ? <Check className="h-4 w-4" /> : n}
                </div>
                <div className="ml-2 text-sm font-medium hidden md:block text-muted-foreground">
                  {n === 1 ? "Counselor" : n === 2 ? "Date & Time" : "Confirm"}
                </div>
                {i < 2 && (
                  <div className="flex-1 mx-3 h-0.5 bg-muted relative overflow-hidden rounded-full">
                    <div className="absolute inset-y-0 left-0 bg-[#A8FF3E] transition-all duration-500" style={{ width: step > n ? "100%" : "0%" }} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ── Step 1: Counselor selection ── */}
          {bookingSuccess ? (
            <div className="rounded-2xl border border-[#A8FF3E]/40 bg-[#A8FF3E]/5 p-8 text-center space-y-3">
              <div className="mx-auto h-14 w-14 rounded-full bg-[#A8FF3E] flex items-center justify-center">
                <Check className="h-7 w-7 text-black" />
              </div>
              <div className="font-display font-bold text-xl">Request sent!</div>
              <div className="text-sm text-muted-foreground">
                {selectedPsychologist?.full_name} · {selectedDate && fmtDate(selectedDate)} · {selectedSlot && fmtTime(selectedSlot.split(" / ")[0])} · {mode}
              </div>
              <p className="text-xs text-muted-foreground">Your counselor will confirm shortly.</p>
              <Button variant="outline" onClick={reset} className="mt-2">
                <RotateCcw className="h-4 w-4 mr-2" /> Book Another
              </Button>
            </div>
          ) : (
            <>
              {/* Step 1 body / summary */}
              {step === 1 ? (
                <div>
                  <div className="label-eyebrow mb-3">Step 1 — Select your counselor</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {psychologistsLoading ? (
                      <div className="md:col-span-3 flex items-center justify-center gap-3 py-10 text-muted-foreground text-sm">
                        <NeonSpinner size={20} /> Loading counselors…
                      </div>
                    ) : psychologistLoadError ? (
                      <div className="md:col-span-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center">
                        <div className="font-semibold text-sm text-destructive mb-3">Unable to load counselors.</div>
                        <Button variant="outline" onClick={async () => {
                          setPsychologistLoadError(false);
                          setPsychologistsLoading(true);
                          try { setPsychologists(await listPsychologists()); }
                          catch { setPsychologistLoadError(true); toast.error("Still failing — please refresh."); }
                          finally { setPsychologistsLoading(false); }
                        }}>Retry</Button>
                      </div>
                    ) : (
                      psychologists.map((p) => (
                        <button
                          key={p.user_id}
                          onClick={() => selectCounselor(p)}
                          className="text-left p-5 rounded-2xl border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold shrink-0">
                              {p.full_name.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
                            </div>
                            <div className="overflow-hidden">
                              <div className="font-semibold truncate">{p.full_name}</div>
                              <div className="text-xs text-muted-foreground truncate capitalize">{p.staff_type}</div>
                            </div>
                          </div>
                          <div className="mt-4 flex items-center gap-2 flex-wrap">
                            {p.specialization && (
                              <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-[10px] font-medium uppercase tracking-wider">
                                {p.specialization}
                              </span>
                            )}
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider",
                              p.is_available_now
                                ? "bg-[#A8FF3E]/15 text-[#5a8c00]"
                                : "bg-muted text-muted-foreground"
                            )}>
                              {p.is_available_now ? "Available now" : "Away"}
                            </span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                // Compact step 1 summary
                <div className="flex items-center justify-between rounded-2xl border border-[#A8FF3E]/30 bg-[#A8FF3E]/5 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
                      {selectedPsychologist?.full_name.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Counselor</div>
                      <div className="font-semibold text-sm">{selectedPsychologist?.full_name}</div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { setStep(1); setSelectedDate(null); setSelectedSlot(null); setAvailableSlots([]); }} className="text-xs gap-1.5">
                    <Pencil className="h-3 w-3" /> Change
                  </Button>
                </div>
              )}

              {/* ── Step 2: Date & time ── */}
              {selectedPsychologist && (
                <div ref={step2Ref}>
                  {step === 2 ? (
                    <>
                      <div className="label-eyebrow mb-3">Step 2 — Pick a date & time</div>
                      <div className="grid lg:grid-cols-2 gap-6">
                        {/* Calendar */}
                        <div className="rounded-2xl border border-border p-4">
                          <div className="flex items-center justify-between mb-3">
                            <button onClick={() => { const d = new Date(viewYear, viewMonth - 1); setViewMonth(d.getMonth()); setViewYear(d.getFullYear()); }} className="p-1 rounded-md hover:bg-muted">
                              <ChevronLeft className="h-4 w-4" />
                            </button>
                            <div className="font-semibold text-sm">{monthName}</div>
                            <button onClick={() => { const d = new Date(viewYear, viewMonth + 1); setViewMonth(d.getMonth()); setViewYear(d.getFullYear()); }} className="p-1 rounded-md hover:bg-muted">
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground mb-1">
                            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => <div key={d}>{d}</div>)}
                          </div>
                          <div className="grid grid-cols-7 gap-1">
                            {cells.map((d, i) => {
                              if (d === null) return <div key={i} />;
                              const dateObj = new Date(viewYear, viewMonth, d);
                              const isPast = dateObj < new Date(today.getFullYear(), today.getMonth(), today.getDate());
                              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                              const active = selectedDate === dateStr;
                              return (
                                <button
                                  key={i}
                                  disabled={isPast}
                                  onClick={() => handleDayClick(dateStr)}
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
                        <div className="rounded-2xl border border-border p-4 min-h-[200px] flex flex-col">
                          <div className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <Clock className="h-4 w-4" /> Available times
                          </div>
                          {slotsLoading ? (
                            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                              <NeonSpinner size={28} />
                              <div className="text-xs">Loading slots…</div>
                            </div>
                          ) : !selectedDate ? (
                            <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs italic">
                              Select a date to see available times
                            </div>
                          ) : availableSlots.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-xs gap-1">
                              <CalendarIcon className="h-6 w-6 opacity-30" />
                              No available slots — try another date
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {availableSlots.map((slot) => {
                                const [start, end] = slot.split(" / ");
                                const active = selectedSlot === slot;
                                return (
                                  <button
                                    key={slot}
                                    onClick={() => selectSlot(slot)}
                                    className={cn(
                                      "px-3 py-3 rounded-xl border text-xs font-medium transition",
                                      active
                                        ? "border-[#A8FF3E] bg-[#A8FF3E]/10 text-foreground"
                                        : "border-border hover:border-primary/40"
                                    )}
                                  >
                                    {fmtTime(start)} – {fmtTime(end)}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  ) : selectedDate && selectedSlot ? (
                    // Compact step 2 summary
                    <div className="flex items-center justify-between rounded-2xl border border-[#A8FF3E]/30 bg-[#A8FF3E]/5 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <CalendarIcon className="h-5 w-5 text-muted-foreground shrink-0" />
                        <div>
                          <div className="text-xs text-muted-foreground">Date & Time</div>
                          <div className="font-semibold text-sm">
                            {fmtDate(selectedDate)} at {fmtTime(selectedSlot.split(" / ")[0])}
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => { setStep(2); setSelectedSlot(null); }} className="text-xs gap-1.5">
                        <Pencil className="h-3 w-3" /> Change
                      </Button>
                    </div>
                  ) : null}
                </div>
              )}

              {/* ── Step 3: Confirm ── */}
              {selectedPsychologist && selectedDate && selectedSlot && step === 3 && (
                <div ref={step3Ref}>
                  <div className="label-eyebrow mb-3">Step 3 — Review & confirm</div>
                  <div className="grid lg:grid-cols-2 gap-6">
                    <div className="rounded-2xl border border-border p-5 space-y-4">
                      <div className="text-sm font-semibold">Summary</div>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
                          {selectedPsychologist.full_name.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
                        </div>
                        <div>
                          <div className="font-medium text-sm">{selectedPsychologist.full_name}</div>
                          <div className="text-xs text-muted-foreground capitalize">{selectedPsychologist.staff_type}</div>
                        </div>
                      </div>
                      <div className="text-sm flex items-center gap-2 text-muted-foreground">
                        <CalendarIcon className="h-4 w-4 shrink-0" />
                        {fmtDate(selectedDate)} at {fmtTime(selectedSlot.split(" / ")[0])}
                      </div>
                      <div className="flex gap-2 pt-1">
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
                        rows={4}
                        placeholder="Anything you'd like your counselor to know before the session…"
                      />
                      <Button
                        onClick={confirmBooking}
                        disabled={loading}
                        className="w-full bg-[#A8FF3E] hover:bg-[#96e836] text-black font-semibold h-11"
                      >
                        {loading ? <><NeonSpinner size={16} className="mr-2" /> Requesting…</> : "Request Appointment"}
                      </Button>
                      <p className="text-[10px] text-muted-foreground text-center">Your counselor will confirm the session.</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* ── Upcoming appointments ── */}
        <section className="space-y-3">
          <div className="label-eyebrow">Upcoming appointments</div>
          {appointmentsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="surface-card p-5 space-y-3 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-3 bg-muted rounded w-3/4" />
                      <div className="h-2.5 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                  <div className="h-3 bg-muted rounded w-2/3" />
                  <div className="flex gap-2">
                    <div className="h-5 bg-muted rounded-full w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : (() => {
            const upcomingAppts = myAppointments.filter(
              (a) => a.status === "booked" && new Date(a.start_time) > new Date()
            );
            if (upcomingAppts.length === 0) {
              return (
                <div className="surface-card p-10 flex flex-col items-center justify-center text-center space-y-3">
                  <CalendarIcon className="h-8 w-8 text-muted-foreground/40" />
                  <div className="font-semibold text-sm">No upcoming appointments</div>
                  <div className="text-xs text-muted-foreground">Book a session above to get started</div>
                </div>
              );
            }
            return (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {upcomingAppts.map((a) => {
                  const initials = (a.psychologist_full_name || "?").split(" ").map((p) => p[0]).slice(0, 2).join("");
                  return (
                    <div key={a.id} className="surface-card surface-card-hover p-5 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                          {initials}
                        </div>
                        <div>
                          <div className="font-semibold text-sm">{a.psychologist_full_name || "Counselor"}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(a.start_time).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · {new Date(a.start_time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-medium",
                          a.pending_approval
                            ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                            : "bg-[#A8FF3E]/15 text-[#5a8c00]"
                        )}>
                          {a.pending_approval ? "Awaiting confirmation" : "Confirmed"}
                        </span>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button size="sm" variant="ghost" className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => {
                          setMyAppointments((prev) => prev.filter((x) => x.id !== a.id));
                          toast.success("Appointment cancelled");
                        }}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </section>

        {/* ── Past sessions ── */}
        <section className="surface-card p-6">
          <button onClick={() => setPastOpen((o) => !o)} className="w-full flex items-center justify-between">
            <div className="font-semibold flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              Past Sessions
            </div>
            <ChevronRight className={cn("h-4 w-4 transition", pastOpen && "rotate-90")} />
          </button>
          {pastOpen && (
            <div className="mt-4 overflow-x-auto">
              {appointmentsLoading ? (
                <div className="flex justify-center py-6"><NeonSpinner size={24} /></div>
              ) : (() => {
                const pastAppts = myAppointments.filter(
                  (a) => a.status === "completed" || (a.status !== "booked") || new Date(a.start_time) < new Date()
                );
                if (pastAppts.length === 0) {
                  return <div className="py-8 text-center text-sm text-muted-foreground">No past sessions yet</div>;
                }
                return (
                  <table className="w-full text-sm">
                    <thead className="text-xs text-muted-foreground uppercase tracking-wider">
                      <tr className="border-b border-border">
                        <th className="text-left py-2">Date</th>
                        <th className="text-left py-2">Counselor</th>
                        <th className="text-left py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pastAppts.map((p) => (
                        <tr key={p.id} className="border-b border-border/60 hover:bg-muted/30 cursor-pointer" onClick={() => setViewing(p)}>
                          <td className="py-3">{new Date(p.start_time).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                          <td className="py-3">{p.psychologist_full_name || "—"}</td>
                          <td className="py-3">
                            <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs capitalize">{p.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </div>
          )}
        </section>
      </div>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Session — {viewing ? new Date(viewing.start_time).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground space-y-2">
            <div><span className="font-medium text-foreground">Counselor:</span> {viewing?.psychologist_full_name || "—"}</div>
            <div><span className="font-medium text-foreground">Status:</span> {viewing?.status}</div>
            {viewing?.session_summary && <p className="mt-3 leading-relaxed">{viewing.session_summary}</p>}
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
