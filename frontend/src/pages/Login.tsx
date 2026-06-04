import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Activity, AlertCircle } from "lucide-react";
import { NeonSpinner } from "@/components/NeonSpinner";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { registerUser } from "@/api/auth";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { WRSRing } from "@/components/WRSRing";
import { toast } from "sonner";
import type { ApiError } from "@/api/client";

type Role = "student" | "psychologist" | "admin";
type SignUpRole = "student" | "psychologist";

const SIGNIN_ROLES: { id: Role; label: string }[] = [
  { id: "student", label: "Student" },
  { id: "psychologist", label: "Counselor" },
  { id: "admin", label: "Admin" },
];

const SIGNUP_ROLES: { id: SignUpRole; label: string }[] = [
  { id: "student", label: "Student" },
  { id: "psychologist", label: "Counselor" },
];

const HINTS: Record<Role, { identifier: string; pwd: string }> = {
  student: { identifier: "STU001  (or  stu001@student.nileuniversity.edu.ng)", pwd: "ChangeMe123!" },
  psychologist: { identifier: "amara.adeyemi@psyunit.nileuniversity.edu.ng", pwd: "ChangeMe123!" },
  admin: { identifier: "thisismymail014@gmail.com", pwd: "PsyUnitAdmin1" },
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const studentIdRegex = /^\d{9}$/;

export default function Login() {
  // OIDC state
  const [showFallback, setShowFallback] = useState(false);
  const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

  // Sign In state
  const [signInRole, setSignInRole] = useState<Role>("student");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Sign Up state
  const [signUpRole, setSignUpRole] = useState<SignUpRole>("student");
  const [signUpError, setSignUpError] = useState("");
  const [signUpFieldErrors, setSignUpFieldErrors] = useState<Record<string, string>>({});
  const [isSignUpSubmitting, setIsSignUpSubmitting] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  
  // Student sign up
  const [studentFullName, setStudentFullName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentPassword, setStudentPassword] = useState("");
  const [studentConfirmPassword, setStudentConfirmPassword] = useState("");
  const [studentClassLevel, setStudentClassLevel] = useState("");
  const [studentEmergencyContact, setStudentEmergencyContact] = useState("");
  const [studentEmergencyPhone, setStudentEmergencyPhone] = useState("");
  
  // Psychologist sign up
  const [psychoFullName, setPsychoFullName] = useState("");
  const [psychoStaffId, setPsychoStaffId] = useState("");
  const [psychoEmail, setPsychoEmail] = useState("");
  const [psychoPassword, setPsychoPassword] = useState("");
  const [psychoConfirmPassword, setPsychoConfirmPassword] = useState("");
  
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  // Redirect already-authenticated users to their dashboard
  useEffect(() => {
    if (isAuthenticated && user) {
      const role = user.role ?? user.user_type;
      if (role === "student") navigate("/student");
      else if (role === "psychologist") navigate("/counselor");
      else navigate("/admin");
    }
  }, [isAuthenticated, user, navigate]);

  // Auto-initiate OIDC when not authenticated and fallback not requested
  useEffect(() => {
    if (!isAuthenticated && !showFallback) {
      // Clear any stale auth data before redirecting to Campus One
      localStorage.removeItem("safespace_access_token");
      localStorage.removeItem("ss_user");
      window.location.href = `${API_URL}/auth/campus-one/authorize`;
    }
  }, [isAuthenticated, showFallback, API_URL]);

  // ── SIGN IN LOGIC ──

  const validateSignInInputs = (): boolean => {
    if (signInRole === "student") {
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

  const submitSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateSignInInputs()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await login(signInRole, identifier, password);
      toast.success("Welcome back!");

      if (signInRole === "student") {
        navigate("/student");
      } else if (signInRole === "psychologist") {
        navigate("/counselor");
      } else if (signInRole === "admin") {
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

  // ── SIGN UP LOGIC ──

  const validateSignUp = (): boolean => {
    const errors: Record<string, string> = {};

    if (signUpRole === "student") {
      if (!studentFullName.trim()) errors.studentFullName = "Full name is required";
      if (!studentId.trim()) errors.studentId = "Student ID is required";
      if (!studentIdRegex.test(studentId.trim())) errors.studentId = "Student ID must be 9 digits";
      if (!studentEmail.trim()) errors.studentEmail = "Email is required";
      if (!emailRegex.test(studentEmail.trim())) errors.studentEmail = "Invalid email format";
      if (!studentPassword) errors.studentPassword = "Password is required";
      if (studentPassword.length < 8) errors.studentPassword = "Password must be at least 8 characters";
      if (!studentConfirmPassword) errors.studentConfirmPassword = "Confirm password is required";
      if (studentPassword !== studentConfirmPassword) {
        errors.studentConfirmPassword = "Passwords do not match";
      }
    } else {
      if (!psychoFullName.trim()) errors.psychoFullName = "Full name is required";
      if (!psychoStaffId.trim()) errors.psychoStaffId = "Staff ID is required";
      if (!psychoEmail.trim()) errors.psychoEmail = "Email is required";
      if (!emailRegex.test(psychoEmail.trim())) errors.psychoEmail = "Invalid email format";
      if (!psychoPassword) errors.psychoPassword = "Password is required";
      if (psychoPassword.length < 8) errors.psychoPassword = "Password must be at least 8 characters";
      if (!psychoConfirmPassword) errors.psychoConfirmPassword = "Confirm password is required";
      if (psychoPassword !== psychoConfirmPassword) {
        errors.psychoConfirmPassword = "Passwords do not match";
      }
    }

    setSignUpFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submitSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignUpError("");

    if (!validateSignUp()) {
      return;
    }

    setIsSignUpSubmitting(true);

    try {
      let payload: Record<string, string>;

      if (signUpRole === "student") {
        payload = {
          email: studentEmail.toLowerCase(),
          password: studentPassword,
          full_name: studentFullName,
          user_type: "student",
          student_id: studentId,
          class_level: studentClassLevel || "",
          emergency_contact: studentEmergencyContact || "",
          emergency_phone: studentEmergencyPhone || "",
        };
      } else {
        payload = {
          email: psychoEmail.toLowerCase(),
          password: psychoPassword,
          full_name: psychoFullName,
          user_type: "staff",
          staff_id: psychoStaffId,
          staff_type: "psychologist",
        };
      }

      await registerUser(payload);
      
      toast.success("Account created successfully! Please sign in.");
      setSignUpSuccess(true);
      
      // Reset form and switch to sign in tab
      if (signUpRole === "student") {
        setIdentifier(studentEmail);
        setStudentFullName("");
        setStudentId("");
        setStudentEmail("");
        setStudentPassword("");
        setStudentConfirmPassword("");
        setStudentClassLevel("");
        setStudentEmergencyContact("");
        setStudentEmergencyPhone("");
      } else {
        setIdentifier(psychoEmail);
        setPsychoFullName("");
        setPsychoStaffId("");
        setPsychoEmail("");
        setPsychoPassword("");
        setPsychoConfirmPassword("");
      }
      
      // Switch to sign in tab after a delay
      setTimeout(() => {
        setSignUpSuccess(false);
      }, 2000);
    } catch (err) {
      const error = err as ApiError;
      let message = "Something went wrong. Please try again.";

      if (error.status === 409) {
        message = "An account with this email already exists.";
      } else if (error.status === 422) {
        message = "Please check your details and try again.";
      }

      setSignUpError(message);
    } finally {
      setIsSignUpSubmitting(false);
    }
  };

  // Show OIDC redirect spinner if not showing fallback
  if (!showFallback) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <Logo />
        <div className="h-10 w-10 rounded-full border-2 border-muted border-t-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Redirecting to Campus One…</p>
        <button
          className="text-xs text-muted-foreground underline mt-4 hover:text-foreground transition-colors"
          onClick={() => setShowFallback(true)}
        >
          Sign in with email & password instead
        </button>
      </div>
    );
  }

  // Fallback: password login form
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
          <h2 className="font-display text-3xl font-bold">Welcome to SafeSpace</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage your wellness journey</p>

          <Tabs defaultValue="signin" className="mt-6 w-full">
            <TabsList className="grid w-full grid-cols-2 p-1 rounded-full bg-muted">
              <TabsTrigger value="signin" className="rounded-full">Sign In</TabsTrigger>
              <TabsTrigger value="signup" className="rounded-full">Sign Up</TabsTrigger>
            </TabsList>

            {/* ── SIGN IN TAB ── */}
            <TabsContent value="signin" className="mt-6 space-y-4">
              <button
                type="button"
                onClick={() => setShowFallback(false)}
                className="text-xs text-muted-foreground underline hover:text-foreground transition-colors"
              >
                ← Back to Campus One sign-in
              </button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="px-2 bg-background text-muted-foreground">Email & password</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1 p-1 rounded-full bg-muted">
                {SIGNIN_ROLES.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSignInRole(r.id)}
                    className={cn(
                      "py-2 px-3 text-sm font-medium rounded-full transition-all",
                      signInRole === r.id
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>

              <form onSubmit={submitSignIn} className="space-y-4">
                <div>
                  <Label htmlFor="identifier">
                    {signInRole === "student" ? "Student ID or Email" : "Email Address"}
                  </Label>
                  <Input
                    id="identifier"
                    type={signInRole === "student" ? "text" : "email"}
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={signInRole === "student" ? "e.g. STU001 or stu001@student.nileuniversity.edu.ng" : "you@nileuni.edu"}
                    required
                    className={cn("mt-1.5 focus-visible:ring-primary", error && "border-destructive focus-visible:ring-destructive")}
                  />
                  {signInRole === "student" && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Enter your Student ID (e.g. STU001) or your full student email.
                    </p>
                  )}
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
                  {isSubmitting ? (
                    <><NeonSpinner size={16} className="mr-2" /> Signing in…</>
                  ) : (
                    <>Sign In <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition" /></>
                  )}
                </Button>
              </form>

              <div className="mt-6 p-3 rounded-xl bg-muted/60 border border-border text-xs">
                <div className="label-eyebrow mb-1.5">Demo credentials</div>
                <div className="font-mono text-[11px] space-y-0.5">
                  <div>{HINTS[signInRole].identifier}</div>
                  <div className="text-muted-foreground">{HINTS[signInRole].pwd}</div>
                </div>
              </div>
            </TabsContent>

            {/* ── SIGN UP TAB ── */}
            <TabsContent value="signup" className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-1 p-1 rounded-full bg-muted">
                {SIGNUP_ROLES.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSignUpRole(r.id)}
                    className={cn(
                      "py-2 px-3 text-sm font-medium rounded-full transition-all",
                      signUpRole === r.id
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>

              {signUpSuccess && (
                <div className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full bg-green-600" />
                  Account created! Signing in...
                </div>
              )}

              {signUpError && (
                <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg p-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {signUpError}
                </div>
              )}

              <form onSubmit={submitSignUp} className="space-y-4">
                {signUpRole === "student" ? (
                  <>
                    {/* Student Sign Up Fields */}
                    <div>
                      <Label htmlFor="studentFullName">Full Name</Label>
                      <Input
                        id="studentFullName"
                        type="text"
                        value={studentFullName}
                        onChange={(e) => setStudentFullName(e.target.value)}
                        placeholder="e.g., John Doe"
                        className={cn("mt-1.5", signUpFieldErrors.studentFullName && "border-destructive")}
                      />
                      {signUpFieldErrors.studentFullName && (
                        <p className="text-xs text-destructive mt-1">{signUpFieldErrors.studentFullName}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="studentId">Student ID</Label>
                      <Input
                        id="studentId"
                        type="text"
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value)}
                        placeholder="e.g. 241030217"
                        className={cn("mt-1.5", signUpFieldErrors.studentId && "border-destructive")}
                      />
                      {signUpFieldErrors.studentId && (
                        <p className="text-xs text-destructive mt-1">{signUpFieldErrors.studentId}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="studentEmail">Email Address</Label>
                      <Input
                        id="studentEmail"
                        type="email"
                        value={studentEmail}
                        onChange={(e) => setStudentEmail(e.target.value)}
                        placeholder="student@nileuni.edu"
                        className={cn("mt-1.5", signUpFieldErrors.studentEmail && "border-destructive")}
                      />
                      {signUpFieldErrors.studentEmail && (
                        <p className="text-xs text-destructive mt-1">{signUpFieldErrors.studentEmail}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="studentPassword">Password</Label>
                      <Input
                        id="studentPassword"
                        type="password"
                        value={studentPassword}
                        onChange={(e) => setStudentPassword(e.target.value)}
                        placeholder="Min 8 characters"
                        className={cn("mt-1.5", signUpFieldErrors.studentPassword && "border-destructive")}
                      />
                      {signUpFieldErrors.studentPassword && (
                        <p className="text-xs text-destructive mt-1">{signUpFieldErrors.studentPassword}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="studentConfirmPassword">Confirm Password</Label>
                      <Input
                        id="studentConfirmPassword"
                        type="password"
                        value={studentConfirmPassword}
                        onChange={(e) => setStudentConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className={cn("mt-1.5", signUpFieldErrors.studentConfirmPassword && "border-destructive")}
                      />
                      {signUpFieldErrors.studentConfirmPassword && (
                        <p className="text-xs text-destructive mt-1">{signUpFieldErrors.studentConfirmPassword}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="studentClassLevel">Class Level (Optional)</Label>
                      <Input
                        id="studentClassLevel"
                        type="text"
                        value={studentClassLevel}
                        onChange={(e) => setStudentClassLevel(e.target.value)}
                        placeholder="e.g., 100 Level"
                        className="mt-1.5"
                      />
                    </div>

                    <div>
                      <Label htmlFor="studentEmergencyContact">Emergency Contact Name (Optional)</Label>
                      <Input
                        id="studentEmergencyContact"
                        type="text"
                        value={studentEmergencyContact}
                        onChange={(e) => setStudentEmergencyContact(e.target.value)}
                        placeholder="e.g., Jane Doe"
                        className="mt-1.5"
                      />
                    </div>

                    <div>
                      <Label htmlFor="studentEmergencyPhone">Emergency Phone (Optional)</Label>
                      <Input
                        id="studentEmergencyPhone"
                        type="tel"
                        value={studentEmergencyPhone}
                        onChange={(e) => setStudentEmergencyPhone(e.target.value)}
                        placeholder="e.g., +234 XXX XXX XXXX"
                        className="mt-1.5"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {/* Psychologist Sign Up Fields */}
                    <div>
                      <Label htmlFor="psychoFullName">Full Name</Label>
                      <Input
                        id="psychoFullName"
                        type="text"
                        value={psychoFullName}
                        onChange={(e) => setPsychoFullName(e.target.value)}
                        placeholder="e.g., Dr. John Smith"
                        className={cn("mt-1.5", signUpFieldErrors.psychoFullName && "border-destructive")}
                      />
                      {signUpFieldErrors.psychoFullName && (
                        <p className="text-xs text-destructive mt-1">{signUpFieldErrors.psychoFullName}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="psychoStaffId">Staff ID</Label>
                      <Input
                        id="psychoStaffId"
                        type="text"
                        value={psychoStaffId}
                        onChange={(e) => setPsychoStaffId(e.target.value)}
                        placeholder="e.g., PSY001"
                        className={cn("mt-1.5", signUpFieldErrors.psychoStaffId && "border-destructive")}
                      />
                      {signUpFieldErrors.psychoStaffId && (
                        <p className="text-xs text-destructive mt-1">{signUpFieldErrors.psychoStaffId}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="psychoEmail">Email Address</Label>
                      <Input
                        id="psychoEmail"
                        type="email"
                        value={psychoEmail}
                        onChange={(e) => setPsychoEmail(e.target.value)}
                        placeholder="staff@nileuni.edu"
                        className={cn("mt-1.5", signUpFieldErrors.psychoEmail && "border-destructive")}
                      />
                      {signUpFieldErrors.psychoEmail && (
                        <p className="text-xs text-destructive mt-1">{signUpFieldErrors.psychoEmail}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="psychoPassword">Password</Label>
                      <Input
                        id="psychoPassword"
                        type="password"
                        value={psychoPassword}
                        onChange={(e) => setPsychoPassword(e.target.value)}
                        placeholder="Min 8 characters"
                        className={cn("mt-1.5", signUpFieldErrors.psychoPassword && "border-destructive")}
                      />
                      {signUpFieldErrors.psychoPassword && (
                        <p className="text-xs text-destructive mt-1">{signUpFieldErrors.psychoPassword}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="psychoConfirmPassword">Confirm Password</Label>
                      <Input
                        id="psychoConfirmPassword"
                        type="password"
                        value={psychoConfirmPassword}
                        onChange={(e) => setPsychoConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className={cn("mt-1.5", signUpFieldErrors.psychoConfirmPassword && "border-destructive")}
                      />
                      {signUpFieldErrors.psychoConfirmPassword && (
                        <p className="text-xs text-destructive mt-1">{signUpFieldErrors.psychoConfirmPassword}</p>
                      )}
                    </div>
                  </>
                )}

                <Button
                  type="submit"
                  className="w-full gradient-primary text-primary-foreground border-0 h-11 group"
                  disabled={isSignUpSubmitting}
                >
                  {isSignUpSubmitting ? (
                    <><NeonSpinner size={16} className="mr-2" /> Creating account…</>
                  ) : (
                    <>Create Account <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition" /></>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
