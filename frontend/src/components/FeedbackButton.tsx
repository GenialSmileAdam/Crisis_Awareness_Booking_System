import { useState } from "react";
import { MessageSquarePlus, HelpCircle, Send, Star, Phone, Mail, Clock, AlertCircle, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { submitFeedback } from "@/api/feedback";

type Tab = "feedback" | "support";

const SLA = [
  { level: "Critical", desc: "Platform down, data loss", time: "2 hours", color: "#B00020" },
  { level: "High", desc: "Core workflow blocked", time: "6 hours", color: "#FF4560" },
  { level: "Medium", desc: "Feature broken, workaround exists", time: "24 hours", color: "#FF8C42" },
  { level: "Low", desc: "Minor or cosmetic issue", time: "Next update", color: "#8b5cf6" },
];

export function FeedbackButton() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("feedback");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }
    setSubmitting(true);
    try {
      await submitFeedback({
        name: user?.name || "Anonymous",
        email: (user as any)?.email || "no-reply@safespace.edu",
        message: message.trim(),
        rating: rating || undefined,
      });
      toast.success("Feedback submitted — thank you!");
      setMessage("");
      setRating(0);
      setOpen(false);
    } catch {
      toast.error("Failed to submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating trigger */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 flex items-center gap-2 px-3 py-2.5 md:px-4 md:py-2.5 rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90 transition text-sm font-medium"
        aria-label="Feedback & Support"
      >
        <MessageSquarePlus className="h-4 w-4" />
        <span className="hidden md:inline">Feedback</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden rounded-3xl border border-border">
          {/* Header tabs */}
          <div className="flex border-b border-border">
            <button
              onClick={() => setTab("feedback")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition",
                tab === "feedback" ? "text-primary border-b-2 border-primary bg-primary/5" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <MessageSquarePlus className="h-4 w-4" />
              Give Feedback
            </button>
            <button
              onClick={() => setTab("support")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition",
                tab === "support" ? "text-primary border-b-2 border-primary bg-primary/5" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <HelpCircle className="h-4 w-4" />
              Get Help
            </button>
            <button
              onClick={() => setOpen(false)}
              className="px-4 text-muted-foreground hover:text-foreground transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Feedback tab */}
          {tab === "feedback" && (
            <div className="p-6 space-y-5">
              <div>
                <p className="text-sm text-muted-foreground">
                  Help us improve SafeSpace. All feedback goes directly to the development team.
                </p>
              </div>

              {/* Star rating */}
              <div className="space-y-2">
                <label className="text-sm font-medium">How would you rate your experience?</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onMouseEnter={() => setHoverRating(n)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(n)}
                      className="p-1 transition"
                    >
                      <Star
                        className={cn(
                          "h-6 w-6 transition",
                          n <= (hoverRating || rating)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-muted-foreground"
                        )}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div className="space-y-2">
                <label className="text-sm font-medium">What's on your mind?</label>
                <Textarea
                  placeholder="Tell us about a bug, a suggestion, or just what you think..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>

              <Button
                onClick={handleSubmit}
                disabled={submitting || !message.trim()}
                className="w-full gradient-primary text-primary-foreground border-0"
              >
                {submitting ? "Submitting..." : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit Feedback
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Support tab */}
          {tab === "support" && (
            <div className="p-6 space-y-5">
              <div>
                <h3 className="font-semibold mb-1">SafeSpace Support</h3>
                <p className="text-sm text-muted-foreground">
                  If you're experiencing a technical issue or need help, reach us directly.
                </p>
              </div>

              {/* Contact options */}
              <div className="space-y-3">
                <a
                  href="mailto:andreekunwe@gmail.com"
                  className="flex items-center gap-3 p-3 rounded-2xl border border-border hover:bg-muted/40 transition group"
                >
                  <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Mail className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">Email Support</div>
                    <div className="text-xs text-muted-foreground truncate">andreekunwe@gmail.com</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition" />
                </a>

                <button
                  onClick={() => { setTab("feedback"); }}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl border border-border hover:bg-muted/40 transition group text-left"
                >
                  <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <MessageSquarePlus className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">Report a Problem</div>
                    <div className="text-xs text-muted-foreground">Use the feedback form to describe the issue</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition" />
                </button>
              </div>

              {/* SLA table */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Response Times</span>
                </div>
                <div className="space-y-2">
                  {SLA.map(({ level, desc, time, color }) => (
                    <div key={level} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <div>
                          <span className="text-xs font-semibold">{level}</span>
                          <span className="text-xs text-muted-foreground ml-2">{desc}</span>
                        </div>
                      </div>
                      <span className="text-xs font-mono text-muted-foreground whitespace-nowrap ml-2">&lt; {time}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 rounded-2xl bg-muted/40 text-xs text-muted-foreground">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />
                <span>For urgent mental health crises, use the crisis line shown on your dashboard — not this support channel.</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
