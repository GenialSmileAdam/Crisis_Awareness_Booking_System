import {
  getAppointmentAvailability,
  bookStudentAppointment,
  getMyAppointments,
  cancelMyAppointment,
  type Appointment,
} from "@/api/appointments";
import { listPsychologists } from "@/api/staff";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar as CalendarIcon, Check, ChevronLeft, ChevronRight, Clock,
  Eye, MessageSquare, RotateCcw, Sparkles, Video, MapPin, LogOut, Loader2,
} from "lucide-react";
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

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function StudentAppointments() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());

  const [psychologists, setPsychologists] = useState<any[]>([]);
  const [selectedPsychologist, setSelectedPsychologist] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [psychologistsLoading, setPsychologistsLoading] = useState(false);
  const [psychologistLoadError, setPsychologistLoadError] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<"In-Person" | "Virtual">("Virtual");
  const [notes, setNotes] = useState("");

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [pastOpen, setPastOpen] = useState(false);
  const [viewing, setViewing] = useState<Appointment | null>(null);

  const upcomingAppointments = appointments.filter(
    (a) => a.status === "booked" && new Date(a.start_time) >= today,
  );
  const pastAppointments = appointments.filter(
    (a) => a.status !== "booked" || new Date(a.start_time) < today,
  );

  const loadAppointments = async () => {
    setAppointmentsLoading(true);
    try {
      const res = await getMyAppointments();
      setAppointments((res as any).data ?? []);
    } catch {
      toast.error("Failed to load your appointments");
    } finally {
      setAppointmentsLoading(false);
    }
  };

  const loadPsychologists = async () => {
    setPsychologistsLoading(true);
    setPsychologistLoadError(false);
    try {
      setPsychologists(await listPsychologists());
    } catch {
      setPsychologists([]);
      setPsychologistLoadError(true);
    } finally {
      setPsychologistsLoading(false);
    }
  };

  useEffect(() => { loadPsychologists(); loadAppointments(); }, []);

  const cells = useMemo(() => buildMonth(viewYear, viewMonth), [viewYear, viewMonth]);
  const monthName = new Date(viewYear, viewMonth).toLocaleString("default", { month: "long", year: "numeric" });

  const reset = () => {
    setSelectedPsychologist(null); setSelectedDate(null); setSelectedSlot(null);
    setAvailableSlots([]); setNotes(""); setMode("Virtual"); setBookingSuccess(false); setStep(1);
  };

  const confirmBooking = async () => {
    if (!selectedSlot || !selectedPsychologist) return;
    setLoading(true);
    try {
      const [start, end] = selectedSlot.split(" / ");
      await bookStudentAppointment({ psychologist_id: selectedPsychologist.user_id, start_time: start, end_time: end, notes: notes || undefined });
      setBookingSuccess(true); setStep(4);
      toast.success("Appointment confirmed!");
      await loadAppointments();
      setTimeout(reset, 2000);
    } catch { toast.error("Failed to book appointment. Please try again."); }
    finally { setLoading(false); }
  };

  const handleCancel = async (id: string) => {
    try {
      await cancelMyAppointment(id);
      setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, status: "cancelled" as const } : a));
      toast.success("Appointment cancelled");
    } catch { toast.error("Failed to cancel appointment"); }
  };

  return (
    <AppShell items={studentSidebarItems}>
      <div className="flex items-start md:items-center justify-between py-4 md:h-16 px-4 md:px-8 border-b border-border bg-background md:bg-background/60 md:backdrop-blur-sm sticky top-0 z-30">
        <div className="flex-1">
          <div className="font-display font-bold text-xl md:text-2xl">My Appointments</div>
          <div className="text-xs text-muted-foreground mt-0.5">Book and manage your wellness sessions</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button onClick={() => document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" })} size="sm" className="hidden md:flex gradient-primary text-primary-foreground border-0">
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

        {/* Booking flow */}
        <section id="booking" className="surface-card p-6 space-y-6">
          <div className="flex items-center gap-3">
            {[1, 2, 3].map((n, i) => (
              <div key={n} className="flex items-center flex-1">
                <div className={cn("h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold transition", step >= n ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                  {step > n ? <Check className="h-4 w-4" /> : n}
                </div>
                <div className="ml-3 text-sm font-medium hidden md:block">{n === 1 ? "Counselor" : n === 2 ? "Date & Time" : "Confirm"}</div>
                {i < 2 && (
                  <div className="flex-1 mx-3 h-0.5 bg-muted relative overflow-hidden rounded-full">
                    <div className="absolute inset-y-0 left-0 bg-primary transition-all duration-500" style={{ width: step > n ? "100%" : "0%" }} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Step 1 */}
          <div className={cn(step !== 1 && "hidden md:block opacity-40 pointer-events-none")}>
            <div className="label-eyebrow mb-3">Step 1 — Select your counselor</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {psychologistsLoading ? (
                <div className="md:col-span-3 rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">Loading counselors...</div>
              ) : psychologistLoadError ? (
                <div className="md:col-span-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center">
                  <div className="font-semibold text-sm text-destructive mb-3">Unable to load counselors. Please try again.</div>
                  <Button variant="outline" onClick={loadPsychologists}>Retry</Button>
                </div>
              ) : psychologists.map((p) => {
                const active = selectedPsychologist?.user_id === p.user_id;
                return (
                  <button key={p.user_id} onClick={() => { setSelectedPsychologist(p); setStep(2); }}
                    className={cn("text-left p-5 rounded-2xl border transition-all relative overflow-hidden", active ? "border-primary bg-primary/5 shadow-[0_0_0_1px_hsl(var(--primary))]" : "border-border bg-card hover:border-primary/40")}>
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold shrink-0">
                        {p.full_name.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
                      </div>
                      <div className="overflow-hidden">
                        <div className="font-semibold truncate">{p.full_name}</div>
                        <div className="text-xs text-muted-foreground truncate">{p.staff_type}</div>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-[10px] font-medium uppercase tracking-wider">{p.specialization || "General Counseling"}</span>
                      <span className="px-2 py-0.5 rounded-full bg-success/15 text-[10px] font-medium uppercase tracking-wider text-success">Available</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2 */}
          {selectedPsychologist && (
            <div className={cn("animate-fade-in-up", step !== 2 && "hidden md:block opacity-40 pointer-events-none")}>
              <div className="label-eyebrow mb-3">Step 2 — Pick a date & time</div>
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <button onClick={() => { const d = new Date(viewYear, viewMonth - 1); setViewMonth(d.getMonth()); setViewYear(d.getFullYear()); }} className="p-1 rounded-md hover:bg-muted"><ChevronLeft className="h-4 w-4" /></button>
                    <div className="font-semibold text-sm">{monthName}</div>
                    <button onClick={() => { const d = new Date(viewYear, viewMonth + 1); setViewMonth(d.getMonth()); setViewYear(d.getFullYear()); }} className="p-1 rounded-md hover:bg-muted"><ChevronRight className="h-4 w-4" /></button>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground mb-1">
                    {["Su","Mo","Tu","We","Th","Fr","Sa"].map((d) => <div key={d}>{d}</div>)}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {cells.map((d, i) => {
                      if (d === null) return <div key={i} />;
                      const isPast = new Date(viewYear, viewMonth, d) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
                      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                      const active = selectedDate === dateStr;
                      return (
                        <button key={i} disabled={isPast}
                          onClick={async () => { setSelectedDate(dateStr); setSlotsLoading(true); try { setAvailableSlots(await getAppointmentAvailability(selectedPsychologist.user_id, dateStr) || []); } catch { toast.error("Failed to load availability"); } finally { setSlotsLoading(false); } }}
                          className={cn("h-9 rounded-lg text-sm font-medium transition", isPast && "text-muted-foreground/40 cursor-not-allowed", !isPast && !active && "hover:bg-primary/10", active && "bg-primary text-primary-foreground")}>
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="rounded-2xl border border-border p-4 min-h-[200px] flex flex-col">
                  <div className="text-sm font-semibold mb-3 flex items-center gap-2"><Clock className="h-4 w-4" /> Available times</div>
                  {slotsLoading ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground"><Loader2 className="h-8 w-8 animate-spin mb-2" /><div className="text-xs">Loading slots...</div></div>
                  ) : !selectedDate ? (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs italic">Select a date to see available times</div>
                  ) : availableSlots.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">No available slots for this date</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {availableSlots.map((slot) => {
                        const [start, end] = slot.split(" / ");
                        return (
                          <button key={slot} onClick={() => { setSelectedSlot(slot); setStep(3); }}
                            className={cn("px-3 py-3 rounded-xl border text-xs font-medium transition", selectedSlot === slot ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/40")}>
                            {fmtTime(start)} - {fmtTime(end)}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {selectedDate && selectedSlot && (
                    <div className="mt-auto pt-4 text-[10px] text-muted-foreground font-mono uppercase tracking-widest text-center">
                      Selected: {fmtDate(selectedDate)} at {fmtTime(selectedSlot.split(" / ")[0])}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {selectedPsychologist && selectedDate && selectedSlot && (
            <div className={cn("animate-fade-in-up", step !== 3 && step !== 4 && "hidden md:block opacity-40 pointer-events-none")}>
              <div className="label-eyebrow mb-3">Step 3 — Review & confirm</div>
              {bookingSuccess ? (
                <div className="rounded-2xl border border-primary/30 bg-primary/5 p-8 text-center space-y-3">
                  <div className="mx-auto h-14 w-14 rounded-full bg-success flex items-center justify-center">
                    <Check className="h-7 w-7" style={{ color: "hsl(var(--success-foreground))" }} />
                  </div>
                  <div className="font-display font-bold text-xl">Appointment confirmed!</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedPsychologist.full_name} · {fmtDate(selectedDate)} · {fmtTime(selectedSlot.split(" / ")[0])} · {mode}
                  </div>
                  <Button variant="outline" onClick={reset}><RotateCcw className="h-4 w-4 mr-2" /> Start Over</Button>
                </div>
              ) : (
                <div className="grid lg:grid-cols-2 gap-6">
                  <div className="rounded-2xl border border-border p-5 space-y-3">
                    <div className="text-sm font-semibold">Summary</div>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                        {selectedPsychologist.full_name.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{selectedPsychologist.full_name}</div>
                        <div className="text-xs text-muted-foreground">{selectedPsychologist.staff_type}</div>
                      </div>
                    </div>
                    <div className="text-sm flex items-center gap-2 text-muted-foreground">
                      <CalendarIcon className="h-4 w-4" /> {fmtDate(selectedDate)} at {fmtTime(selectedSlot.split(" / ")[0])}
                    </div>
                    <div className="flex gap-2 pt-2">
                      {(["In-Person", "Virtual"] as const).map((m) => (
                        <button key={m} onClick={() => setMode(m)}
                          className={cn("flex-1 px-3 py-2 rounded-xl border text-sm font-medium flex items-center justify-center gap-2 transition", mode === m ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40")}>
                          {m === "Virtual" ? <Video className="h-4 w-4" /> : <MapPin className="h-4 w-4" />} {m}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border p-5 space-y-3">
                    <div className="text-sm font-semibold">Notes (optional)</div>
                    <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} placeholder="Anything you'd like your counselor to know..." />
                    <Button onClick={confirmBooking} disabled={loading} className="w-full gradient-primary text-primary-foreground border-0 h-11">
                      {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Confirming...</> : "Confirm Appointment"}
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
          {appointmentsLoading ? (
            <div className="surface-card p-8 flex items-center justify-center text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin" /><span className="text-sm">Loading appointments...</span>
            </div>
          ) : upcomingAppointments.length === 0 ? (
            <div className="surface-card p-8 text-center text-sm text-muted-foreground">No upcoming appointments. Book a session above.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {upcomingAppointments.map((a) => {
                const initials = (a.psychologist_full_name ?? "?").split(" ").map((p) => p[0]).slice(0, 2).join("");
                return (
                  <div key={a.id} className="surface-card surface-card-hover p-5 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm">{initials}</div>
                      <div>
                        <div className="font-semibold text-sm">{a.psychologist_full_name ?? "Counselor"}</div>
                        <div className="text-xs text-muted-foreground capitalize">{a.status}</div>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" /> {fmtDate(a.start_time)} · {fmtTime(a.start_time)}
                    </div>
                    <div className="flex gap-2">
                      <span className="px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: "hsl(var(--success) / 0.15)", color: "hsl(var(--success))" }}>Confirmed</span>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" variant="ghost" className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleCancel(a.id)}>Cancel</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Past */}
        <section className="surface-card p-6">
          <button onClick={() => setPastOpen((o) => !o)} className="w-full flex items-center justify-between">
            <div className="font-semibold flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" /> Past Sessions ({pastAppointments.length})
            </div>
            <ChevronRight className={cn("h-4 w-4 transition", pastOpen && "rotate-90")} />
          </button>
          {pastOpen && (
            <div className="mt-4 overflow-x-auto">
              {pastAppointments.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">No past sessions yet.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground uppercase tracking-wider">
                    <tr className="border-b border-border">
                      <th className="text-left py-2">Date</th>
                      <th className="text-left py-2">Counselor</th>
                      <th className="text-left py-2">Status</th>
                      <th className="text-right py-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pastAppointments.map((p) => (
                      <tr key={p.id} className="border-b border-border/60 hover:bg-muted/30">
                        <td className="py-3">{fmtDate(p.start_time)}</td>
                        <td className="py-3">{p.psychologist_full_name ?? "—"}</td>
                        <td className="py-3"><span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs capitalize">{p.status}</span></td>
                        <td className="py-3 text-right">
                          {p.session_summary
                            ? <Button size="sm" variant="ghost" onClick={() => setViewing(p)}><Eye className="h-4 w-4" /></Button>
                            : <span className="text-xs text-muted-foreground">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </section>
      </div>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Session notes — {viewing ? fmtDate(viewing.start_time) : ""}</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">
            <div className="mb-2"><span className="font-medium text-foreground">Counselor:</span> {viewing?.psychologist_full_name ?? "—"}</div>
            <div className="mb-2"><span className="font-medium text-foreground">Status:</span> <span className="capitalize">{viewing?.status}</span></div>
            {viewing?.session_summary && <p className="mt-3 leading-relaxed">{viewing.session_summary}</p>}
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
