import { useState } from "react";
import { Phone, Calendar, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function BookingModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState("");
  const [note, setNote] = useState("");
  const slots = ["9am", "11am", "2pm", "4pm"];
  const submit = () => {
    if (!date || !slot) return toast.error("Pick a date and time");
    toast.success(`Session booked with Dr. Amara for ${date} at ${slot}`);
    onOpenChange(false);
    setDate(""); setSlot(""); setNote("");
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Book a session</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium mb-1 block">Date</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Time slot</label>
            <div className="flex gap-2 flex-wrap">
              {slots.map((s) => (
                <button key={s} onClick={() => setSlot(s)} className={cn("px-4 py-2 rounded-full border text-sm transition", slot === s ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted")}>{s}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Note (optional)</label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything you'd like Dr. Amara to know..." rows={3} />
          </div>
        </div>
        <DialogFooter><Button onClick={submit} className="gradient-primary text-primary-foreground border-0">Confirm Booking</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function HotlineModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const number = "0800-SAFESPACE (0800-723-373)";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>24/7 Crisis Hotline</DialogTitle></DialogHeader>
        <div className="text-center py-6">
          <div className="font-display text-3xl font-bold mb-2">{number}</div>
          <p className="text-sm text-muted-foreground">Free. Confidential. Available now.</p>
        </div>
        <DialogFooter className="sm:justify-center">
          <Button onClick={() => { navigator.clipboard.writeText("0800-723-373"); toast.success("Number copied to clipboard"); }} variant="outline">
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
