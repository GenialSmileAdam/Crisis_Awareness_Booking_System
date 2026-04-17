import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { UserRole } from "@/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, Mail, Lock, Eye, ArrowRight } from "lucide-react";

const roleRoutes: Record<UserRole, string> = {
  student: "/student/dashboard",
  counselor: "/counselor/dashboard",
  admin: "/admin/dashboard",
  family: "/family/dashboard",
};

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>("counselor");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    login(email, password, role);
    navigate(roleRoutes[role]);
  };

  const roles: { value: UserRole; label: string }[] = [
    { value: "student", label: "Student" },
    { value: "counselor", label: "Counselor" },
    { value: "admin", label: "Admin" },
    { value: "family", label: "Family" },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/30 p-4">
      <div className="w-full max-w-[900px] rounded-2xl overflow-hidden shadow-xl flex bg-card">
        {/* Left panel - Blue gradient */}
        <div className="hidden md:flex w-[45%] bg-gradient-to-br from-primary to-primary/80 p-10 flex-col justify-between text-primary-foreground relative">
          <div>
            <div className="flex items-center gap-2 mb-16">
              <div className="h-10 w-10 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
                <Shield className="h-5 w-5" />
              </div>
              <span className="text-lg font-bold">CrisisAware</span>
            </div>
            <h1 className="text-3xl font-bold leading-tight mb-3">
              Compassionate care<br />at your fingertips.
            </h1>
            <p className="text-primary-foreground/70 text-sm">
              Empowering students and counselors.
            </p>
          </div>
          <div className="bg-primary-foreground/10 rounded-xl p-4 backdrop-blur-sm">
            <p className="text-sm italic mb-2">"A safe space for recovery and resilience."</p>
            <p className="text-xs text-primary-foreground/60">— Mental Health Advocacy Board</p>
          </div>
        </div>

        {/* Right panel - Form */}
        <div className="flex-1 p-10 flex flex-col justify-center">
          <h2 className="text-2xl font-bold text-foreground mb-1">Welcome Back</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Please enter your credentials to access the management portal.
          </p>

          {/* Role selector */}
          <div className="grid grid-cols-4 gap-2 mb-6">
            {roles.map((r) => (
              <Button
                key={r.value}
                type="button"
                variant={role === r.value ? "default" : "outline"}
                size="sm"
                onClick={() => setRole(r.value)}
                className="text-xs"
              >
                {r.label}
              </Button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="counselor@crisisaware.org"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  className="pl-9 bg-secondary/50 border-0 h-11"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Password</Label>
                <button type="button" className="text-xs text-primary font-semibold hover:underline">Forgot password?</button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  className="pl-9 pr-9 bg-secondary/50 border-0 h-11"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="remember" />
              <label htmlFor="remember" className="text-xs text-muted-foreground">Keep me signed in for 30 days</label>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full h-11 rounded-xl text-sm font-semibold">
              Sign into Portal <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t text-center">
            <p className="text-xs text-muted-foreground">
              Don't have an account? <button className="text-foreground font-bold hover:underline">Request Access</button>
            </p>
            <div className="flex justify-center gap-4 mt-3">
              <button className="text-[10px] text-muted-foreground hover:underline">Privacy Policy</button>
              <button className="text-[10px] text-muted-foreground hover:underline">Security Standards</button>
              <button className="text-[10px] text-muted-foreground hover:underline">Help Center</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
