import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Clock, X, Trash2, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useSaveSchedule } from "@/hooks/mutations";
import { useAddBusyBlock, useDeleteBusyBlock } from "@/hooks/mutations";
import { useMySchedule, useMyWeeklySchedule, useBusyBlocks } from "@/hooks/queries";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 10 }, (_, i) => ({
  hour: i + 9,
  display: `${(i + 9) % 12 || 12}:00 ${i + 9 >= 12 ? "PM" : "AM"}`,
}));

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function AvailabilityCalendarNew() {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [dayAvailability, setDayAvailability] = useState<Record<number, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Busy block add form state
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [blockStart, setBlockStart] = useState("");
  const [blockEnd, setBlockEnd] = useState("");
  const [blockReason, setBlockReason] = useState("");

  const { mutateAsync: saveScheduleMutate } = useSaveSchedule();
  const { mutateAsync: addBusyBlock } = useAddBusyBlock();
  const { mutateAsync: deleteBusyBlock } = useDeleteBusyBlock();

  const { data: mySchedule = [], isLoading: scheduleLoading } = useMySchedule();
  const { data: weeklySchedule = [], isLoading: weeklyLoading } = useMyWeeklySchedule();
  const { data: busyBlocks = [], isLoading: blocksLoading } = useBusyBlocks();

  // Set of day_of_week values that have a recurring pattern configured
  const recurringDays = useMemo(() => new Set(weeklySchedule.map((w) => w.day_of_week)), [weeklySchedule]);

  // Build a set of dates that already have availability (for calendar dot indicators)
  const availableDates = useMemo(() => {
    const s = new Set<string>();
    mySchedule.forEach(block => {
      if ((block as any).date) s.add((block as any).date);
    });
    return s;
  }, [mySchedule]);

  const { daysCount, startingDayOfWeek, year, month } = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    const firstDay = new Date(y, m, 1);
    const lastDay = new Date(y, m + 1, 0);
    return {
      daysCount: lastDay.getDate(),
      startingDayOfWeek: firstDay.getDay(),
      year: y,
      month: m,
    };
  }, [currentDate]);

  const handleDayClick = (day: number) => {
    const date = new Date(year, month, day);
    setSelectedDay(date);

    // Determine which hours are available for this specific date from real schedule
    const dateStr = date.toISOString().split("T")[0];
    const existingBlocks = mySchedule.filter((b: any) => b.date === dateStr);

    const availability: Record<number, boolean> = {};
    HOURS.forEach(h => { availability[h.hour] = false; });

    existingBlocks.forEach((b: any) => {
      const start = parseInt(b.start_time.split(":")[0]);
      const end = parseInt(b.end_time.split(":")[0]);
      for (let h = start; h < end; h++) {
        if (availability[h] !== undefined) availability[h] = true;
      }
    });

    // If no existing blocks, default all hours to true
    if (existingBlocks.length === 0) {
      HOURS.forEach(h => { availability[h.hour] = true; });
    }

    setDayAvailability(availability);
  };

  const handleHourToggle = (hour: number) => {
    setDayAvailability(prev => ({ ...prev, [hour]: !prev[hour] }));
  };

  const handleSaveDaySchedule = async () => {
    if (!selectedDay) return;
    setIsSaving(true);
    try {
      const selectedHours = Object.keys(dayAvailability)
        .filter(h => dayAvailability[parseInt(h)])
        .map(h => parseInt(h))
        .sort((a, b) => a - b);

      if (selectedHours.length === 0) {
        toast.error("Please select at least one hour");
        return;
      }

      const startHour = selectedHours[0];
      const endHour = selectedHours[selectedHours.length - 1] + 1;
      const startTime = `${String(startHour).padStart(2, "0")}:00`;
      const endTime = `${String(endHour).padStart(2, "0")}:00`;

      const dayName = DAY_NAMES[selectedDay.getDay()];
      await saveScheduleMutate([{ day: dayName, start_time: startTime, end_time: endTime }]);

      queryClient.invalidateQueries({ queryKey: ["availability", "schedule"] });
      queryClient.invalidateQueries({ queryKey: ["availability", "weekly"] });
      toast.success(`Recurring schedule saved for every ${dayName}`);
      setSelectedDay(null);
    } catch {
      toast.error("Failed to save schedule");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddBusyBlock = async () => {
    if (!blockStart || !blockEnd) {
      toast.error("Start and end times are required");
      return;
    }
    try {
      await addBusyBlock({ block_start: blockStart, block_end: blockEnd, reason: blockReason || undefined });
      toast.success("Busy block added");
      setShowAddBlock(false);
      setBlockStart("");
      setBlockEnd("");
      setBlockReason("");
    } catch {
      toast.error("Failed to add busy block");
    }
  };

  const handleDeleteBusyBlock = async (id: string) => {
    try {
      await deleteBusyBlock(id);
      toast.success("Busy block removed");
    } catch {
      toast.error("Failed to remove busy block");
    }
  };

  // Calendar grid
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < startingDayOfWeek; i++) calendarDays.push(null);
  for (let d = 1; d <= daysCount; d++) calendarDays.push(d);

  const today = new Date();
  const isToday = (d: number) =>
    d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const hasAvailability = (d: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    return availableDates.has(dateStr);
  };

  const monthName = new Date(year, month).toLocaleString("default", { month: "long", year: "numeric" });
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));

  // JS getDay(): 0=Sunday…6=Saturday  →  Python weekday(): 0=Monday…6=Sunday
  const jsToWeekday = (jsDay: number) => (jsDay + 6) % 7;
  const hasRecurring = (d: number) => {
    const date = new Date(year, month, d);
    return recurringDays.has(jsToWeekday(date.getDay()));
  };

  return (
    <div className="space-y-6">

      {/* Recurring weekly schedule summary */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold">Recurring Weekly Schedule</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Students can book sessions on these days every week
            </p>
          </div>
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
        </div>
        {weeklyLoading ? (
          <div className="flex gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 flex-1 rounded-xl bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : weeklySchedule.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-4 text-center">
            <p className="text-sm text-muted-foreground">No recurring schedule set.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Click any day on the calendar below and save hours to set your weekly availability.
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {weeklySchedule.map((w) => (
              <div key={w.id} className="flex flex-col items-center gap-1 px-4 py-2.5 rounded-xl border border-[#A8FF3E]/30 bg-[#A8FF3E]/5">
                <span className="text-xs font-semibold">{w.day_name}</span>
                <span className="text-[11px] text-muted-foreground">{w.start_time} – {w.end_time}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Month Calendar */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">{monthName}</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-4">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
            <div key={d} className="text-center text-sm font-semibold text-muted-foreground py-2">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((day, idx) => (
            <button
              key={idx}
              onClick={() => day && handleDayClick(day)}
              disabled={!day}
              className={cn(
                "aspect-square rounded-lg border transition-all flex flex-col items-center justify-center font-medium text-sm relative",
                !day && "invisible",
                day && selectedDay?.getDate() === day && selectedDay.getMonth() === month && selectedDay.getFullYear() === year
                  ? "bg-primary text-primary-foreground border-primary"
                  : day && isToday(day)
                  ? "border-primary/50 text-primary"
                  : day
                  ? "bg-muted border-border hover:border-primary cursor-pointer"
                  : ""
              )}
            >
              {day}
              {day && (hasAvailability(day) || hasRecurring(day)) && (
                <span className={cn(
                  "absolute bottom-1 w-1 h-1 rounded-full",
                  hasAvailability(day) ? "bg-[#A8FF3E]" : "bg-[#A8FF3E]/50"
                )} />
              )}
            </button>
          ))}
        </div>
        {scheduleLoading && (
          <p className="text-xs text-muted-foreground mt-3 text-center">Loading your schedule…</p>
        )}
      </div>

      {/* Day Detail Panel */}
      {selectedDay && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold">{selectedDay.toDateString()}</h3>
              <p className="text-sm text-muted-foreground">
                Set recurring availability for every {DAY_NAMES[selectedDay.getDay()]}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setSelectedDay(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mb-6">
            {HOURS.map(({ hour, display }) => (
              <button
                key={hour}
                onClick={() => handleHourToggle(hour)}
                className={cn(
                  "p-3 rounded-lg border-2 transition-all text-sm font-medium",
                  dayAvailability[hour]
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted border-border hover:border-muted-foreground"
                )}
              >
                <div className="text-xs opacity-75">{display}</div>
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleSaveDaySchedule}
              disabled={isSaving}
              className="flex-1 bg-[#A8FF3E] hover:bg-[#96e836] text-black font-semibold"
            >
              <Clock className="h-4 w-4 mr-2" />
              {isSaving ? "Saving…" : "Save Schedule"}
            </Button>
            <Button variant="outline" onClick={() => setSelectedDay(null)} className="flex-1">
              Cancel
            </Button>
          </div>

          <p className="text-xs text-muted-foreground mt-4">
            This becomes your permanent recurring schedule for every {DAY_NAMES[selectedDay.getDay()]}. Students can book any future {DAY_NAMES[selectedDay.getDay()]} within these hours.
          </p>
        </div>
      )}

      {/* Busy Blocks Section */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold">Blocked Times</h3>
            <p className="text-sm text-muted-foreground">Times you're unavailable for bookings</p>
          </div>
          <Button
            size="sm"
            onClick={() => setShowAddBlock(v => !v)}
            className="bg-[#A8FF3E] hover:bg-[#96e836] text-black font-semibold"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Block
          </Button>
        </div>

        {showAddBlock && (
          <div className="mb-4 p-4 rounded-xl border border-border bg-muted/30 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Start</label>
                <Input type="datetime-local" value={blockStart} onChange={e => setBlockStart(e.target.value)} className="h-9 text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">End</label>
                <Input type="datetime-local" value={blockEnd} onChange={e => setBlockEnd(e.target.value)} className="h-9 text-sm" />
              </div>
            </div>
            <Input
              placeholder="Reason (optional)"
              value={blockReason}
              onChange={e => setBlockReason(e.target.value)}
              className="h-9 text-sm"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddBusyBlock} className="bg-[#A8FF3E] hover:bg-[#96e836] text-black font-semibold">
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowAddBlock(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {blocksLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-12 rounded-xl bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : busyBlocks.length === 0 ? (
          <p className="text-muted-foreground text-sm">No blocked times yet.</p>
        ) : (
          <div className="space-y-2">
            {busyBlocks.map(block => (
              <div key={block.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
                <div>
                  <div className="text-sm font-medium">
                    {new Date(block.block_start).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                    {" — "}
                    {new Date(block.block_end).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                  </div>
                  {block.reason && <div className="text-xs text-muted-foreground mt-0.5">{block.reason}</div>}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleDeleteBusyBlock(block.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
