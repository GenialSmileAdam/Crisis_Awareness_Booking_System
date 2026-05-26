import { cn } from "@/lib/utils";

interface NeonSpinnerProps {
  size?: number;
  className?: string;
}

export function NeonSpinner({ size = 20, className }: NeonSpinnerProps) {
  return (
    <div
      className={cn("animate-spin rounded-full shrink-0", className)}
      style={{
        width: size,
        height: size,
        border: `2px solid rgba(168,255,62,0.15)`,
        borderTopColor: "#A8FF3E",
      }}
    />
  );
}

export function NeonLoadingOverlay({ message = "Loading…" }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card px-8 py-6 shadow-xl">
        <NeonSpinner size={32} />
        <span className="text-sm font-medium text-muted-foreground">{message}</span>
      </div>
    </div>
  );
}

export function NeonLoadingRow({ colSpan = 6 }: { colSpan?: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-8 text-center">
        <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
          <NeonSpinner size={16} />
          Loading…
        </div>
      </td>
    </tr>
  );
}
