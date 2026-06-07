import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Clock, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useMySchedule, useBusyBlocks } from "@/hooks/queries";
import { useSaveSchedule, useAddBusyBlock, useDeleteBusyBlock } from "@/hooks/mutations";

interface TimeSlot {
  start: string;
  end: string;
}

const HOURS = Array.from({ length: 10 }, (_, i) => `${9 + i}:00`);
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function AvailabilityCalendar() {
  const { data: scheduleData } = useMySchedule();
  const { data: busyBlocksData } = useBusyBlocks();
  const { mutateAsync: saveScheduleMutate, isPending: savingSchedule } = useSaveSchedule();
  const { mutateAsync: addBlockMutate, isPending: addingBlock } = useAddBusyBlock();
  const { mutateAsync: deleteBlockMutate } = useDeleteBusyBlock();

  const [weekStart, setWeekStart] = useState(getMonday(new Date()));
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const [addBusyOpen, setAddBusyOpen] = useState(false);
  const [busyBlockForm, setBusyBlockForm] = useState({ date: "", start: "", end: "", reason: "" });
  const busyBlocks = busyBlocksData || [];

  function getMonday(date: Date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  const handleSlotClick = (day: number, hour: string) => {
    const slot = `${day}-${hour}`;
    const newSlots = new Set(selectedSlots);
    if (newSlots.has(slot)) {
      newSlots.delete(slot);
    } else {
      newSlots.add(slot);
    }
    setSelectedSlots(newSlots);
  };

  const handleSaveWeek = async () => {
    const schedule = [];
    for (let day = 0; day < 7; day++) {
      const daySlots = Array.from(selectedSlots)
        .filter(s => s.startsWith(`${day}-`))
        .map(s => s.split("-")[1]);

      if (daySlots.length > 0) {
        const startTime = daySlots[0];
        const endTime = `${parseInt(daySlots[daySlots.length - 1]) + 1}:00`;
        schedule.push({ day: DAYS[day], start_time: startTime, end_time: endTime });
      }
    }

    if (schedule.length === 0) {
      toast.error("Select at least one time slot");
      return;
    }

    try {
      await saveScheduleMutate(schedule);
      toast.success("Schedule saved for 4 weeks");
    } catch {
      toast.error("Failed to save schedule");
    }
  };

  const handleAddBusyBlock = async () => {
    if (!busyBlockForm.date || !busyBlockForm.start || !busyBlockForm.end) {
      toast.error("Fill all required fields");
      return;
    }

    try {
      await addBlockMutate({
        block_start: new Date(`${busyBlockForm.date}T${busyBlockForm.start}`).toISOString(),
        block_end: new Date(`${busyBlockForm.date}T${busyBlockForm.end}`).toISOString(),
        reason: busyBlockForm.reason || undefined,
      });
      setBusyBlockForm({ date: "", start: "", end: "", reason: "" });
      setAddBusyOpen(false);
      toast.success("Busy block added");
    } catch {
      toast.error("Failed to add busy block");
    }
  };

  return (
    <div className="space-y-6">
      {/* Weekly Availability Grid */}
      <div className="glass border border-border rounded-3xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-display text-lg font-bold">Your Weekly Schedule</h3>
            <p className="text-sm text-muted-foreground">Click to select available times</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setWeekStart(new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">{weekStart.toLocaleDateString()}</span>
            <Button variant="outline" size="sm" onClick={() => setWeekStart(new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="grid grid-cols-8 gap-1 min-w-max">
            {/* Header */}
            <div />
            {DAYS.map((day, i) => {
              const date = new Date(weekStart);
              date.setDate(date.getDate() + i);
              return (
                <div key={day} className="text-center p-2 font-semibold text-sm">
                  <div>{day}</div>
                  <div className="text-xs text-muted-foreground">{date.getDate()}</div>
                </div>
              );
            })}

            {/* Time slots */}
            {HOURS.map((hour) => (
              <div key={hour}>
                <div className="p-2 text-xs text-muted-foreground text-center font-mono">{hour}</div>
                {DAYS.map((_, dayIdx) => {
                  const slotId = `${dayIdx}-${hour}`;
                  const isSelected = selectedSlots.has(slotId);
                  return (
                    <button
                      key={slotId}
                      onClick={() => handleSlotClick(dayIdx, hour)}
                      className={cn(
                        "w-14 h-12 border rounded transition-colors",
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border hover:bg-muted"
                      )}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <Button onClick={handleSaveWeek} disabled={savingSchedule} className="gradient-primary text-primary-foreground border-0">
            <Clock className="h-4 w-4 mr-2" /> {savingSchedule ? "Saving..." : "Save Schedule (4 weeks)"}
          </Button>
          <Button variant="outline" onClick={() => setSelectedSlots(new Set())}>
            Clear
          </Button>
        </div>
      </div>

      {/* Busy Blocks */}
      <div className="glass border border-border rounded-3xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-display text-lg font-bold">Blocked Times</h3>
            <p className="text-sm text-muted-foreground">Times you're unavailable</p>
          </div>
          <Button onClick={() => setAddBusyOpen(true)} size="sm" className="gradient-primary text-primary-foreground border-0">
            <Plus className="h-4 w-4 mr-1" /> Add Block
          </Button>
        </div>

        <div className="space-y-2">
          {busyBlocks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No blocked times</p>
          ) : (
            busyBlocks.map((block) => (
              <div key={block.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <div className="font-medium text-sm">{block.reason || "Unavailable"}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(block.block_start).toLocaleString()} - {new Date(block.block_end).toLocaleTimeString()}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => deleteBlockMutate(block.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Busy Block Dialog */}
      <Dialog open={addBusyOpen} onOpenChange={setAddBusyOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Block Your Time</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Date</label>
              <Input type="date" value={busyBlockForm.date} onChange={(e) => setBusyBlockForm({ ...busyBlockForm, date: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-sm font-medium">Start Time</label>
                <Input type="time" value={busyBlockForm.start} onChange={(e) => setBusyBlockForm({ ...busyBlockForm, start: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">End Time</label>
                <Input type="time" value={busyBlockForm.end} onChange={(e) => setBusyBlockForm({ ...busyBlockForm, end: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Reason (optional)</label>
              <Input placeholder="e.g., Conference, Lunch break" value={busyBlockForm.reason} onChange={(e) => setBusyBlockForm({ ...busyBlockForm, reason: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddBusyOpen(false)}>Cancel</Button>
            <Button onClick={handleAddBusyBlock} disabled={addingBlock} className="gradient-primary text-primary-foreground border-0">
              {addingBlock ? "Adding..." : "Add Block"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
