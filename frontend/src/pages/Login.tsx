import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Activity } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { WRSRing } from "@/components/WRSRing";
import { toast } from "sonner";
import type { ApiError } from "@/api/client";

type Role = "student" | "psychologist" | "admin";

const ROLES: { id: Role; label: string }[] = [
  { id: "student", label: "Student" },
  { id: "psychologist", label: "Counselor" },
  { id: "admin", label: "Admin" },
];

const HINTS: Record<Role, { identifier: string; pwd: string }> = {
  student: { identifier: "Student ID: 27001011", pwd: "ChangeMe123!" },
  psychologist: { identifier: "dr.amara@nileuni.edu", pwd: "ChangeMe123!" },
  admin: { identifier: "thisismymail014@gmail.com", pwd: "PsyUnitAdmin1" },
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const [role, setRole] = useState<Role>("student");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const validateInputs = (): boolean => {
    if (role === "student") {
      if (!identifier.trim()) {
        setError("Student ID is required.");
        return false;
      }
      if (!password) {
        setError("Password is required.");
        return false;
      }
    } else {
      if (!emailRegex.test(identifier.trim())) {
        setError("Please enter a valid email address.");
        return false;
      }
      if (!password) {
        setError("Password is required.");
        return false;
      }
    }
    return true;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateInputs()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await login(role, identifier, password);
      toast.success("Welcome back!");

      // Navigate based on user role from decoded token
      if (role === "student") {
        navigate("/student");
      } else if (role === "psychologist") {
        navigate("/counselor");
      } else if (role === "admin") {
        navigate("/admin");
      }
    } catch (err) {
      const error = err as ApiError;
      let message = "Something went wrong. Please try again later.";

      if (error.status === 401) {
        message = "Invalid credentials. Please try again.";
      } else if (error.status === 403) {
        message = "Your account is inactive. Contact your administrator.";
      } else if (error.status === 422) {
        message = "Please check your details and try again.";
      } else if (error.status === 429) {
        message = "Too many attempts. Please wait a moment and try again.";
      }

      setError(message);
      setPassword("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-background">
      {/* Left — branded */}
      <div className="relative lg:w-1/2 min-h-[40vh] lg:min-h-screen overflow-hidden bg-[hsl(240_22%_6%)] text-white hidden lg:flex items-center justify-center p-10">
        <div className="absolute inset-0 gradient-mesh animate-mesh opacity-90" />
        <div className="absolute top-6 left-6"><Logo size="md" /></div>

        <div className="relative z-10 text-center max-w-sm">
          <h1 className="font-display text-4xl lg:text-5xl font-bold leading-tight">
            Take control of <span className="gradient-text">your wellness.</span>
          </h1>
          <p className="text-sm text-white/70 mt-4">
            The intelligent wellness platform built for Nile University.
          </p>
        </div>

        {/* Floating cards */}
        <div className="hidden lg:block absolute top-[18%] left-[8%] glass border border-white/10 rounded-2xl p-4 shadow-card animate-float">
          <WRSRing value={72} size={120} />
        </div>
        <div className="hidden lg:flex absolute bottom-[22%] right-[8%] items-start gap-3 glass border border-white/10 rounded-2xl p-4 shadow-card animate-float-delayed max-w-[240px]">
          <div className="h-2 w-2 rounded-full bg-destructive animate-pulse mt-1.5" />
          <div>
            <div className="text-[10px] uppercase tracking-widest text-white/60">Priority Alert</div>
            <div className="text-sm font-medium mt-0.5">Sent to Dr. Amara</div>
          </div>
        </div>
        <div className="hidden lg:flex absolute bottom-[10%] left-[10%] items-center gap-3 glass border border-white/10 rounded-2xl p-4 shadow-card animate-float">
          <div className="h-9 w-9 rounded-full gradient-accent flex items-center justify-center">
            <Activity className="h-4 w-4 text-accent-foreground" />
          </div>
          <div className="text-xs">
            <div className="font-display font-bold text-base">—</div>
            <div className="text-white/60">wellness score</div>
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center min-h-screen lg:min-h-0 lg:p-10 relative">
        <div className="absolute top-4 right-4"><ThemeToggle /></div>

        <div className="w-full max-w-md surface-card p-8 shadow-card animate-fade-in-up rounded-none border-0 lg:rounded-2xl lg:border">
          <h2 className="font-display text-3xl font-bold">Welcome back</h2>
          <p className="text-sm text-muted-foreground mt-1">Sign in to SafeSpace</p>

          <div className="mt-6 grid grid-cols-3 gap-1 p-1 rounded-full bg-muted">
            {ROLES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRole(r.id)}
                className={cn(
                  "py-2 px-3 text-sm font-medium rounded-full transition-all",
                  role === r.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {r.label}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="identifier">{role === "student" ? "Student ID" : "Email Address"}</Label>
              <Input
                id="identifier"
                type={role === "student" ? "text" : "email"}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={role === "student" ? "e.g., 27001011" : "you@nileuni.edu"}
                required
                className={cn("mt-1.5 focus-visible:ring-primary", error && "border-destructive focus-visible:ring-destructive")}
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={cn("mt-1.5 focus-visible:ring-primary", error && "border-destructive focus-visible:ring-destructive")}
              />
            </div>
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                {error}
              </div>
            )}
            <Button
              type="submit"
              className="w-full gradient-primary text-primary-foreground border-0 h-11 group"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Signing in..." : "Sign In"} {!isSubmitting && <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition" />}
            </Button>
          </form>

          <div className="mt-6 p-3 rounded-xl bg-muted/60 border border-border text-xs">
            <div className="label-eyebrow mb-1.5">Demo credentials</div>
            <div className="font-mono text-[11px] space-y-0.5">
              <div>{HINTS[role].identifier}</div>
              <div className="text-muted-foreground">{HINTS[role].pwd}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
