import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, Plus, Trash2, CalendarOff, CheckCircle, LogOut } from "lucide-react";
import { AppShell } from "@/components/AppSidebar";
import { counselorSidebarItems } from "@/data/sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { NeonSpinner } from "@/components/NeonSpinner";
import { cn } from "@/lib/utils";
import {
  useMySchedule,
  useBusyBlocks,
  type DaySchedule,
  type BusyBlock,
} from "@/hooks/queries";
import {
  useSaveSchedule,
  useAddBusyBlock,
  useDeleteBusyBlock,
} from "@/hooks/mutations";

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const DEFAULT_SCHEDULE: DaySchedule[] = [0, 1, 2, 3, 4].map(d => ({
  day_of_week: d,
  start_time: "09:00",
  end_time: "17:00",
  is_available: true,
})).concat([5, 6].map(d => ({
  day_of_week: d,
  start_time: "09:00",
  end_time: "17:00",
  is_available: false,
})));

export default function CounselorAvailability() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [schedule, setSchedule] = useState<DaySchedule[]>(DEFAULT_SCHEDULE);
  const [newBlock, setNewBlock] = useState({ start: "", end: "", reason: "" });
  const [showAddBlock, setShowAddBlock] = useState(false);

  // React Query hooks
  const { data: scheduleData, isLoading: scheduleLoading } = useMySchedule();
  const { data: busyBlocksData, isLoading: blocksLoading } = useBusyBlocks();

  const { mutateAsync: saveScheduleMutate, isPending: scheduleSaving } = useSaveSchedule();
  const { mutateAsync: addBlockMutate, isPending: addingBlock } = useAddBusyBlock();
  const { mutateAsync: deleteBlockMutate } = useDeleteBusyBlock();

  // Merge fetched schedule with default template
  const scheduleList = scheduleData || [];
  if (scheduleList.length > 0 && schedule === DEFAULT_SCHEDULE) {
    const merged = DEFAULT_SCHEDULE.map(def => {
      const found = scheduleList.find(d => d.day_of_week === def.day_of_week);
      return found ? { ...def, ...found } : def;
    });
    setSchedule(merged);
  }

  const busyBlocks = busyBlocksData || [];

  const handleSaveSchedule = async () => {
    try {
      await saveScheduleMutate(schedule);
      toast.success("Schedule saved successfully");
    } catch {
      toast.error("Failed to save schedule");
    }
  };

  const handleAddBlock = async () => {
    if (!newBlock.start || !newBlock.end) {
      toast.error("Please fill in start and end date/time");
      return;
    }
    if (new Date(newBlock.end) <= new Date(newBlock.start)) {
      toast.error("End time must be after start time");
      return;
    }
    try {
      await addBlockMutate({
        block_start: new Date(newBlock.start).toISOString(),
        block_end: new Date(newBlock.end).toISOString(),
        reason: newBlock.reason || undefined,
      });
      setNewBlock({ start: "", end: "", reason: "" });
      setShowAddBlock(false);
      toast.success("Busy block added");
    } catch {
      toast.error("Failed to add busy block");
    }
  };

  const handleDeleteBlock = async (id: string) => {
    try {
      await deleteBlockMutate(id);
      toast.success("Busy block removed");
    } catch {
      toast.error("Failed to remove busy block");
    }
  };

  const updateDay = (idx: number, patch: Partial<DaySchedule>) => {
    setSchedule(prev => prev.map((d, i) => i === idx ? { ...d, ...patch } : d));
  };

  const formatBlockTime = (iso: string) =>
    new Date(iso).toLocaleString("en-US", {
      weekday: "short", month: "short", day: "numeric",
      hour: "numeric", minute: "2-digit",
    });

  return (
    <AppShell items={counselorSidebarItems}>
      <div className="flex items-center justify-between py-4 h-16 px-4 md:px-8 border-b border-border bg-background/60 backdrop-blur-sm sticky top-0 z-30">
        <h1 className="font-display text-xl font-bold">My Availability</h1>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={() => { logout(); navigate("/login"); }} className="rounded-full h-9 w-9 md:hidden">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="p-4 md:p-8 space-y-8 max-w-3xl mx-auto">
        {/* Weekly schedule */}
        <div className="surface-card p-6 rounded-3xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="label-eyebrow mb-0.5">Recurring schedule</div>
              <h2 className="font-display text-xl font-bold">Weekly Availability</h2>
              <p className="text-xs text-muted-foreground mt-1">Set your default working hours for each day of the week.</p>
            </div>
            <Button
              onClick={handleSaveSchedule}
              disabled={scheduleSaving}
              className="bg-[#A8FF3E] hover:bg-[#96e836] text-black font-semibold"
            >
              {scheduleSaving ? <NeonSpinner size={16} className="mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Save
            </Button>
          </div>

          {scheduleLoading ? (
            <div className="flex justify-center py-8">
              <NeonSpinner size={28} />
            </div>
          ) : (
            <div className="space-y-3">
              {schedule.map((day, idx) => (
                <div
                  key={day.day_of_week}
                  className={cn(
                    "flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-2xl border transition",
                    day.is_available ? "border-border bg-muted/20" : "border-border/40 bg-muted/5 opacity-60"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-[120px]">
                    <button
                      onClick={() => updateDay(idx, { is_available: !day.is_available })}
                      className={cn(
                        "h-5 w-9 rounded-full transition-colors relative",
                        day.is_available ? "bg-[#A8FF3E]" : "bg-muted"
                      )}
                    >
                      <span className={cn(
                        "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                        day.is_available ? "translate-x-4" : "translate-x-0.5"
                      )} />
                    </button>
                    <span className="font-medium text-sm w-20">{DAY_NAMES[day.day_of_week]}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-1">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <input
                      type="time"
                      value={day.start_time}
                      onChange={e => updateDay(idx, { start_time: e.target.value })}
                      disabled={!day.is_available}
                      className="bg-background border border-border rounded-lg px-2 py-1 text-sm font-mono w-28 disabled:opacity-40"
                    />
                    <span className="text-muted-foreground text-xs">to</span>
                    <input
                      type="time"
                      value={day.end_time}
                      onChange={e => updateDay(idx, { end_time: e.target.value })}
                      disabled={!day.is_available}
                      className="bg-background border border-border rounded-lg px-2 py-1 text-sm font-mono w-28 disabled:opacity-40"
                    />
                  </div>
                  {!day.is_available && (
                    <span className="text-xs text-muted-foreground italic">Unavailable</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Busy blocks */}
        <div className="surface-card p-6 rounded-3xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="label-eyebrow mb-0.5">One-off blocks</div>
              <h2 className="font-display text-xl font-bold">Busy Periods</h2>
              <p className="text-xs text-muted-foreground mt-1">Block out specific times when you're unavailable (e.g. training, leave).</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddBlock(v => !v)}
              className="gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" /> Add Block
            </Button>
          </div>

          {showAddBlock && (
            <div className="mb-6 rounded-2xl border border-border bg-muted/20 p-4 space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground font-medium">Start</label>
                  <input
                    type="datetime-local"
                    value={newBlock.start}
                    onChange={e => setNewBlock(b => ({ ...b, start: e.target.value }))}
                    className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground font-medium">End</label>
                  <input
                    type="datetime-local"
                    value={newBlock.end}
                    onChange={e => setNewBlock(b => ({ ...b, end: e.target.value }))}
                    className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-medium">Reason (optional)</label>
                <Input
                  placeholder="e.g. Training, Annual leave…"
                  value={newBlock.reason}
                  onChange={e => setNewBlock(b => ({ ...b, reason: e.target.value }))}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => setShowAddBlock(false)}>Cancel</Button>
                <Button
                  size="sm"
                  onClick={handleAddBlock}
                  disabled={addingBlock}
                  className="bg-[#A8FF3E] hover:bg-[#96e836] text-black font-semibold"
                >
                  {addingBlock ? <NeonSpinner size={14} className="mr-1.5" /> : null}
                  Add Block
                </Button>
              </div>
            </div>
          )}

          {blocksLoading ? (
            <div className="flex justify-center py-6">
              <NeonSpinner size={24} />
            </div>
          ) : busyBlocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
              <CalendarOff className="h-8 w-8 opacity-30" />
              <span className="text-sm">No busy blocks scheduled</span>
            </div>
          ) : (
            <div className="space-y-2">
              {busyBlocks.map(block => (
                <div key={block.id} className="flex items-center justify-between rounded-xl border border-border bg-muted/10 px-4 py-3">
                  <div>
                    <div className="text-sm font-medium">
                      {formatBlockTime(block.block_start)} → {formatBlockTime(block.block_end)}
                    </div>
                    {block.reason && (
                      <div className="text-xs text-muted-foreground mt-0.5">{block.reason}</div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0"
                    onClick={() => handleDeleteBlock(block.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
