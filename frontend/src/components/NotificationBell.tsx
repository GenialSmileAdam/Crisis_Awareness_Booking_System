import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotifications } from "@/hooks/queries";
import { cn } from "@/lib/utils";

function categoryLabel(category: string): string {
  switch (category) {
    case "crisis_alert": return "Crisis alert";
    case "appointment_confirmed": return "Appointment confirmed";
    case "appointment_reminder": return "Appointment reminder";
    case "session_reviewed": return "Session reviewed";
    case "risk_escalation": return "Risk escalation";
    default: return category.replace(/_/g, " ");
  }
}

export function NotificationBell() {
  const { data, isLoading } = useNotifications(8);
  const notifications = data?.data || [];
  const hasNew = notifications.some(n => n.status === "pending");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full relative">
          <Bell className="h-4 w-4" />
          {hasNew && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {notifications.length > 0 && (
            <span className="text-xs text-muted-foreground font-normal">{data?.pagination?.total} total</span>
          )}
        </DropdownMenuLabel>
        {isLoading ? (
          <div className="px-3 py-4 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-8 rounded-md bg-muted animate-pulse" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            No notifications yet.
          </div>
        ) : (
          notifications.map(n => (
            <DropdownMenuItem key={n.id} className="flex-col items-start py-3 gap-0.5">
              <div className={cn("text-sm font-medium", n.status === "pending" && "text-foreground")}>
                {categoryLabel(n.category)}
              </div>
              <div className="text-xs text-muted-foreground line-clamp-2">{n.message}</div>
              {n.created_at && (
                <div className="text-xs text-muted-foreground/60 mt-1">
                  {new Date(n.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </div>
              )}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
