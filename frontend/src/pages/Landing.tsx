import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Activity, Brain, AlertCircle, Sparkles, ChevronDown, Check } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { WRSRing } from "@/components/WRSRing";
import { cn } from "@/lib/utils";

function useCountUp(target: number, active: boolean, duration = 1400) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!active) return;
    let raf: number;
    const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, active, duration]);
  return v;
}

function Stat({ n, suffix, l }: { n: number; suffix?: string; l: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([e]) => e.isIntersecting && setVis(true), { threshold: 0.4 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  const v = useCountUp(n, vis);
  return (
    <div ref={ref}>
      <div className="font-display text-3xl md:text-4xl font-bold gradient-text">
        {v.toLocaleString()}{suffix}
      </div>
      <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{l}</div>
    </div>
  );
}

export default function Landing() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Crisis Bar */}
      <div className="fixed top-0 inset-x-0 z-[60] bg-[#B00020] text-white h-10 px-6 flex justify-between items-center text-sm">
        <div className="font-bold">🆘 Need immediate help?</div>
        <a href="tel:0800-SAFESPACE" className="font-bold hover:underline cursor-pointer">
          Call Crisis Hotline: 0800-SAFESPACE
        </a>
      </div>

      {/* Nav */}
      <nav
        className={cn(
          "fixed top-10 inset-x-0 z-50 transition-all duration-300",
          scrolled ? "backdrop-blur-xl bg-background/70 border-b border-border py-3" : "py-5"
        )}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <Logo />
          <div className="hidden md:flex items-center gap-8 text-sm">
            <button onClick={() => scrollTo("how-it-works")} className="text-muted-foreground hover:text-foreground transition">
              How It Works
            </button>
            <button onClick={() => scrollTo("features")} className="text-muted-foreground hover:text-foreground transition">
              Features
            </button>
            <button onClick={() => scrollTo("universities")} className="text-muted-foreground hover:text-foreground transition">
              For Universities
            </button>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link to="/login">
              <Button size="sm" className="gradient-primary text-primary-foreground border-0">Sign In</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center pt-24 pb-12 overflow-hidden">
        <div className="absolute inset-0 gradient-mesh animate-mesh" />
        <div className="absolute inset-0 grain opacity-30 pointer-events-none" />
        <div className="relative w-full max-w-7xl mx-auto px-6 flex flex-col lg:grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8 animate-fade-in-up mt-10 lg:mt-0 w-full">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent text-accent-foreground text-xs font-bold uppercase tracking-wider">
              <Sparkles className="h-3 w-3" /> Nile University × SafeSpace
            </span>
            <h1 className="font-display font-bold text-6xl md:text-7xl lg:text-8xl leading-[0.95] tracking-tight">
              Your Mind,
              <br />
              <span className="gradient-text">Your Power.</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
              The intelligent wellness platform that detects student distress early and connects them to help before crisis hits.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <Link to="/login" className="w-full sm:w-auto">
                <Button size="lg" className="h-12 px-6 w-full sm:w-auto">
                  Sign In (Staff)
                </Button>
              </Link>
              <Link to="/login" className="w-full sm:w-auto">
                <Button size="lg" className="gradient-primary text-primary-foreground border-0 h-12 px-6 group flex items-center bg-accent text-accent-foreground hover:bg-accent/90 w-full sm:w-auto justify-center">
                  Student Check-in <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="relative h-[320px] md:h-[520px] w-full mt-8 lg:mt-0 flex justify-center items-center">
            <div className="absolute inset-0 animate-blob gradient-primary rounded-full blur-3xl opacity-30" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="surface-card p-6 shadow-card glass transform scale-75 md:scale-100">
                <WRSRing value={72} size={200} />
                <div className="mt-3 flex justify-center">
                  <span className="px-3 py-1 rounded-full bg-destructive/15 text-destructive text-xs font-semibold">🔴 At Risk</span>
                </div>
              </div>
            </div>
            <div className="absolute bottom-12 right-0 surface-card glass p-4 shadow-card max-w-[260px] animate-float-delayed">
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-destructive animate-pulse mt-1.5" />
                <div>
                  <div className="text-xs label-eyebrow">Priority Alert</div>
                  <div className="text-sm font-medium mt-1">Sent to Dr. Amara Obi</div>
                </div>
              </div>
            </div>
            <div className="absolute top-8 left-0 surface-card glass p-4 shadow-card animate-float">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full gradient-accent flex items-center justify-center">
                  <Activity className="h-4 w-4 text-accent-foreground" />
                </div>
                <div className="text-xs">
                  <div className="font-semibold">+24% wellness</div>
                  <div className="text-muted-foreground">this semester</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => scrollTo("features")}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 text-muted-foreground animate-bounce-soft"
          aria-label="Scroll"
        >
          <ChevronDown className="h-6 w-6" />
        </button>
      </section>

      {/* Features bento */}
      <section id="features" className="py-24 px-6 max-w-7xl mx-auto">
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-accent mb-3">What SafeSpace Does</div>
        <h2 className="font-display text-4xl md:text-5xl font-bold max-w-2xl mb-12">
          An ecosystem for student wellness, not just a tool.
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/login"
            className="md:col-span-2 md:row-span-2 surface-card surface-card-hover p-8 group bg-card"
          >
            <div className="h-12 w-12 rounded-2xl gradient-accent flex items-center justify-center mb-6">
              <Activity className="h-6 w-6 text-accent-foreground" />
            </div>
            <h3 className="font-display text-3xl font-bold mb-3">Real-Time Wellness Scoring</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              A continuously updated WRS that captures emotional shifts before they become crises. Adaptive, contextual, evidence-based.
            </p>
            <div className="flex justify-end">
              <WRSRing value={48} size={180} />
            </div>
          </Link>
          <Link to="/login" className="surface-card surface-card-hover p-6 bg-card">
            <div className="h-10 w-10 rounded-xl bg-accent/20 flex items-center justify-center mb-4">
              <Brain className="h-5 w-5 text-accent" />
            </div>
            <h3 className="font-display text-xl font-bold mb-2">AI-Powered Session Notes</h3>
            <p className="text-sm text-muted-foreground">
              Counselors get auto-summarized session transcripts with archetype tagging.
            </p>
            <div className="mt-4 flex items-end gap-1 h-8">
              {[3, 5, 8, 4, 9, 6, 7, 4, 8, 5].map((h, i) => (
                <div key={i} className="w-1 rounded-full bg-accent" style={{ height: `${h * 4}px` }} />
              ))}
            </div>
          </Link>
          <Link to="/login" className="surface-card surface-card-hover p-6 bg-card">
            <div className="h-10 w-10 rounded-xl bg-destructive/15 flex items-center justify-center mb-4 relative">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-destructive animate-pulse" />
            </div>
            <h3 className="font-display text-xl font-bold mb-2">Crisis Intervention, Instantly</h3>
            <p className="text-sm text-muted-foreground">
              Red-tier alerts route to assigned counselors in under 60 seconds.
            </p>
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 px-6 max-w-7xl mx-auto">
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-accent mb-3">Three Steps</div>
        <h2 className="font-display text-4xl md:text-5xl font-bold mb-16 max-w-2xl">
          From check-in to care, in minutes.
        </h2>
        <div className="relative flex flex-col md:grid md:grid-cols-3 gap-8">
          <div className="hidden md:block absolute top-10 left-[10%] right-[10%] h-px bg-gradient-to-r from-primary via-accent to-destructive animate-draw-line" />
          {[
            { n: "01", title: "Complete your daily check-in", desc: "Students fill a quick PHQ-9 or Pulse Survey in under 90 seconds." },
            { n: "02", title: "Your Wellness Score is calculated", desc: "Our WRS engine processes your response with clinical-grade scoring." },
            { n: "03", title: "Get help or stay on track", desc: "Crisis alerts fire instantly; on track? Get a tip and keep going." },
          ].map((s) => (
            <div key={s.n} className="relative bg-background">
              <div className="h-20 w-20 rounded-2xl border-2 border-primary/40 bg-background text-primary font-display text-3xl font-bold flex items-center justify-center mb-6">
                {s.n}
              </div>
              <h3 className="font-display text-2xl font-bold mb-2">{s.title}</h3>
              <p className="text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Social proof */}
      <section id="universities" className="py-24 px-6 max-w-7xl mx-auto">
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-accent mb-3">Loved by students</div>
        <h2 className="font-display text-4xl md:text-5xl font-bold mb-12 max-w-2xl">
          Real voices from Nile University.
        </h2>
        <div className="grid md:grid-cols-3 gap-4 mb-12">
          {[
            { n: "Chidi O.", f: "Engineering", q: "I never knew I was burning out until SafeSpace told me. Booked a session same day.", c: "from-violet-500 to-fuchsia-500" },
            { n: "Amina B.", f: "Medicine", q: "The check-ins take 60 seconds and actually feel helpful, not like a survey.", c: "from-emerald-500 to-lime-400" },
            { n: "Tunde A.", f: "Law", q: "My counselor knew exactly what was going on before I even spoke. Game-changer.", c: "from-orange-500 to-amber-400" },
          ].map((t, i) => (
            <div key={i} className="surface-card surface-card-hover p-6 bg-card">
              <div className="flex items-center gap-3 mb-4">
                <div className={cn("h-10 w-10 rounded-full text-white flex items-center justify-center font-semibold text-sm bg-gradient-to-br", t.c)}>
                  {t.n.split(" ").map((w) => w[0]).join("")}
                </div>
                <div>
                  <div className="font-semibold text-sm">{t.n}</div>
                  <div className="text-xs text-muted-foreground">{t.f}</div>
                </div>
              </div>
              <p className="text-sm leading-relaxed">"{t.q}"</p>
            </div>
          ))}
        </div>
        <div className="surface-card p-6 bg-card grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div><div className="font-display text-3xl md:text-4xl font-bold gradient-text">—</div><div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">check-ins</div></div>
          <div><div className="font-display text-3xl md:text-4xl font-bold gradient-text">—</div><div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">felt heard</div></div>
          <div><div className="font-display text-3xl md:text-4xl font-bold gradient-text">—</div><div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">crisis response</div></div>
          <div><div className="font-display text-3xl md:text-4xl font-bold gradient-text">—</div><div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">universities piloting</div></div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <Logo />
            <p className="text-sm text-muted-foreground mt-2">Take control of your wellness.</p>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <button onClick={() => scrollTo("features")}>Features</button>
            <button onClick={() => scrollTo("how-it-works")}>How It Works</button>
            <button onClick={() => scrollTo("universities")}>Universities</button>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link to="/login">
              <Button size="sm" className="gradient-primary text-primary-foreground border-0">Sign In</Button>
            </Link>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-8 pt-6 border-t border-border text-center text-xs text-muted-foreground">
          © 2024 SafeSpace · Built for Nile University
        </div>
      </footer>
    </div>
  );
}
