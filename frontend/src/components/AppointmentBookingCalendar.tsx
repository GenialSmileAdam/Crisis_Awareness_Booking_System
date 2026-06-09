import { useState } from "react";
import { ChevronLeft, ChevronRight, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useRequestAppointment } from "@/hooks/mutations";
import { useWeekAvailability } from "@/hooks/queries";

interface AppointmentBookingCalendarProps {
  psychologistId: string;
  psychologistName: string;
}

const HOURS = Array.from({ length: 10 }, (_, i) => `${9 + i}:00`);
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function AppointmentBookingCalendar({ psychologistId, psychologistName }: AppointmentBookingCalendarProps) {
  const [weekStart, setWeekStart] = useState(getMonday(new Date()));
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; time: string } | null>(null);
  const [notes, setNotes] = useState("");
  const { mutateAsync: requestAppointmentMutate, isPending: requesting } = useRequestAppointment();

  function getMonday(date: Date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  const handleBookSlot = async () => {
    if (!selectedSlot) return;

    try {
      const [year, month, day] = selectedSlot.date.split("-");
      const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      const timeObj = new Date(`${selectedSlot.date}T${selectedSlot.time}`);
      const endTime = new Date(timeObj.getTime() + 60 * 60 * 1000); // 1 hour session

      await requestAppointmentMutate({
        psychologist_id: psychologistId,
        start_time: timeObj.toISOString(),
        end_time: endTime.toISOString(),
        notes: notes || undefined,
      });

      toast.success("Appointment request submitted! Waiting for approval...");
      setSelectedSlot(null);
      setNotes("");
    } catch (error: any) {
      toast.error(error.message || "Failed to request appointment");
    }
  };

  const weekDates = DAYS.map((_, dayIdx) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + dayIdx);
    return date.toISOString().split("T")[0];
  });

  const slotsByDate = useWeekAvailability(psychologistId, weekDates);

  const getAvailableSlots = (dateStr: string) => {
    const daySlots = slotsByDate[dateStr] ?? [];
    return HOURS.map((hour, i) => {
      const hourNum = 9 + i;
      const available = daySlots.some(slot => {
        const [startISO] = slot.split(" / ");
        const slotHour = parseInt(startISO.split("T")[1]?.split(":")[0] ?? "-1", 10);
        return slotHour === hourNum;
      });
      return { time: hour, available };
    });
  };

  return (
    <div className="glass border border-border rounded-3xl p-6">
      <div className="mb-6">
        <h3 className="font-display text-lg font-bold">Book Appointment with {psychologistName}</h3>
        <p className="text-sm text-muted-foreground">Select an available time slot</p>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setWeekStart(new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">
          Week of {weekStart.toLocaleDateString()}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setWeekStart(new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Availability Grid */}
      <div className="space-y-4">
        {weekDates.map((dateStr, dayIdx) => {
          const date = new Date(weekStart);
          date.setDate(date.getDate() + dayIdx);
          const slots = getAvailableSlots(dateStr);

          return (
            <div key={dateStr}>
              <h4 className="font-semibold text-sm mb-2">
                {DAYS[dayIdx]}, {date.toLocaleDateString()}
              </h4>
              <div className="grid grid-cols-5 gap-2">
                {slots.map(({ time, available }) => (
                  <button
                    key={time}
                    onClick={() => available && setSelectedSlot({ date: dateStr, time })}
                    disabled={!available}
                    className={cn(
                      "p-2 rounded-lg border text-sm transition-colors",
                      !available
                        ? "border-border/50 bg-muted/50 text-muted-foreground cursor-not-allowed"
                        : selectedSlot?.date === dateStr && selectedSlot?.time === time
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:bg-muted cursor-pointer"
                    )}
                  >
                    <div className="font-mono">{time}</div>
                    {!available && (
                      <AlertCircle className="h-3 w-3 mx-auto mt-1 opacity-50" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selection Dialog */}
      <Dialog open={!!selectedSlot} onOpenChange={(open) => !open && setSelectedSlot(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Appointment</DialogTitle>
          </DialogHeader>
          {selectedSlot && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-sm">
                  <div className="font-medium">{psychologistName}</div>
                  <div className="text-muted-foreground">
                    {new Date(selectedSlot.date).toLocaleDateString()} at {selectedSlot.time}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Duration: 1 hour</div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">Notes (optional)</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Tell the psychologist what's on your mind..."
                  rows={3}
                />
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm text-blue-900 dark:text-blue-100">
                <Check className="h-4 w-4 inline mr-2" />
                Your request will be sent for approval
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedSlot(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleBookSlot}
              disabled={requesting}
              className="gradient-primary text-primary-foreground border-0"
            >
              {requesting ? "Requesting..." : "Request Appointment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
