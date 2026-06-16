import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  User, Bell, Palette, ShieldCheck, LifeBuoy, LogOut, Save, Sun, Moon,
  Plus, Trash2, Clock,
} from "lucide-react";
import { AppShell } from "@/components/AppSidebar";
import { studentSidebarItems } from "@/data/sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { toast } from "sonner";
import { apiRequest } from "@/api/client";
import { useQuery } from "@tanstack/react-query";
import {
  usePreferences, useMySafetyPlan, type StudentPreferences,
} from "@/hooks/queries";
import { useUpdatePreferences, useSaveSafetyPlan, useSubmitConsent } from "@/hooks/mutations";

function Section({ icon: Icon, title, desc, children }: { icon: any; title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="surface-card p-5 md:p-6 bg-card">
      <div className="flex items-start gap-3 mb-5">
        <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div>
          <h2 className="font-display font-bold">{title}</h2>
          {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function ToggleRow({ label, desc, checked, onChange }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 border-b border-border/50 last:border-0">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {desc && <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

const TEXT_SIZES: { value: StudentPreferences["appearance"]["text_size"]; label: string }[] = [
  { value: "sm", label: "Small" },
  { value: "base", label: "Default" },
  { value: "lg", label: "Large" },
];

export default function StudentSettings() {
  const { user, logout } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const navigate = useNavigate();
  const studentId = user?.student_id;

  const { data: serverPrefs } = usePreferences();
  const { data: serverPlan } = useMySafetyPlan();
  const updatePrefs = useUpdatePreferences();
  const savePlan = useSaveSafetyPlan();
  const submitConsent = useSubmitConsent();

  // Consent (read current value)
  const { data: consent } = useQuery({
    queryKey: ["consent", studentId],
    queryFn: async () => apiRequest<{ monitoring_enabled: boolean }>("GET", `/consent/${studentId}`),
    enabled: !!studentId,
    retry: 0,
  });

  // ── Preferences draft (explicit save) ──
  const [prefs, setPrefs] = useState<StudentPreferences | null>(null);
  useEffect(() => { if (serverPrefs) setPrefs(serverPrefs); }, [serverPrefs]);
  const prefsDirty = !!prefs && !!serverPrefs && JSON.stringify(prefs) !== JSON.stringify(serverPrefs);

  // ── Safety plan draft ──
  const [plan, setPlan] = useState<{ warning_signs: string; coping_strategies: string; reasons_to_live: string; support_contacts: { name?: string; phone?: string }[] }>({
    warning_signs: "", coping_strategies: "", reasons_to_live: "", support_contacts: [],
  });
  useEffect(() => {
    setPlan({
      warning_signs: serverPlan?.warning_signs ?? "",
      coping_strategies: serverPlan?.coping_strategies ?? "",
      reasons_to_live: serverPlan?.reasons_to_live ?? "",
      support_contacts: serverPlan?.support_contacts ?? [],
    });
  }, [serverPlan]);

  const setNotif = (k: keyof StudentPreferences["notifications"], v: boolean) =>
    setPrefs((p) => (p ? { ...p, notifications: { ...p.notifications, [k]: v } } : p));
  const setAppearance = (patch: Partial<StudentPreferences["appearance"]>) =>
    setPrefs((p) => (p ? { ...p, appearance: { ...p.appearance, ...patch } } : p));

  const savePrefs = () => {
    if (!prefs) return;
    updatePrefs.mutate(
      { notifications: prefs.notifications, reminder_time: prefs.reminder_time, appearance: prefs.appearance },
      { onSuccess: () => toast.success("Preferences saved"), onError: () => toast.error("Failed to save preferences") }
    );
  };

  const onSavePlan = () => {
    savePlan.mutate(
      { ...plan, support_contacts: plan.support_contacts.filter((c) => c.name || c.phone) },
      { onSuccess: () => toast.success("Safety plan saved"), onError: () => toast.error("Failed to save safety plan") }
    );
  };

  const onToggleConsent = (v: boolean) => {
    submitConsent.mutate(v, {
      onSuccess: () => toast.success(v ? "Wellness monitoring enabled" : "Wellness monitoring disabled"),
      onError: () => toast.error("Failed to update consent"),
    });
  };

  return (
    <AppShell items={studentSidebarItems}>
      <div className="flex items-center justify-between py-4 md:h-16 px-4 md:px-8 border-b border-border bg-background md:bg-background/60 md:backdrop-blur-sm sticky top-0 z-30">
        <div>
          <h1 className="font-display text-xl md:text-2xl font-bold">Settings</h1>
          <p className="text-xs text-muted-foreground">Manage your profile, reminders, appearance & privacy</p>
        </div>
        <ThemeToggle />
      </div>

      <div className="p-4 md:p-8 space-y-6 max-w-3xl">
        {/* Profile */}
        <Section icon={User} title="Profile" desc="Your account details">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Name</div>
              <div className="font-medium">{user?.name || "—"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Student ID</div>
              <div className="font-medium font-mono">{studentId || "—"}</div>
            </div>
          </div>
          <div className="mt-5 pt-4 border-t border-border/50">
            <Button variant="outline" size="sm" onClick={() => { logout(); navigate("/login"); }} className="text-destructive">
              <LogOut className="h-3.5 w-3.5 mr-1.5" /> Sign out
            </Button>
          </div>
        </Section>

        {/* Notifications & reminders */}
        <Section icon={Bell} title="Notifications & Reminders" desc="Choose what we notify you about">
          {prefs ? (
            <>
              <ToggleRow label="Check-in reminders" desc="A nudge to complete your daily check-in" checked={prefs.notifications.checkin_reminders} onChange={(v) => setNotif("checkin_reminders", v)} />
              <ToggleRow label="Appointment reminders" desc="Reminders before your booked sessions" checked={prefs.notifications.appointment_reminders} onChange={(v) => setNotif("appointment_reminders", v)} />
              <ToggleRow label="Forum replies" desc="When someone replies to your posts" checked={prefs.notifications.forum_replies} onChange={(v) => setNotif("forum_replies", v)} />
              <ToggleRow label="Resources shared with you" desc="When your counselor shares a resource" checked={prefs.notifications.resource_shares} onChange={(v) => setNotif("resource_shares", v)} />
              <div className="flex items-center justify-between gap-4 py-3 mt-1">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div className="text-sm font-medium">Preferred check-in time</div>
                </div>
                <Input type="time" value={prefs.reminder_time} onChange={(e) => setPrefs((p) => (p ? { ...p, reminder_time: e.target.value } : p))} className="w-32" />
              </div>
            </>
          ) : (
            <div className="h-24 bg-muted/30 rounded-lg animate-pulse" />
          )}
        </Section>

        {/* Appearance */}
        <Section icon={Palette} title="Appearance" desc="Make SafeSpace comfortable for you">
          <div className="flex items-center justify-between gap-4 py-2.5 border-b border-border/50">
            <div>
              <div className="text-sm font-medium">Theme</div>
              <div className="text-xs text-muted-foreground mt-0.5">Light or dark mode</div>
            </div>
            <Button variant="outline" size="sm" onClick={toggleTheme} className="gap-1.5">
              {theme === "dark" ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
              {theme === "dark" ? "Dark" : "Light"}
            </Button>
          </div>
          {prefs && (
            <>
              <ToggleRow label="Reduce motion" desc="Minimize animations and transitions" checked={prefs.appearance.reduced_motion} onChange={(v) => setAppearance({ reduced_motion: v })} />
              <div className="flex items-center justify-between gap-4 py-3">
                <div className="text-sm font-medium">Text size</div>
                <div className="flex gap-1 p-1 rounded-full bg-muted">
                  {TEXT_SIZES.map((s) => (
                    <button key={s.value} onClick={() => setAppearance({ text_size: s.value })}
                      className={`px-3 py-1 text-xs font-semibold rounded-full transition ${prefs.appearance.text_size === s.value ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </Section>

        {prefsDirty && (
          <div className="sticky bottom-4 z-20 flex justify-end">
            <Button onClick={savePrefs} disabled={updatePrefs.isPending} className="gradient-primary text-primary-foreground border-0 shadow-lg">
              <Save className="h-4 w-4 mr-1.5" /> {updatePrefs.isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        )}

        {/* Privacy & consent */}
        <Section icon={ShieldCheck} title="Privacy & Consent" desc="Control how your wellness data is used">
          <ToggleRow
            label="Wellness monitoring"
            desc="Allow your check-ins to contribute to anonymous campus trends and crisis detection"
            checked={consent?.monitoring_enabled ?? true}
            onChange={onToggleConsent}
          />
          <div className="mt-3 text-xs text-muted-foreground">
            Your assigned psychologist can always view your profile and history to provide care. See the{" "}
            <button onClick={() => navigate("/student/consent")} className="text-primary hover:underline">full privacy details</button>.
          </div>
        </Section>

        {/* Safety plan */}
        <Section icon={LifeBuoy} title="My Safety Plan" desc="A private plan for tough moments — your counselor can see this too">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Warning signs (thoughts, feelings, situations)</label>
              <Textarea rows={2} value={plan.warning_signs} onChange={(e) => setPlan((p) => ({ ...p, warning_signs: e.target.value }))} placeholder="e.g. trouble sleeping, withdrawing from friends" className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Coping strategies that help me</label>
              <Textarea rows={2} value={plan.coping_strategies} onChange={(e) => setPlan((p) => ({ ...p, coping_strategies: e.target.value }))} placeholder="e.g. breathing exercises, going for a walk, music" className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Reasons to keep going</label>
              <Textarea rows={2} value={plan.reasons_to_live} onChange={(e) => setPlan((p) => ({ ...p, reasons_to_live: e.target.value }))} placeholder="People, goals, things that matter to me" className="mt-1" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-muted-foreground">Support contacts</label>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setPlan((p) => ({ ...p, support_contacts: [...p.support_contacts, { name: "", phone: "" }] }))}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add
                </Button>
              </div>
              <div className="space-y-2">
                {plan.support_contacts.length === 0 && <div className="text-xs text-muted-foreground">No contacts yet.</div>}
                {plan.support_contacts.map((c, i) => (
                  <div key={i} className="flex gap-2">
                    <Input placeholder="Name" value={c.name ?? ""} onChange={(e) => setPlan((p) => ({ ...p, support_contacts: p.support_contacts.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) }))} />
                    <Input placeholder="Phone" value={c.phone ?? ""} onChange={(e) => setPlan((p) => ({ ...p, support_contacts: p.support_contacts.map((x, j) => (j === i ? { ...x, phone: e.target.value } : x)) }))} />
                    <Button variant="ghost" size="icon" className="shrink-0 text-destructive" onClick={() => setPlan((p) => ({ ...p, support_contacts: p.support_contacts.filter((_, j) => j !== i) }))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            <Button onClick={onSavePlan} disabled={savePlan.isPending} className="gradient-primary text-primary-foreground border-0">
              <Save className="h-4 w-4 mr-1.5" /> {savePlan.isPending ? "Saving…" : "Save safety plan"}
            </Button>
          </div>
        </Section>
      </div>
    </AppShell>
  );
}
