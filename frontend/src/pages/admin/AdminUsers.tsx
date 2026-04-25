import { useMemo, useRef, useState } from "react";
import { Upload, Download, Plus, Search, AlertCircle, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/AppSidebar";
import { adminSidebarItems } from "@/data/sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STUDENTS, COUNSELORS, FACULTIES, downloadCSV } from "@/data/mock";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Row {
  id: string; first_name: string; last_name: string; email: string; role: "Student" | "Psychologist"; faculty: string; matric: string; date: string; status: "Active" | "Inactive"; classLevel?: string;
}

const initialUsers: Row[] = [
  ...STUDENTS.map((s, i) => ({
    id: s.id, first_name: s.name.split(" ")[0], last_name: s.name.split(" ")[1], email: s.email, role: "Student" as const, faculty: s.faculty, matric: s.matric,
    date: s.lastCheckIn, status: i % 5 === 0 ? "Inactive" as const : "Active" as const, classLevel: s.classLevel,
  })),
  ...COUNSELORS.map((n, i) => ({
    id: `PSY-${i + 1}`, first_name: n.split(" ")[1], last_name: n.split(" ")[2], email: `${n.split(" ")[1].toLowerCase()}@nileuni.edu`, role: "Psychologist" as const,
    faculty: FACULTIES[i % FACULTIES.length], matric: `241099${100 + i}`, date: "2024-01-10", status: "Active" as const,
  })),
];

export default function AdminUsers() {
  const [users, setUsers] = useState<Row[]>(initialUsers);
  const [search, setSearch] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [addPsychOpen, setAddPsychOpen] = useState(false);

  const students = useMemo(() => {
    return users.filter((u) => u.role === "Student" && (`${u.first_name} ${u.last_name}`.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())));
  }, [users, search]);

  const psychologists = useMemo(() => {
    return users.filter((u) => u.role === "Psychologist" && (`${u.first_name} ${u.last_name}`.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())));
  }, [users, search]);

  return (
    <AppShell items={adminSidebarItems}>
      <div className="flex items-center justify-between h-16 px-8 border-b border-border">
        <div>
          <h1 className="font-display text-xl font-bold">User Management</h1>
          <p className="text-xs text-muted-foreground">Manage students and psychologist staff.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..." className="pl-9 h-9 w-64" />
          </div>
          <ThemeToggle />
        </div>
      </div>

      <div className="p-8 space-y-8 animate-fade-in">
        {/* Student Directory */}
        <div className="glass border border-border rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-lg font-bold">Student Directory</h2>
              <p className="text-sm text-muted-foreground">{students.length} students enrolled</p>
            </div>
            <Button onClick={() => setImportOpen(true)} size="sm" variant="outline"><Upload className="h-4 w-4 mr-1.5" /> Bulk Import</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="text-left p-3">Name</th><th className="text-left p-3">Email</th><th className="text-left p-3">Level</th><th className="text-left p-3">Faculty</th><th className="text-left p-3">Student ID</th><th className="text-left p-3">Status</th><th className="text-left p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.slice(0, 10).map((u) => (
                  <tr key={u.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                    <td className="p-3 font-medium">{u.first_name} {u.last_name}</td>
                    <td className="p-3 text-muted-foreground font-mono text-xs">{u.email}</td>
                    <td className="p-3 text-muted-foreground">{u.classLevel}</td>
                    <td className="p-3 text-muted-foreground">{u.faculty}</td>
                    <td className="p-3 font-mono text-xs">{u.matric}</td>
                    <td className="p-3">
                      <span className={cn("text-xs px-2.5 py-0.5 rounded-full font-medium", u.status === "Active" ? "bg-success/15 text-success-foreground" : "bg-muted text-muted-foreground")}>{u.status}</span>
                    </td>
                    <td className="p-3">
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setUsers(arr => arr.map(x => x.id === u.id ? { ...x, status: x.status === "Active" ? "Inactive" : "Active" } : x))}>
                        {u.status === "Active" ? "Deactivate" : "Activate"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Psychologist Staff */}
        <div className="glass border border-border rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-lg font-bold">Psychologist Staff</h2>
              <p className="text-sm text-muted-foreground">{psychologists.length} active psychologists</p>
            </div>
            <Button onClick={() => setAddPsychOpen(true)} size="sm" className="gradient-primary text-primary-foreground border-0"><Plus className="h-4 w-4 mr-1.5" /> Add Psychologist</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="text-left p-3">Name</th><th className="text-left p-3">Email</th><th className="text-left p-3">Department</th><th className="text-left p-3">Status</th><th className="text-left p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {psychologists.map((u) => (
                  <tr key={u.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                    <td className="p-3 font-medium">{u.first_name} {u.last_name}</td>
                    <td className="p-3 text-muted-foreground font-mono text-xs">{u.email}</td>
                    <td className="p-3 text-muted-foreground">{u.faculty}</td>
                    <td className="p-3">
                      <span className={cn("text-xs px-2.5 py-0.5 rounded-full font-medium", u.status === "Active" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>{u.status}</span>
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

      <BulkImportModal open={importOpen} onOpenChange={setImportOpen} />
      <AddPsychologistModal open={addPsychOpen} onOpenChange={setAddPsychOpen} onCreate={(u) => setUsers((arr) => [u, ...arr])} />
    </AppShell>
  );
}

function BulkImportModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = () => {
    if (!file) return;
    toast.success("Student roster imported successfully");
    setFile(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Upload CSV of Student Roster</DialogTitle></DialogHeader>
        <div className="py-4">
          <input ref={fileRef} type="file" accept=".csv" hidden onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 hover:bg-primary/5 transition"
          >
            <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
            <div className="font-medium text-sm">{file ? file.name : "Click to browse CSV file"}</div>
          </button>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleUpload} disabled={!file} className="gradient-primary text-primary-foreground border-0">Import Roster</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddPsychologistModal({ open, onOpenChange, onCreate }: { open: boolean; onOpenChange: (v: boolean) => void; onCreate: (u: Row) => void }) {
  const [form, setForm] = useState({ first: "", last: "", email: "", password: "", faculty: "Counseling" });
  const submit = () => {
    if (!form.first || !form.last || !form.email || !form.password) return toast.error("Fill all required fields");
    onCreate({
      id: `PSY-${Date.now()}`, first_name: form.first, last_name: form.last, email: form.email, role: "Psychologist",
      faculty: form.faculty, matric: `P-${Date.now().toString().slice(-4)}`, date: new Date().toISOString().split("T")[0], status: "Active",
    });
    toast.success("Psychologist added successfully");
    onOpenChange(false);
    setForm({ first: "", last: "", email: "", password: "", faculty: "Counseling" });
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Psychologist</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div><Label>First name</Label><Input value={form.first} onChange={(e) => setForm({ ...form, first: e.target.value })} className="mt-1" /></div>
          <div><Label>Last name</Label><Input value={form.last} onChange={(e) => setForm({ ...form, last: e.target.value })} className="mt-1" /></div>
          <div className="col-span-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1" /></div>
          <div className="col-span-2"><Label>Temporary Password</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="mt-1" /></div>
          <div className="col-span-2"><Label>Department</Label><Input value={form.faculty} onChange={(e) => setForm({ ...form, faculty: e.target.value })} className="mt-1" /></div>
        </div>
        <DialogFooter><Button onClick={submit} className="gradient-primary text-primary-foreground border-0">Add Psychologist</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
