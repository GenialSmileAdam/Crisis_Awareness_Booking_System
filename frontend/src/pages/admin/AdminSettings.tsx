import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppSidebar";
import { adminSidebarItems } from "@/data/sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NeonSpinner } from "@/components/NeonSpinner";
import { useTheme } from "@/context/ThemeContext";
import { toast } from "sonner";
import { LogOut, Save, Activity, Bell, Users2, SlidersHorizontal } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { useAdminConfig, type AdminConfig } from "@/hooks/queries";
import { useUpdateConfig } from "@/hooks/mutations";

const TIERS = ["amber", "red", "critical"] as const;
const TIER_COLOR: Record<string, string> = {
  amber: "#FF8C42",
  red: "#FF4560",
  critical: "#B00020",
};
const WEIGHT_LABELS: Record<string, string> = {
  assessment: "PHQ-9 / GAD-7 assessment",
  pulse_trend: "Daily pulse trend",
  attendance: "Session attendance",
  completion_rate: "Completion rate",
  crisis_history: "Crisis history",
  session_freq: "Session frequency",
};
const STRATEGY_OPTIONS = [
  { value: "manual", label: "Manual", hint: "Admins assign students by hand (no auto-assignment)" },
  { value: "least_loaded", label: "Least loaded", hint: "Assign to the psychologist with the fewest students" },
  { value: "round_robin", label: "Round robin", hint: "Distribute evenly across psychologists" },
  { value: "by_faculty", label: "By faculty", hint: "Match the student's faculty, else least loaded" },
];

export default function AdminSettings() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();

  const { data: config, isLoading } = useAdminConfig();
  const { mutateAsync: updateConfig, isPending: saving } = useUpdateConfig();

  // Editable local draft, seeded from server config.
  const [draft, setDraft] = useState<AdminConfig | null>(null);
  useEffect(() => {
    if (config) setDraft(structuredClone(config));
  }, [config]);

  const dirty = draft && config && JSON.stringify(draft) !== JSON.stringify(config);

  const setThreshold = (tier: string, value: number) =>
    setDraft((d) => (d ? { ...d, wrs: { ...d.wrs, thresholds: { ...d.wrs.thresholds, [tier]: value } } } : d));
  const setWeight = (key: string, value: number) =>
    setDraft((d) => (d ? { ...d, wrs: { ...d.wrs, weights: { ...d.wrs.weights, [key]: value } } } : d));
  const setChannel = (key: string, value: boolean) =>
    setDraft((d) => (d ? { ...d, alerts: { ...d.alerts, channels: { ...d.alerts.channels, [key]: value } } } : d));
  const toggleNotifyTier = (tier: string) =>
    setDraft((d) => {
      if (!d) return d;
      const has = d.alerts.notify_tiers.includes(tier);
      const notify_tiers = has
        ? d.alerts.notify_tiers.filter((t) => t !== tier)
        : [...d.alerts.notify_tiers, tier];
      return { ...d, alerts: { ...d.alerts, notify_tiers } };
    });

  const handleSave = async () => {
    if (!draft) return;
    const { amber, red, critical } = draft.wrs.thresholds;
    if (!(amber < red && red < critical)) {
      toast.error("Thresholds must increase: amber < red < critical");
      return;
    }
    if ([amber, red, critical].some((v) => v < 0 || v > 100)) {
      toast.error("Thresholds must be between 0 and 100");
      return;
    }
    try {
      await updateConfig({ wrs: draft.wrs, alerts: draft.alerts, assignment: draft.assignment });
      toast.success("Settings saved — applied across the system");
    } catch {
      toast.error("Failed to save settings");
    }
  };

  return (
    <AppShell items={adminSidebarItems}>
      <div className="flex items-start md:items-center justify-between py-4 md:h-16 px-4 md:px-8 border-b border-border bg-background/60 backdrop-blur-sm sticky top-0 z-30">
        <div className="flex-1">
          <h1 className="font-display text-xl md:text-2xl font-bold">Settings</h1>
          <p className="text-xs text-muted-foreground">System-wide configuration — changes apply everywhere</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {dirty && (
            <Button onClick={handleSave} disabled={saving} size="sm" className="gradient-primary text-primary-foreground border-0 gap-1.5">
              {saving ? <NeonSpinner size={14} /> : <Save className="h-3.5 w-3.5" />}
              {saving ? "Saving…" : "Save changes"}
            </Button>
          )}
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={() => { logout(); navigate("/login"); }} className="md:hidden rounded-full h-9 w-9">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading || !draft ? (
        <div className="flex items-center justify-center min-h-[60vh]"><NeonSpinner size={40} /></div>
      ) : (
        <div className="p-4 md:p-8 grid lg:grid-cols-2 gap-6 max-w-6xl">

          {/* ── WRS thresholds & weights ── */}
          <div className="glass border border-border rounded-3xl p-6 lg:col-span-2">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-5 w-5 text-primary" />
              <h2 className="font-display text-lg font-bold">Wellness Risk Score</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Tier boundaries on the 0–100 scale. These drive scoring, dashboards, and alerts everywhere.
            </p>
            <div className="grid sm:grid-cols-3 gap-4 mb-6">
              {TIERS.map((tier) => (
                <div key={tier}>
                  <Label className="text-xs capitalize flex items-center gap-1.5 mb-1">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: TIER_COLOR[tier] }} />
                    {tier} ≥
                  </Label>
                  <Input
                    type="number" min={0} max={100}
                    value={draft.wrs.thresholds[tier as keyof typeof draft.wrs.thresholds]}
                    onChange={(e) => setThreshold(tier, Number(e.target.value))}
                  />
                </div>
              ))}
            </div>

            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Risk factor weights (session WRS)
            </div>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
              {Object.keys(draft.wrs.weights).map((key) => (
                <div key={key} className="flex items-center gap-3">
                  <Label className="text-xs flex-1">{WEIGHT_LABELS[key] ?? key}</Label>
                  <Input
                    type="number" min={0} max={1} step={0.05}
                    className="w-24"
                    value={draft.wrs.weights[key]}
                    onChange={(e) => setWeight(key, Number(e.target.value))}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* ── Alerts & escalation ── */}
          <div className="glass border border-border rounded-3xl p-6">
            <div className="flex items-center gap-2 mb-1">
              <Bell className="h-5 w-5 text-primary" />
              <h2 className="font-display text-lg font-bold">Alerts & Escalation</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Who gets notified, through which channels.</p>

            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Channels</div>
            <div className="space-y-1 mb-4">
              {([["in_app", "In-app"], ["email", "Email"], ["campus_one", "Campus One push"], ["sms", "SMS (crisis only)"]] as const).map(([k, label]) => (
                <div key={k} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-muted/40">
                  <span className="text-sm">{label}</span>
                  <Switch
                    checked={draft.alerts.channels[k as keyof typeof draft.alerts.channels]}
                    onCheckedChange={(v) => setChannel(k, v)}
                  />
                </div>
              ))}
            </div>

            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Alert on tiers</div>
            <div className="flex gap-2 mb-4">
              {TIERS.map((tier) => {
                const active = draft.alerts.notify_tiers.includes(tier);
                return (
                  <button
                    key={tier}
                    onClick={() => toggleNotifyTier(tier)}
                    className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold border capitalize transition", active ? "border-2" : "border-border opacity-50 hover:opacity-100")}
                    style={active ? { borderColor: TIER_COLOR[tier], color: TIER_COLOR[tier], backgroundColor: `${TIER_COLOR[tier]}15` } : {}}
                  >
                    {tier}
                  </button>
                );
              })}
            </div>

            <div>
              <Label className="text-xs mb-1 block">Crisis escalation after (minutes)</Label>
              <Input
                type="number" min={1} className="w-32"
                value={draft.alerts.crisis_escalation_minutes}
                onChange={(e) => setDraft((d) => d ? { ...d, alerts: { ...d.alerts, crisis_escalation_minutes: Number(e.target.value) } } : d)}
              />
            </div>
          </div>

          {/* ── Auto-assignment ── */}
          <div className="glass border border-border rounded-3xl p-6">
            <div className="flex items-center gap-2 mb-1">
              <Users2 className="h-5 w-5 text-primary" />
              <h2 className="font-display text-lg font-bold">Student Assignment</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">How new students are routed to psychologists.</p>

            <div className="space-y-2 mb-4">
              {STRATEGY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setDraft((d) => d ? { ...d, assignment: { ...d.assignment, strategy: opt.value as AdminConfig["assignment"]["strategy"] } } : d)}
                  className={cn(
                    "w-full text-left p-3 rounded-xl border transition",
                    draft.assignment.strategy === opt.value ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
                  )}
                >
                  <div className="text-sm font-medium">{opt.label}</div>
                  <div className="text-xs text-muted-foreground">{opt.hint}</div>
                </button>
              ))}
            </div>

            <div>
              <Label className="text-xs mb-1 block">Caseload cap per psychologist</Label>
              <Input
                type="number" min={1} className="w-32"
                value={draft.assignment.caseload_cap}
                onChange={(e) => setDraft((d) => d ? { ...d, assignment: { ...d.assignment, caseload_cap: Number(e.target.value) } } : d)}
              />
            </div>
          </div>

          {/* ── Appearance ── */}
          <div className="glass border border-border rounded-3xl p-6 lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <SlidersHorizontal className="h-5 w-5 text-primary" />
              <h2 className="font-display text-lg font-bold">Appearance</h2>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/40">
              <div>
                <div className="font-medium text-sm">Dark mode</div>
                <div className="text-xs text-muted-foreground">Currently {theme}</div>
              </div>
              <Switch checked={theme === "dark"} onCheckedChange={toggle} />
            </div>
          </div>

        </div>
      )}
    </AppShell>
  );
}
