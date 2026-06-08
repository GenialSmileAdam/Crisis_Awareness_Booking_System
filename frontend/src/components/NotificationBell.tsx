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
    case "booking_confirmation": return "Session confirmed";
    case "appointment_requested": return "Session request";
    case "appointment_rejected": return "Session declined";
    case "risk_alert": return "Wellness alert";
    case "counselor_assigned": return "Counselor matched";
    case "report_ready": return "Report ready";
    default: return category.replace(/_/g, " ");
  }
}

export function NotificationBell() {
  const { data, isLoading } = useNotifications(8);
  const notifications = data?.data || [];
  const hasNew = notifications.some(n => !n.read);

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
            <DropdownMenuItem key={n.id} className={cn("flex-col items-start py-3 gap-0.5", !n.read && "bg-muted/40")}>
              <div className={cn("text-sm font-semibold leading-snug", !n.read ? "text-foreground" : "text-muted-foreground")}>
                {n.title || categoryLabel(n.category)}
              </div>
              <div className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{n.message}</div>
              <div className="flex items-center justify-between w-full mt-1">
                <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wide">{categoryLabel(n.category)}</span>
                {n.created_at && (
                  <span className="text-[10px] text-muted-foreground/60">
                    {new Date(n.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </div>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
