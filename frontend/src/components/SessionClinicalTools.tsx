import { useState } from "react";
import {
  ListChecks, Target, ShieldCheck, Share2, CalendarPlus, Sparkles,
  Plus, Check, X, Send, ArrowUpRight, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  useCarePlans, useSafetyPlan, useActionItems, useReferrals,
} from "@/hooks/queries";
import {
  useCreateCarePlan, useUpdateCarePlan, useUpsertSafetyPlan,
  useCreateActionItem, useUpdateActionItem, useSuggestActionItems,
  useCreateReferral, useUpdateReferral, useShareResource, useScheduleFollowUp,
} from "@/hooks/mutations";

type Tab = "actions" | "care" | "safety" | "referrals";

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: "actions", label: "Action Items", icon: ListChecks },
  { id: "care", label: "Care Plan", icon: Target },
  { id: "safety", label: "Safety Plan", icon: ShieldCheck },
  { id: "referrals", label: "Referrals", icon: ArrowUpRight },
];

export function SessionClinicalTools({
  studentId, sessionId, studentName,
}: { studentId: string; sessionId: string | null; studentName: string }) {
  const [tab, setTab] = useState<Tab>("actions");

  return (
    <div className="glass border border-border rounded-3xl p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <div>
          <h2 className="font-display text-lg font-bold">Clinical Toolkit</h2>
          <p className="text-xs text-muted-foreground">Care plans, safety planning, action items & referrals — all persisted to {studentName}'s record</p>
        </div>
      </div>

      <QuickActions studentId={studentId} sessionId={sessionId} studentName={studentName} />

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/40 p-1 rounded-xl w-full sm:w-fit overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 whitespace-nowrap",
              tab === id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>

      {tab === "actions" && <ActionItemsTab sessionId={sessionId} studentId={studentId} />}
      {tab === "care" && <CarePlanTab studentId={studentId} />}
      {tab === "safety" && <SafetyPlanTab studentId={studentId} />}
      {tab === "referrals" && <ReferralsTab studentId={studentId} sessionId={sessionId} />}
    </div>
  );
}

// ── Quick actions: share resource + schedule follow-up ──
function QuickActions({ studentId, sessionId, studentName }: { studentId: string; sessionId: string | null; studentName: string }) {
  const [panel, setPanel] = useState<"none" | "resource" | "followup">("none");
  const [resTitle, setResTitle] = useState("");
  const [resUrl, setResUrl] = useState("");
  const [fuTitle, setFuTitle] = useState("Follow-up session");
  const [fuDate, setFuDate] = useState("");

  const share = useShareResource();
  const followUp = useScheduleFollowUp();

  const doShare = async () => {
    if (!resTitle.trim()) return toast.error("Add a resource title");
    try {
      await share.mutateAsync({ studentId, title: resTitle.trim(), url: resUrl.trim() || undefined });
      toast.success(`Shared with ${studentName} — they'll get a Campus One notification`);
      setResTitle(""); setResUrl(""); setPanel("none");
    } catch { toast.error("Failed to share resource"); }
  };

  const doFollowUp = async () => {
    if (!fuDate) return toast.error("Pick a date & time");
    try {
      await followUp.mutateAsync({
        studentId, title: fuTitle.trim() || "Follow-up session",
        starts_at: new Date(fuDate).toISOString(),
        session_id: sessionId || undefined,
      });
      toast.success(`Follow-up scheduled — calendar event pushed to ${studentName}`);
      setFuDate(""); setPanel("none");
    } catch { toast.error("Failed to schedule follow-up"); }
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={panel === "resource" ? "default" : "outline"} className="gap-1.5 text-xs"
          onClick={() => setPanel(panel === "resource" ? "none" : "resource")}>
          <Share2 className="h-3.5 w-3.5" /> Share resource
        </Button>
        <Button size="sm" variant={panel === "followup" ? "default" : "outline"} className="gap-1.5 text-xs"
          onClick={() => setPanel(panel === "followup" ? "none" : "followup")}>
          <CalendarPlus className="h-3.5 w-3.5" /> Schedule follow-up
        </Button>
      </div>

      {panel === "resource" && (
        <div className="mt-3 space-y-2">
          <Input placeholder="Resource title (e.g. Grounding exercises)" value={resTitle} onChange={(e) => setResTitle(e.target.value)} />
          <Input placeholder="Link (optional)" value={resUrl} onChange={(e) => setResUrl(e.target.value)} />
          <Button size="sm" onClick={doShare} disabled={share.isPending} className="gap-1.5">
            {share.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Send to student
          </Button>
        </div>
      )}
      {panel === "followup" && (
        <div className="mt-3 space-y-2">
          <Input placeholder="Title" value={fuTitle} onChange={(e) => setFuTitle(e.target.value)} />
          <Input type="datetime-local" value={fuDate} onChange={(e) => setFuDate(e.target.value)} />
          <Button size="sm" onClick={doFollowUp} disabled={followUp.isPending} className="gap-1.5">
            {followUp.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CalendarPlus className="h-3.5 w-3.5" />} Schedule & notify
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Action items ──
function ActionItemsTab({ sessionId, studentId }: { sessionId: string | null; studentId: string }) {
  const { data: items = [] } = useActionItems(sessionId);
  const create = useCreateActionItem();
  const update = useUpdateActionItem();
  const suggest = useSuggestActionItems();
  const [text, setText] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);

  if (!sessionId) {
    return <p className="text-sm text-muted-foreground py-6 text-center">Start the AI session reviewer first to attach action items.</p>;
  }

  const add = async (value: string, source = "manual") => {
    if (!value.trim()) return;
    await create.mutateAsync({ sessionId, text: value.trim(), student_id: studentId, source });
    setText("");
  };

  const runSuggest = async () => {
    try {
      const result = await suggest.mutateAsync(sessionId);
      if (result.length === 0) toast.info("No suggestions — generate a summary first");
      setSuggestions(result);
    } catch { toast.error("AI suggestion failed"); }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input placeholder="Add an action item…" value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") add(text); }} />
        <Button size="sm" onClick={() => add(text)} disabled={create.isPending} className="gap-1 shrink-0">
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
        <Button size="sm" variant="outline" onClick={runSuggest} disabled={suggest.isPending} className="gap-1 shrink-0">
          {suggest.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} AI suggest
        </Button>
      </div>

      {suggestions.length > 0 && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-1.5">
          <div className="text-xs font-semibold text-primary">AI suggestions — click to add</div>
          {suggestions.map((s, i) => (
            <button key={i} onClick={() => { add(s, "ai"); setSuggestions((p) => p.filter((_, j) => j !== i)); }}
              className="block w-full text-left text-sm px-2 py-1.5 rounded-lg hover:bg-primary/10 transition">
              <Plus className="h-3 w-3 inline mr-1.5 text-primary" />{s}
            </button>
          ))}
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">No action items yet.</p>
      ) : (
        <div className="space-y-1.5">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border/60 hover:bg-muted/20">
              <button onClick={() => update.mutate({ itemId: item.id, done: !item.done })}
                className={cn("h-5 w-5 rounded-md border flex items-center justify-center shrink-0 transition",
                  item.done ? "bg-emerald-500 border-emerald-500 text-white" : "border-border")}>
                {item.done && <Check className="h-3 w-3" />}
              </button>
              <span className={cn("text-sm flex-1", item.done && "line-through text-muted-foreground")}>{item.text}</span>
              {item.source === "ai" && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">AI</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Care plan ──
function CarePlanTab({ studentId }: { studentId: string }) {
  const { data: plans = [] } = useCarePlans(studentId);
  const create = useCreateCarePlan();
  const update = useUpdateCarePlan();
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [goalText, setGoalText] = useState("");
  const [goals, setGoals] = useState<{ text: string; done: boolean }[]>([]);

  const save = async () => {
    if (!title.trim()) return toast.error("Add a plan title");
    await create.mutateAsync({ studentId, title: title.trim(), goals });
    setTitle(""); setGoals([]); setCreating(false);
    toast.success("Care plan created");
  };

  const toggleGoal = (plan: typeof plans[number], idx: number) => {
    const next = plan.goals.map((g, i) => i === idx ? { ...g, done: !g.done } : g);
    update.mutate({ planId: plan.id, goals: next });
  };

  return (
    <div className="space-y-3">
      {!creating ? (
        <Button size="sm" variant="outline" onClick={() => setCreating(true)} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> New care plan
        </Button>
      ) : (
        <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
          <Input placeholder="Plan title (e.g. Anxiety management Q3)" value={title} onChange={(e) => setTitle(e.target.value)} />
          <div className="flex gap-2">
            <Input placeholder="Add a goal…" value={goalText} onChange={(e) => setGoalText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && goalText.trim()) { setGoals([...goals, { text: goalText.trim(), done: false }]); setGoalText(""); } }} />
            <Button size="sm" variant="outline" className="shrink-0"
              onClick={() => { if (goalText.trim()) { setGoals([...goals, { text: goalText.trim(), done: false }]); setGoalText(""); } }}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          {goals.map((g, i) => (
            <div key={i} className="flex items-center gap-2 text-sm pl-1">
              <Target className="h-3 w-3 text-muted-foreground" /> {g.text}
              <button onClick={() => setGoals(goals.filter((_, j) => j !== i))} className="ml-auto text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>
            </div>
          ))}
          <div className="flex gap-2">
            <Button size="sm" onClick={save} disabled={create.isPending}>Save plan</Button>
            <Button size="sm" variant="ghost" onClick={() => { setCreating(false); setGoals([]); setTitle(""); }}>Cancel</Button>
          </div>
        </div>
      )}

      {plans.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">No care plans yet.</p>
      ) : plans.map((plan) => (
        <div key={plan.id} className="rounded-xl border border-border/60 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="font-medium text-sm">{plan.title}</div>
            <button
              onClick={() => update.mutate({ planId: plan.id, status: plan.status === "active" ? "closed" : "active" })}
              className={cn("text-[10px] px-2 py-0.5 rounded-full font-semibold",
                plan.status === "active" ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground")}>
              {plan.status}
            </button>
          </div>
          {plan.goals.map((g, i) => (
            <button key={i} onClick={() => toggleGoal(plan, i)} className="flex items-center gap-2 text-sm w-full text-left">
              <span className={cn("h-4 w-4 rounded border flex items-center justify-center shrink-0",
                g.done ? "bg-emerald-500 border-emerald-500 text-white" : "border-border")}>
                {g.done && <Check className="h-2.5 w-2.5" />}
              </span>
              <span className={cn(g.done && "line-through text-muted-foreground")}>{g.text}</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Safety plan ──
function SafetyPlanTab({ studentId }: { studentId: string }) {
  const { data: plan } = useSafetyPlan(studentId);
  const upsert = useUpsertSafetyPlan();
  const [warning, setWarning] = useState<string | null>(null);
  const [coping, setCoping] = useState<string | null>(null);
  const [reasons, setReasons] = useState<string | null>(null);

  // Controlled fields fall back to the loaded plan until edited.
  const warningVal = warning ?? plan?.warning_signs ?? "";
  const copingVal = coping ?? plan?.coping_strategies ?? "";
  const reasonsVal = reasons ?? plan?.reasons_to_live ?? "";

  const save = async () => {
    await upsert.mutateAsync({
      studentId,
      warning_signs: warningVal,
      coping_strategies: copingVal,
      reasons_to_live: reasonsVal,
    });
    toast.success("Safety plan saved");
    setWarning(null); setCoping(null); setReasons(null);
  };

  const fields = [
    { label: "Warning signs", value: warningVal, set: setWarning, ph: "Thoughts, moods, situations that precede a crisis…" },
    { label: "Coping strategies", value: copingVal, set: setCoping, ph: "Things the student can do on their own to feel safer…" },
    { label: "Reasons to live / protective factors", value: reasonsVal, set: setReasons, ph: "People, goals, values worth staying safe for…" },
  ];

  return (
    <div className="space-y-3">
      {fields.map((f) => (
        <div key={f.label}>
          <Label className="text-xs mb-1 block">{f.label}</Label>
          <Textarea rows={3} value={f.value} placeholder={f.ph} onChange={(e) => f.set(e.target.value)} className="resize-none text-sm" />
        </div>
      ))}
      <Button size="sm" onClick={save} disabled={upsert.isPending} className="gap-1.5">
        {upsert.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />} Save safety plan
      </Button>
    </div>
  );
}

// ── Referrals ──
function ReferralsTab({ studentId, sessionId }: { studentId: string; sessionId: string | null }) {
  const { data: referrals = [] } = useReferrals(studentId);
  const create = useCreateReferral();
  const update = useUpdateReferral();
  const [to, setTo] = useState("");
  const [reason, setReason] = useState("");

  const add = async () => {
    if (!to.trim()) return toast.error("Who is this referral to?");
    await create.mutateAsync({ studentId, referred_to: to.trim(), reason: reason.trim() || undefined, session_id: sessionId || undefined });
    setTo(""); setReason("");
    toast.success("Referral created");
  };

  const STATUS_COLORS: Record<string, string> = {
    open: "bg-amber-500/15 text-amber-600",
    accepted: "bg-blue-500/15 text-blue-600",
    completed: "bg-emerald-500/15 text-emerald-600",
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
        <Input placeholder="Refer to (e.g. Psychiatry clinic, Academic advisor)" value={to} onChange={(e) => setTo(e.target.value)} />
        <Input placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
        <Button size="sm" onClick={add} disabled={create.isPending} className="gap-1.5">
          <ArrowUpRight className="h-3.5 w-3.5" /> Create referral
        </Button>
      </div>

      {referrals.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">No referrals yet.</p>
      ) : referrals.map((r) => (
        <div key={r.id} className="rounded-xl border border-border/60 p-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">{r.referred_to}</div>
            {r.reason && <div className="text-xs text-muted-foreground truncate">{r.reason}</div>}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {["open", "accepted", "completed"].map((s) => (
              <button key={s} onClick={() => update.mutate({ referralId: r.id, status: s })}
                className={cn("text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize transition",
                  r.status === s ? STATUS_COLORS[s] : "bg-muted/50 text-muted-foreground opacity-60 hover:opacity-100")}>
                {s}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
