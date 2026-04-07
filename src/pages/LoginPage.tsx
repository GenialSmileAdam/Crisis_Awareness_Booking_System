import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { UserRole } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Brain } from "lucide-react";

const roleRoutes: Record<UserRole, string> = {
  student: "/student/dashboard",
  counselor: "/counselor/dashboard",
  admin: "/admin/dashboard",
  family: "/family/dashboard",
};

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("student");
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
    <div className="min-h-screen flex items-center justify-center bg-secondary/30">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="h-14 w-14 rounded-full bg-primary flex items-center justify-center">
              <Brain className="h-7 w-7 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl">MindBridge</CardTitle>
          <p className="text-sm text-muted-foreground">School Psychology Platform</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" placeholder="you@university.edu" value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" placeholder="••••••••" value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }} />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <div className="grid grid-cols-4 gap-2">
                {roles.map((r) => (
                  <Button
                    key={r.value}
                    type="button"
                    variant={role === r.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setRole(r.value)}
                    className={role === r.value ? "" : ""}
                  >
                    {r.label}
                  </Button>
                ))}
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full">Login</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;
