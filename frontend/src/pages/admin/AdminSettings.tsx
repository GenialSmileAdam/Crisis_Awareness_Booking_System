import { useState } from "react";
import { AppShell } from "@/components/AppSidebar";
import { adminSidebarItems } from "@/data/sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/context/ThemeContext";
import { toast } from "sonner";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function AdminSettings() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const [prefs, setPrefs] = useState({
    redAlerts: true,
    weeklyDigest: true,
    smsAlerts: false,
    soundCues: true,
  });
  const update = (k: keyof typeof prefs) => {
    setPrefs((p) => {
      const next = { ...p, [k]: !p[k] };
      toast.success(`${k} ${next[k] ? "enabled" : "disabled"}`);
      return next;
    });
  };
  return (
    <AppShell items={adminSidebarItems}>
      <div className="flex items-start md:items-center justify-between py-4 md:h-16 px-4 md:px-8 border-b border-border bg-background/60 backdrop-blur-sm sticky top-0 z-30">
        <div className="flex-1">
          <h1 className="font-display text-xl md:text-2xl font-bold">Settings</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={() => { logout(); navigate("/login"); }} className="md:hidden rounded-full h-9 w-9">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="p-4 md:p-8 grid lg:grid-cols-2 gap-6">
        <div className="glass border border-border rounded-3xl p-6">
          <h2 className="font-display text-lg font-bold mb-4">Appearance</h2>
          <div className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/40">
            <div>
              <div className="font-medium text-sm">Dark mode</div>
              <div className="text-xs text-muted-foreground">Currently {theme}</div>
            </div>
            <Switch checked={theme === "dark"} onCheckedChange={toggle} />
          </div>
        </div>
        <div className="glass border border-border rounded-3xl p-6">
          <h2 className="font-display text-lg font-bold mb-4">Notifications</h2>
          <div className="space-y-1">
            {[
              ["redAlerts", "Red Tier alerts", "Get notified instantly when a student enters Red tier"],
              ["weeklyDigest", "Weekly digest", "Summary email every Monday morning"],
              ["smsAlerts", "SMS for crisis events", "Send text messages for life-threatening alerts"],
              ["soundCues", "Sound cues in dashboard", "Play a soft tone when new alerts arrive"],
            ].map(([k, t, d]) => (
              <div key={k} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/40">
                <div>
                  <div className="font-medium text-sm">{t}</div>
                  <div className="text-xs text-muted-foreground">{d}</div>
                </div>
                <Switch checked={prefs[k as keyof typeof prefs]} onCheckedChange={() => update(k as keyof typeof prefs)} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
