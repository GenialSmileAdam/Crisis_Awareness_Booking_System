import { Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export function Logo({
  to = "/",
  showWordmark = true,
  size = "md",
}: {
  to?: string;
  showWordmark?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const dim = size === "lg" ? "h-10 w-10" : size === "sm" ? "h-7 w-7" : "h-8 w-8";
  const icon = size === "lg" ? "h-5 w-5" : "h-4 w-4";
  const text = size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-lg";
  return (
    <Link to={to} className="flex items-center gap-2 group shrink-0">
      <div className={cn("relative rounded-xl gradient-primary flex items-center justify-center shadow-glow", dim)}>
        <Shield className={cn("text-primary-foreground", icon)} strokeWidth={2.5} />
      </div>
      {showWordmark && (
        <span className={cn("font-display font-bold tracking-tight", text)}>SafeSpace</span>
      )}
    </Link>
  );
}
