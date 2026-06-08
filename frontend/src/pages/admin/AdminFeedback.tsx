import { useState } from "react";
import { LogOut, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { AppShell } from "@/components/AppSidebar";
import { adminSidebarItems } from "@/data/sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useFeedback } from "@/hooks/queries/useFeedback";
import { NeonSpinner } from "@/components/NeonSpinner";

export default function AdminFeedback() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [offset, setOffset] = useState(0);
  const limit = 10;

  const { data: feedbackData, isLoading } = useFeedback(limit, offset);

  const feedback = feedbackData?.data || [];
  const pagination = feedbackData?.pagination;

  const renderStars = (rating: number | null) => {
    if (!rating) return "—";
    return (
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={cn(
              "h-4 w-4",
              i < rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
            )}
          />
        ))}
      </div>
    );
  };

  return (
    <AppShell items={adminSidebarItems}>
      <div className="flex flex-col md:flex-row md:items-center justify-between py-4 md:h-16 px-4 md:px-8 border-b border-border bg-background/60 backdrop-blur-sm sticky top-0 z-30 gap-3 md:gap-0">
        <div className="flex items-center justify-between w-full md:w-auto">
          <div>
            <h1 className="font-display text-xl font-bold">User Feedback</h1>
            <p className="text-xs text-muted-foreground mt-0.5">View and manage user feedback.</p>
          </div>
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={() => { logout(); navigate("/login"); }} className="rounded-full h-9 w-9">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="hidden md:flex gap-2">
          <ThemeToggle />
        </div>
      </div>

      <div className="p-4 md:p-8 space-y-6">
        <div className="glass border border-border rounded-3xl p-6">
          <div className="mb-6">
            <h2 className="font-display text-lg font-bold">Recent Feedback</h2>
            <p className="text-sm text-muted-foreground">User feedback and ratings</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="text-left p-3">Name</th>
                  <th className="text-left p-3">Role</th>
                  <th className="text-left p-3">Message</th>
                  <th className="text-left p-3">Rating</th>
                  <th className="text-left p-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center">
                      <NeonSpinner />
                    </td>
                  </tr>
                ) : feedback.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      No feedback yet
                    </td>
                  </tr>
                ) : (
                  feedback.map((item) => {
                    const roleColor = item.user_type === "student"
                      ? "bg-blue-500/15 text-blue-500"
                      : item.user_type === "psychologist"
                      ? "bg-purple-500/15 text-purple-500"
                      : item.user_type === "admin"
                      ? "bg-amber-500/15 text-amber-600"
                      : "bg-muted text-muted-foreground";
                    const roleLabel = item.user_type
                      ? item.user_type.charAt(0).toUpperCase() + item.user_type.slice(1)
                      : "Unknown";
                    return (
                      <tr key={item.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                        <td className="p-3 font-medium">{item.name}</td>
                        <td className="p-3">
                          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", roleColor)}>
                            {roleLabel}
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground max-w-xs truncate" title={item.message}>
                          {item.message}
                        </td>
                        <td className="p-3">{renderStars(item.rating)}</td>
                        <td className="p-3 text-muted-foreground">
                          {new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-6">
            <div className="text-xs text-muted-foreground">
              {pagination?.total
                ? `Showing ${offset + 1} to ${Math.min(offset + limit, pagination.total)} of ${pagination.total} feedback items`
                : "No feedback items"}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - limit))}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!pagination?.has_next}
                onClick={() => setOffset(offset + limit)}
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
