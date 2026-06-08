import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, X, Clock, User, Calendar, MessageSquare, LogOut } from "lucide-react";
import { AppShell } from "@/components/AppSidebar";
import { counselorSidebarItems } from "@/data/sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { NeonSpinner } from "@/components/NeonSpinner";
import { useAppointments } from "@/hooks/queries";
import { useApproveAppointment, useRejectAppointment } from "@/hooks/mutations";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function PendingAppointments() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);

  const { data: appointmentsData, isLoading } = useAppointments(limit, offset);
  const { mutate: approveAppointment, isPending: approving } = useApproveAppointment();
  const { mutate: rejectAppointment, isPending: rejecting } = useRejectAppointment();

  const appointments = appointmentsData?.data || [];

  // Filter for pending appointments only
  const pendingAppointments = appointments.filter(a => a.status === "pending");

  const extractErrorMessage = (error: any, fallback: string): string => {
    const msg = error?.message;
    if (!msg) return fallback;
    if (typeof msg === "string") return msg;
    if (Array.isArray(msg)) return msg.map((e: any) => e?.msg ?? String(e)).join("; ");
    return fallback;
  };

  const handleApprove = (appointmentId: string) => {
    approveAppointment(appointmentId, {
      onSuccess: () => {
        toast.success("Appointment approved");
      },
      onError: (error: any) => {
        toast.error(extractErrorMessage(error, "Failed to approve appointment"));
      },
    });
  };

  const handleReject = (appointmentId: string) => {
    rejectAppointment(appointmentId, {
      onSuccess: () => {
        toast.success("Appointment rejected");
      },
      onError: (error: any) => {
        toast.error(extractErrorMessage(error, "Failed to reject appointment"));
      },
    });
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  return (
    <AppShell items={counselorSidebarItems}>
      <div className="flex items-center justify-between py-4 h-16 px-4 md:px-8 border-b border-border bg-background/60 backdrop-blur-sm sticky top-0 z-30">
        <div>
          <h1 className="font-display text-xl font-bold">Pending Appointments</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {pendingAppointments.length} request{pendingAppointments.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="rounded-full h-9 w-9 md:hidden"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="p-4 md:p-8 space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <NeonSpinner size={32} />
          </div>
        ) : pendingAppointments.length === 0 ? (
          <div className="surface-card p-12 text-center">
            <Clock className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <div className="font-semibold mb-2">No pending appointments</div>
            <p className="text-sm text-muted-foreground">All appointment requests have been reviewed</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingAppointments.map((appointment) => (
              <div
                key={appointment.id}
                className="surface-card border border-border/60 rounded-2xl p-5 hover:border-border transition-colors"
              >
                <div className="grid md:grid-cols-[1fr,auto] gap-4">
                  {/* Left side: Student and appointment details */}
                  <div className="space-y-3">
                    {/* Student name */}
                    <div className="flex items-start gap-3">
                      <User className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <div className="font-semibold">
                          {appointment.student_full_name || "Student"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          ID: {appointment.student_id}
                        </div>
                      </div>
                    </div>

                    {/* Date and time */}
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="text-sm">
                        <div className="font-medium">{formatDate(appointment.start_time)}</div>
                        <div className="text-muted-foreground">
                          {formatTime(appointment.start_time)} – {formatTime(appointment.end_time)}
                        </div>
                      </div>
                    </div>

                    {/* Notes */}
                    {appointment.notes && (
                      <div className="flex gap-3">
                        <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="text-sm p-2 bg-muted/50 rounded-lg flex-1">
                          {appointment.notes}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right side: Action buttons */}
                  <div className="flex gap-2 md:flex-col md:justify-between md:items-end">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-500/15 text-amber-700 dark:text-amber-400 whitespace-nowrap">
                      Awaiting approval
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
                        onClick={() => handleReject(appointment.id)}
                        disabled={rejecting}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        className="gradient-primary text-primary-foreground border-0"
                        onClick={() => handleApprove(appointment.id)}
                        disabled={approving}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
