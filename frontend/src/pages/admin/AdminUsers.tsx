import { useState } from "react";
import { Plus, Search, AlertCircle, LogOut, ChevronLeft, ChevronRight, Copy, Check } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { AppShell } from "@/components/AppSidebar";
import { adminSidebarItems } from "@/data/sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Student, Staff } from "@/api/students";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import type { PaginationInfo } from "@/api/types";
import { useStudents, useStaff } from "@/hooks/queries";
import { useCreateStaff } from "@/hooks/mutations";

const INVITE_LINK = "https://crisis-awareness-booking-system.vercel.app/login";

export default function AdminUsers() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [studentsOffset, setStudentsOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [addStaffOpen, setAddStaffOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // React Query hooks
  const { data: studentsData, isLoading: studentsLoading, refetch: refetchStudents } = useStudents(10, studentsOffset);
  const { data: staffData, isLoading: staffLoading, refetch: refetchStaff } = useStaff(10, 0);

  const { mutateAsync: createStaffMutate } = useCreateStaff();

  const students = studentsData?.data || [];
  const studentsPagination = studentsData?.pagination;
  const staff = staffData?.data || [];
  const error = null;

  const filteredStudents = students.filter(s => 
    s.full_name.toLowerCase().includes(search.toLowerCase()) || 
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.student_id.toLowerCase().includes(search.toLowerCase())
  );

  const filteredStaff = staff.filter(s => 
    s.full_name.toLowerCase().includes(search.toLowerCase()) || 
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  const copyInviteLink = () => {
    navigator.clipboard.writeText(INVITE_LINK);
    setLinkCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setLinkCopied(false), 2000);
  };

  return (
    <AppShell items={adminSidebarItems}>
      <div className="flex flex-col md:flex-row md:items-center justify-between py-4 md:h-16 px-4 md:px-8 border-b border-border bg-background/60 backdrop-blur-sm sticky top-0 z-30 gap-3 md:gap-0">
        <div className="flex items-center justify-between w-full md:w-auto">
          <div>
            <h1 className="font-display text-xl font-bold">User Management</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Manage students and staff.</p>
          </div>
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={() => { logout(); navigate("/login"); }} className="rounded-full h-9 w-9">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          <div className="relative flex-1 md:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..." className="pl-9 h-9 w-full md:w-64" />
          </div>
          <div className="hidden md:flex">
            <ThemeToggle />
          </div>
        </div>
      </div>

      <div className="p-4 md:p-8 space-y-8 animate-fade-in">
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 text-destructive text-sm font-medium border border-destructive/20">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {/* Invite Link Section */}
        <div className="glass border border-border rounded-3xl p-6">
          <div className="mb-4">
            <h2 className="font-display text-lg font-bold">Students</h2>
            <p className="text-sm text-muted-foreground">Students self-register using the Sign Up page. Share this link with students:</p>
          </div>
          <div className="flex gap-2 items-center p-3 rounded-lg bg-muted border border-border">
            <input
              type="text"
              value={INVITE_LINK}
              readOnly
              className="flex-1 bg-transparent text-sm font-mono outline-none"
            />
            <Button
              onClick={copyInviteLink}
              size="sm"
              variant="ghost"
              className="gap-2"
            >
              {linkCopied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Student Directory */}
        <div className="glass border border-border rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-lg font-bold">Student Directory</h2>
              <p className="text-sm text-muted-foreground">
                {studentsPagination?.total || 0} students enrolled
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="text-left p-3">Name</th><th className="text-left p-3">Email</th><th className="text-left p-3">Level</th><th className="text-left p-3">Faculty</th><th className="text-left p-3">Student ID</th><th className="text-left p-3">Added</th><th className="text-left p-3">Status</th><th className="text-left p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {studentsLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      {Array(8).fill(0).map((_, j) => (
                        <td key={j} className="p-3"><div className="h-4 w-full bg-muted animate-pulse rounded" /></td>
                      ))}
                    </tr>
                  ))
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">No students found</td>
                  </tr>
                ) : filteredStudents.map((u) => (
                  <tr key={u.student_id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                    <td className="p-3 font-medium">
                      <Link to={`/admin/student/${u.student_id}`} className="hover:underline text-primary">
                        {u.full_name}
                      </Link>
                    </td>
                    <td className="p-3 text-muted-foreground font-mono text-xs">{u.email}</td>
                    <td className="p-3 text-muted-foreground">{u.class_level || "—"}</td>
                    <td className="p-3 text-muted-foreground">{(u as any).faculty || "—"}</td>
                    <td className="p-3 font-mono text-xs">
                      <Link to={`/admin/student/${u.student_id}`} className="hover:underline text-primary">
                        {u.student_id}
                      </Link>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="p-3">
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider", 
                        (u as any).crisis_flag ? "bg-destructive/15 text-destructive" : "bg-success/15 text-success-foreground"
                      )}>
                        {(u as any).crisis_flag ? "At Risk" : "Active"}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => toast.success("Feature coming soon")}>
                          Deactivate
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="flex items-center justify-between mt-6">
            <div className="text-xs text-muted-foreground">
              Showing {studentsOffset + 1} to {Math.min(studentsOffset + 10, studentsPagination?.total || 0)} of {studentsPagination?.total || 0} students
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={studentsOffset === 0}
                onClick={() => {
                  const newOffset = studentsOffset - 10;
                  setStudentsOffset(newOffset);
                }}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!studentsPagination?.has_next}
                onClick={() => {
                  const newOffset = studentsOffset + 10;
                  setStudentsOffset(newOffset);
                }}
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>

        {/* Staff */}
        <div className="glass border border-border rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-lg font-bold">Add Staff</h2>
              <p className="text-sm text-muted-foreground">{filteredStaff.length} active staff members</p>
            </div>
            <Button onClick={() => setAddStaffOpen(true)} size="sm" className="gradient-primary text-primary-foreground border-0"><Plus className="h-4 w-4 mr-1.5" /> Add Staff</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="text-left p-3">Name</th><th className="text-left p-3">Email</th><th className="text-left p-3">Staff ID</th><th className="text-left p-3">Specialty</th><th className="text-left p-3">Added</th><th className="text-left p-3">Status</th><th className="text-left p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {staffLoading ? (
                  Array(3).fill(0).map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      {Array(7).fill(0).map((_, j) => (
                        <td key={j} className="p-3"><div className="h-4 w-full bg-muted animate-pulse rounded" /></td>
                      ))}
                    </tr>
                  ))
                ) : filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">No staff found</td>
                  </tr>
                ) : filteredStaff.map((u) => (
                  <tr key={u.staff_id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                    <td className="p-3 font-medium">{u.full_name}</td>
                    <td className="p-3 text-muted-foreground font-mono text-xs">{u.email}</td>
                    <td className="p-3 font-mono text-xs">{u.staff_id}</td>
                    <td className="p-3 text-muted-foreground">{u.specialty || "—"}</td>
                    <td className="p-3 text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="p-3">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-primary/10 text-primary">Active</span>
                    </td>
                    <td className="p-3">
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => toast.success(`Password reset link sent to ${u.email}`)}>Reset Password</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AddStaffModal 
        open={addStaffOpen} 
        onOpenChange={setAddStaffOpen} 
        onSuccess={fetchStaff} 
      />
    </AppShell>
  );
}

function AddStaffModal({ open, onOpenChange, onSuccess }: { open: boolean; onOpenChange: (v: boolean) => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ full_name: "", email: "", password: "", staff_id: "", specialty: "General" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!form.full_name || !form.email || !form.password || !form.staff_id) return toast.error("Fill all required fields");
    
    setLoading(true);
    setError(null);
    try {
      await createStaff(form);
      toast.success("Staff member added successfully");
      onSuccess();
      onOpenChange(false);
      setForm({ full_name: "", email: "", password: "", staff_id: "", specialty: "General" });
    } catch (err) {
      setError("Failed to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Staff Member</DialogTitle></DialogHeader>
        
        {error && (
          <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-xs border border-destructive/20 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-2">
          <div className="col-span-1 md:col-span-2">
            <Label>Full Name</Label>
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="mt-1" />
          </div>
          <div className="col-span-1 md:col-span-2">
            <Label>Email Address</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1" />
          </div>
          <div>
            <Label>Staff ID</Label>
            <Input value={form.staff_id} onChange={(e) => setForm({ ...form, staff_id: e.target.value })} className="mt-1" placeholder="e.g. PSY001" />
          </div>
          <div>
            <Label>Temporary Password</Label>
            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="mt-1" />
          </div>
          <div className="col-span-1 md:col-span-2">
            <Label>Specialty / Department</Label>
            <Input value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} className="mt-1" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={submit} disabled={loading} className="gradient-primary text-primary-foreground border-0 min-w-[120px]">
            {loading ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Add Staff"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
