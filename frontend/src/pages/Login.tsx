import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Activity, Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, Role } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { WRSRing } from "@/components/WRSRing";
import { toast } from "sonner";
import { loginStudent, loginStaff } from "@/api";

const ROLES: { id: Role; label: string }[] = [
  { id: "student", label: "Student" },
  { id: "psychologist", label: "Counselor" },
  { id: "admin", label: "Admin" },
];

const HINTS: Record<Role, { identifier: string; pwd: string }> = {
  student: { identifier: "Student ID: 27001011", pwd: "StudentPass123!" },
  psychologist: { identifier: "dr.amara@nileuni.edu", pwd: "counsel123" },
  admin: { identifier: "thisismymail014@gmail.com", pwd: "PsyUnitAdmin1" },
};

/** Decode the payload segment of a JWT (no validation — server is the authority). */
function decodeJwtPayload(token: string): Record<string, unknown> {
  const base64 = token.split(".")[1];
  const json = atob(base64.replace(/-/g, "+").replace(/_/g, "/"));
  return JSON.parse(json);
}

/** Simple email-format check */
function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export default function Login() {
  const [role, setRole] = useState<Role>("student");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ identifier?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const { setAuthUser } = useAuth();
  const navigate = useNavigate();

  const validate = (): boolean => {
    const errs: { identifier?: string; password?: string } = {};
    if (role === "student") {
      if (!identifier.trim()) errs.identifier = "Student ID is required.";
    } else {
      if (!identifier.trim()) errs.identifier = "Email is required.";
      else if (!isValidEmail(identifier.trim())) errs.identifier = "Please enter a valid email address.";
    }
    if (!password) errs.password = "Password is required.";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    if (!validate()) return;

    setLoading(true);

    try {
      // Call the real API
      const res =
        role === "student"
          ? await loginStudent(identifier.trim(), password)
          : await loginStaff(identifier.trim(), password);

      // Decode the JWT payload
      const jwt = decodeJwtPayload(res.access_token);

      // Derive display name and initials from JWT
      const sub = (jwt.sub as string) || identifier;
      const fullName = (jwt.full_name as string) || sub;
      const initials = fullName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

      // Map JWT role to app role
      const jwtRole = (jwt.role as string) || role;
      const appRole: Role =
        jwtRole === "psychologist" ? "psychologist" :
        jwtRole === "admin" ? "admin" :
        "student";

      // Persist user in context + localStorage
      const user = {
        role: appRole,
        name: fullName,
        email: (jwt.email as string) || identifier,
        initials,
        jwt,
      };

      localStorage.setItem("safespace_access_token", res.access_token);
      localStorage.setItem("safespace_user", JSON.stringify(user));
      setAuthUser(user);

      toast.success("Welcome back!");

      // Navigate to the correct dashboard
      navigate(
        appRole === "student" ? "/student" :
        appRole === "psychologist" ? "/counselor" :
        "/admin",
      );
    } catch (err: unknown) {
      const apiErr = err as { message?: string; status?: number };
      const status = apiErr?.status;

      if (status === 401) {
        setError("Invalid credentials. Please try again.");
      } else if (status === 422) {
        setError("Please check your details and try again.");
      } else {
        setError("Something went wrong. Please try again later.");
      }

      setPassword("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-background">
      {/* Left — branded */}
      <div className="relative lg:w-1/2 min-h-[40vh] lg:min-h-screen overflow-hidden bg-[hsl(240_22%_6%)] text-white flex items-center justify-center p-10">
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
      <div className="lg:w-1/2 flex items-center justify-center p-6 lg:p-10 relative">
        <div className="absolute top-4 right-4"><ThemeToggle /></div>

        <div className="w-full max-w-md surface-card p-8 shadow-card animate-fade-in-up">
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
                onChange={(e) => { setIdentifier(e.target.value); setFieldErrors((f) => ({ ...f, identifier: undefined })); }}
                placeholder={role === "student" ? "e.g., 27001011" : "you@nileuni.edu"}
                className={cn("mt-1.5 focus-visible:ring-primary", (error || fieldErrors.identifier) && "border-destructive focus-visible:ring-destructive")}
              />
              {fieldErrors.identifier && (
                <p className="text-xs text-destructive mt-1">{fieldErrors.identifier}</p>
              )}
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setFieldErrors((f) => ({ ...f, password: undefined })); }}
                className={cn("mt-1.5 focus-visible:ring-primary", (error || fieldErrors.password) && "border-destructive focus-visible:ring-destructive")}
              />
              {fieldErrors.password && (
                <p className="text-xs text-destructive mt-1">{fieldErrors.password}</p>
              )}
            </div>
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                {error}
              </div>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="w-full gradient-primary text-primary-foreground border-0 h-11 group"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Signing in…</>
              ) : (
                <>Sign In <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition" /></>
              )}
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
