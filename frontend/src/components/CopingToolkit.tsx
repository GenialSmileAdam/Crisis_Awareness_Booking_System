import { useEffect, useRef, useState } from "react";
import { Wind, Hand, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ── Box breathing (4-4-4-4) ──────────────────────────────────────────────────
const PHASES = [
  { label: "Breathe in", secs: 4, scale: 1 },
  { label: "Hold", secs: 4, scale: 1 },
  { label: "Breathe out", secs: 4, scale: 0.55 },
  { label: "Hold", secs: 4, scale: 0.55 },
] as const;

function BreathingExercise() {
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState(0);
  const [count, setCount] = useState(4);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;
    setPhase(0);
    setCount(PHASES[0].secs);
    let p = 0;
    let c = PHASES[0].secs;
    timer.current = setInterval(() => {
      c -= 1;
      if (c <= 0) {
        p = (p + 1) % PHASES.length;
        c = PHASES[p].secs;
        setPhase(p);
      }
      setCount(c);
    }, 1000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [running]);

  const current = PHASES[phase];
  return (
    <div className="surface-card p-6 bg-card flex flex-col items-center text-center">
      <div className="flex items-center gap-2 self-start mb-1">
        <Wind className="h-4 w-4 text-primary" />
        <h3 className="font-display font-bold">Box Breathing</h3>
      </div>
      <p className="text-xs text-muted-foreground self-start mb-4">A 4-4-4-4 cycle to calm your nervous system.</p>

      <div className="relative h-44 w-44 flex items-center justify-center my-2">
        <div
          className="absolute rounded-full bg-primary/20 border-2 border-primary/40"
          style={{
            height: "11rem", width: "11rem",
            transform: `scale(${running ? current.scale : 0.7})`,
            transition: "transform 1s ease-in-out",
          }}
        />
        <div className="relative z-10">
          <div className="text-sm font-semibold">{running ? current.label : "Ready?"}</div>
          {running && <div className="text-3xl font-bold tabular-nums mt-1">{count}</div>}
        </div>
      </div>

      <Button
        onClick={() => setRunning((r) => !r)}
        className={cn("mt-3 w-36", running ? "" : "gradient-primary text-primary-foreground border-0")}
        variant={running ? "outline" : "default"}
      >
        {running ? <><Square className="h-4 w-4 mr-1.5" /> Stop</> : <><Play className="h-4 w-4 mr-1.5" /> Start</>}
      </Button>
    </div>
  );
}

// ── 5-4-3-2-1 grounding ───────────────────────────────────────────────────────
const GROUNDING = [
  { n: 5, sense: "things you can SEE", hint: "Look around and name them." },
  { n: 4, sense: "things you can FEEL", hint: "Notice textures and contact points." },
  { n: 3, sense: "things you can HEAR", hint: "Listen for near and far sounds." },
  { n: 2, sense: "things you can SMELL", hint: "Or two smells you like." },
  { n: 1, sense: "thing you can TASTE", hint: "Or one thing you're grateful for." },
];

function GroundingExercise() {
  const [step, setStep] = useState(0);
  const done = step >= GROUNDING.length;
  return (
    <div className="surface-card p-6 bg-card flex flex-col">
      <div className="flex items-center gap-2 mb-1">
        <Hand className="h-4 w-4 text-primary" />
        <h3 className="font-display font-bold">5-4-3-2-1 Grounding</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">Reconnect with the present moment through your senses.</p>

      {done ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
          <div className="text-3xl mb-2">🌿</div>
          <p className="text-sm font-medium">Nicely done.</p>
          <p className="text-xs text-muted-foreground mt-1">Notice how you feel now.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => setStep(0)}>Start again</Button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          <div className="flex items-center gap-1.5 mb-4">
            {GROUNDING.map((_, i) => (
              <div key={i} className={cn("h-1.5 flex-1 rounded-full", i <= step ? "bg-primary" : "bg-muted")} />
            ))}
          </div>
          <div className="flex-1 flex flex-col items-center justify-center text-center py-4">
            <div className="text-5xl font-display font-bold text-primary">{GROUNDING[step].n}</div>
            <div className="text-sm font-medium mt-2">{GROUNDING[step].sense}</div>
            <div className="text-xs text-muted-foreground mt-1">{GROUNDING[step].hint}</div>
          </div>
          <Button className="mt-2 gradient-primary text-primary-foreground border-0" onClick={() => setStep((s) => s + 1)}>
            {step === GROUNDING.length - 1 ? "Finish" : "Next"}
          </Button>
        </div>
      )}
    </div>
  );
}

export function CopingToolkit() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <BreathingExercise />
      <GroundingExercise />
    </div>
  );
}
