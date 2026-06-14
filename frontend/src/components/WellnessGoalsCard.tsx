import { useState } from "react";
import { Flame, Target, Plus, Check, Trash2, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWellnessGoals, useCheckinStreak } from "@/hooks/queries";
import { useCreateGoal, useUpdateGoal, useDeleteGoal } from "@/hooks/mutations";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function WellnessGoalsCard() {
  const { data: goals = [], isLoading } = useWellnessGoals();
  const { data: streak } = useCheckinStreak();
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();

  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");

  const submit = () => {
    if (!title.trim()) return toast.error("Give your goal a name");
    createGoal.mutate(
      { title: title.trim(), target: target ? parseInt(target, 10) : 0 },
      {
        onSuccess: () => { setTitle(""); setTarget(""); setAdding(false); },
        onError: () => toast.error("Failed to add goal"),
      }
    );
  };

  const active = goals.filter((g) => g.status === "active");
  const done = goals.filter((g) => g.status === "done");

  return (
    <div className="surface-card surface-card-hover p-5 bg-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-bold flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> Wellness Goals</h3>
        {/* Streak */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-500" title="Consecutive days you've checked in">
          <Flame className="h-3.5 w-3.5" />
          <span className="text-xs font-bold tabular-nums">{streak?.current ?? 0}</span>
          <span className="text-[10px] font-medium opacity-80">day streak</span>
        </div>
      </div>

      {streak && (streak.longest > 0 || streak.total_days > 0) && (
        <div className="flex gap-4 mb-4 text-[11px] text-muted-foreground">
          <span>Best: <b className="text-foreground">{streak.longest}</b> days</span>
          <span>Total check-in days: <b className="text-foreground">{streak.total_days}</b></span>
          {streak.checked_in_today && <span className="text-primary font-medium flex items-center gap-1"><Check className="h-3 w-3" /> Today done</span>}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-9 bg-muted/40 rounded-lg animate-pulse" />)}</div>
      ) : (
        <div className="space-y-2">
          {active.length === 0 && !adding && (
            <p className="text-xs text-muted-foreground py-2">No active goals yet. Set one to build a healthy habit.</p>
          )}
          {active.map((g) => {
            const hasTarget = g.target > 0;
            const pct = hasTarget ? Math.min(100, Math.round((g.progress / g.target) * 100)) : 0;
            return (
              <div key={g.id} className="rounded-lg border border-border bg-muted/20 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium truncate">{g.title}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    {hasTarget ? (
                      <>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateGoal.mutate({ id: g.id, progress: Math.max(0, g.progress - 1) })}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-xs tabular-nums w-10 text-center text-muted-foreground">{g.progress}/{g.target}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateGoal.mutate({ id: g.id, progress: g.progress + 1 })}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </>
                    ) : (
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-primary" title="Mark done" onClick={() => updateGoal.mutate({ id: g.id, status: "done" })}>
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteGoal.mutate(g.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {hasTarget && (
                  <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                )}
              </div>
            );
          })}

          {adding ? (
            <div className="flex gap-2 pt-1">
              <Input autoFocus placeholder="Goal (e.g. Meditate)" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} className="h-9 text-sm" />
              <Input placeholder="Target #" value={target} onChange={(e) => setTarget(e.target.value.replace(/\D/g, ""))} className="h-9 w-20 text-sm" />
              <Button size="sm" className="h-9 gradient-primary text-primary-foreground border-0" onClick={submit} disabled={createGoal.isPending}>Add</Button>
            </div>
          ) : (
            <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 text-xs text-primary hover:underline pt-1">
              <Plus className="h-3.5 w-3.5" /> Add a goal
            </button>
          )}

          {done.length > 0 && (
            <div className="pt-2 mt-1 border-t border-border/50">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Completed</div>
              <div className="flex flex-wrap gap-1.5">
                {done.slice(0, 6).map((g) => (
                  <span key={g.id} className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium", "bg-primary/10 text-primary")}>
                    <Check className="h-3 w-3" /> {g.title}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
