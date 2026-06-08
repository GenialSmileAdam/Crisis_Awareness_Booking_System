import { useState } from "react";
import { Phone, Calendar, Copy, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useCrisisHotlineConfig } from "@/hooks/queries/usePublicConfig";
import { usePsychologists, useAppointmentAvailability } from "@/hooks/queries";
import { useRequestAppointment } from "@/hooks/mutations";

export function BookingModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const today = new Date().toISOString().split("T")[0];
  const [psychologistId, setPsychologistId] = useState("");
  const [date, setDate] = useState(today);
  const [slot, setSlot] = useState("");
  const [note, setNote] = useState("");

  const { data: psychsData, isLoading: psychsLoading } = usePsychologists();
  const psychologists = psychsData?.data || [];

  const { data: availableSlots = [], isLoading: slotsLoading } = useAppointmentAvailability(
    psychologistId,
    date,
  );

  const { mutateAsync: requestAppointment, isPending: booking } = useRequestAppointment();

  const formatSlot = (s: string) => {
    const [start] = s.split(" / ");
    return new Date(start).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  const reset = () => {
    setPsychologistId("");
    setDate(today);
    setSlot("");
    setNote("");
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const submit = async () => {
    if (!psychologistId) return toast.error("Select a counselor");
    if (!date) return toast.error("Select a date");
    if (!slot) return toast.error("Select a time slot");

    const [startTime, endTime] = slot.split(" / ");
    try {
      await requestAppointment({
        psychologist_id: psychologistId,
        start_time: startTime,
        end_time: endTime,
        notes: note || undefined,
      });
      toast.success("Appointment request submitted — awaiting confirmation.");
      handleClose(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit request. Please try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Book a session</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          {/* Counselor picker */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Counselor</label>
            {psychsLoading ? (
              <div className="h-10 rounded-md bg-muted animate-pulse" />
            ) : (
              <Select value={psychologistId} onValueChange={(v) => { setPsychologistId(v); setSlot(""); }}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select a counselor…" />
                </SelectTrigger>
                <SelectContent>
                  {psychologists.map(p => (
                    <SelectItem key={p.user_id} value={p.user_id}>
                      {p.name}{p.department ? ` — ${p.department}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Date picker */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Date</label>
            <Input
              type="date"
              value={date}
              min={today}
              onChange={(e) => { setDate(e.target.value); setSlot(""); }}
              className="h-10"
            />
          </div>

          {/* Time slot picker */}
          <div>
            <label className="text-sm font-medium mb-2 block">Available time slots</label>
            {!psychologistId ? (
              <p className="text-xs text-muted-foreground">Select a counselor and date first</p>
            ) : slotsLoading ? (
              <div className="flex gap-2">
                {[1, 2, 3].map(i => <div key={i} className="h-9 w-20 rounded-full bg-muted animate-pulse" />)}
              </div>
            ) : availableSlots.length === 0 ? (
              <p className="text-xs text-muted-foreground">No available slots on this date — try another day.</p>
            ) : (
              <div className="flex gap-2 flex-wrap">
                {availableSlots.map(s => (
                  <button
                    key={s}
                    onClick={() => setSlot(s)}
                    className={cn(
                      "px-3 py-2 rounded-full border text-sm transition font-medium",
                      slot === s
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:bg-muted"
                    )}
                  >
                    {formatSlot(s)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Optional note */}
          <div>
            <label className="text-sm font-medium mb-1 block">Note (optional)</label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Anything you'd like your counselor to know beforehand…"
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
          <Button
            onClick={submit}
            disabled={booking || !psychologistId || !slot}
            className="gradient-primary text-primary-foreground border-0"
          >
            {booking ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting…</> : "Request Session"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function HotlineModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { data: hotlineConfig } = useCrisisHotlineConfig();
  const number = hotlineConfig?.number || "1-800-CRISIS-LINE";
  const description = hotlineConfig?.description || "Free. Confidential. Available now.";
  const title = hotlineConfig?.name || "24/7 Crisis Hotline";

  // Extract just the digits for clipboard
  const numberForClipboard = number.replace(/\D/g, '');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="text-center py-6">
          <div className="font-display text-3xl font-bold mb-2">{number}</div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <DialogFooter className="sm:justify-center">
          <Button onClick={() => { navigator.clipboard.writeText(numberForClipboard); toast.success("Number copied to clipboard"); }} variant="outline">
            <Copy className="h-4 w-4 mr-2" /> Copy Number
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CrisisBanner() {
  const [bookingOpen, setBookingOpen] = useState(false);
  const [hotlineOpen, setHotlineOpen] = useState(false);
  const [notified, setNotified] = useState(false);

  const handleHotlineClick = () => {
    // Silently log crisis check-in
    const sessionState = JSON.parse(localStorage.getItem("ss_session") || "{}");
    sessionState.crisis_checkin = {
      type: "crisis",
      responses: {},
      submitted_at: new Date().toISOString()
    };
    localStorage.setItem("ss_session", JSON.stringify(sessionState));

    setNotified(true);
    setHotlineOpen(true);
  };

  return (
    <div className="mx-6 lg:mx-8 mt-6">
      <div className="rounded-2xl border-l-4 border border-destructive bg-destructive/10 p-3 md:p-5 animate-pulse-ring">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="h-3 w-3 rounded-full bg-destructive animate-pulse mt-1.5 shrink-0" />
            <div>
              <div className="font-display text-sm md:text-xl font-bold text-destructive">We're here for you. Please reach out now.</div>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">Your wellness score indicates you need support today.</p>
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-2 shrink-0">
            <Button onClick={handleHotlineClick} className="w-full md:w-auto bg-destructive hover:bg-destructive/90 text-destructive-foreground"><Phone className="h-4 w-4 mr-2" /> Call Crisis Hotline</Button>
            <Button onClick={() => setBookingOpen(true)} variant="outline" className="w-full md:w-auto border-destructive/50"><Calendar className="h-4 w-4 mr-2" /> Book Priority Session</Button>
          </div>
        </div>
      </div>
      {notified && (
        <div className="mt-2 text-xs font-medium text-muted-foreground flex items-center gap-1.5 pl-2 animate-fade-in-up">
          <Check className="h-3 w-3 text-success" /> Your counselor has been notified.
        </div>
      )}
      <BookingModal open={bookingOpen} onOpenChange={setBookingOpen} />
      <HotlineModal open={hotlineOpen} onOpenChange={setHotlineOpen} />
    </div>
  );
}
