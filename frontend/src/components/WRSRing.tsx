import { useEffect, useState } from "react";
import { colorFromWrs } from "@/data/mock";

export function WRSRing({ value, size = 220, label, hideValue = false }: { value: number; size?: number; label?: string; hideValue?: boolean }) {
  const [animated, setAnimated] = useState(0);
  useEffect(() => {
    let raf: number;
    const start = animated;
    const t0 = performance.now();
    const dur = 800;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      setAnimated(start + (value - start) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (animated / 100) * c;
  const color = colorFromWrs(value);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="hsl(var(--muted))" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ filter: `drop-shadow(0 0 12px ${color})`, transition: "stroke 0.3s" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {!hideValue && (
          <div className="font-display text-5xl font-bold tabular-nums" style={{ color }}>
            {Math.round(animated)}
          </div>
        )}
        <div className="label-eyebrow mt-1">{label || "WRS"}</div>
      </div>
    </div>
  );
}
