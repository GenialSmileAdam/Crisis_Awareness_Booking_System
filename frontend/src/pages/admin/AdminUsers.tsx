import { useMemo, useRef, useState } from "react";
import { Upload, Download, Plus, Search, AlertCircle, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/AppSidebar";
import { adminItems } from "./AdminDashboard";
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
  id: string; first_name: string; last_name: string; email: string; role: "Student" | "Counselor"; faculty: string; matric: string; date: string; status: "Active" | "Inactive";
}

const initialUsers: Row[] = [
  ...STUDENTS.map((s, i) => ({
    id: s.id, first_name: s.name.split(" ")[0], last_name: s.name.split(" ")[1], email: s.email, role: "Student" as const, faculty: s.faculty, matric: s.matric,
    date: s.lastCheckIn, status: i % 5 === 0 ? "Inactive" as const : "Active" as const,
  })),
  ...COUNSELORS.map((n, i) => ({
    id: `CSL-${i + 1}`, first_name: n.split(" ")[1], last_name: n.split(" ")[2], email: `${n.split(" ")[1].toLowerCase()}@nileuni.edu`, role: "Counselor" as const,
    faculty: FACULTIES[i % FACULTIES.length], matric: `241099${100 + i}`, date: "2024-01-10", status: "Active" as const,
  })),
];

export default function AdminUsers() {
  const [users, setUsers] = useState<Row[]>(initialUsers);
  const [filter, setFilter] = useState<"All" | "Student" | "Counselor">("All");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [csvFile, setCsvFile] = useState<{ name: string; rows: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<"success" | "error" | null>(null);
  const [uploadCount, setUploadCount] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    let r = users;
    if (filter !== "All") r = r.filter((u) => u.role === filter);
    if (search) r = r.filter((u) => `${u.first_name} ${u.last_name}`.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));
    return r;
  }, [users, filter, search]);

  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const onCsv = (f?: File) => {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".csv")) return toast.error("Please upload a .csv file");
    const rows = 47;
    setCsvFile({ name: f.name, rows });
    setUploadResult(null);
    toast.success(`${rows} rows detected`);
  };

  const onUpload = () => {
    setUploading(true);
    setTimeout(() => {
      setUploading(false);
      // alternate result on each upload
      const next = uploadCount % 2 === 0 ? "success" : "error";
      setUploadResult(next);
      setUploadCount((c) => c + 1);
      if (next === "success") toast.success("47 users created successfully");
      else toast.error("3 rows failed");
    }, 1000);
  };

  const downloadTemplate = () => {
    downloadCSV("safespace_user_template.csv", [
      ["first_name", "last_name", "email", "role", "faculty", "student_id"],
      ["Chidi", "Okafor", "chidi.okafor@nileuni.edu", "student", "Engineering", "241030217"],
    ]);
    toast.success("Template downloaded");
  };

  const downloadErrors = () => {
    downloadCSV("error_report.csv", [
      ["row", "email", "error"],
      ["12", "bad-email", "Invalid email format"],
      ["27", "duplicate@nileuni.edu", "Email already exists"],
      ["41", "", "Missing required field: email"],
    ]);
    toast.success("Error report downloaded");
  };

  return (
    <AppShell items={adminItems}>
      <div className="flex items-center justify-between h-16 px-8 border-b border-border">
        <div>
          <h1 className="font-display text-xl font-bold">User Management</h1>
          <p className="text-xs text-muted-foreground">Onboard students and counselors via CSV upload.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setAddOpen(true)} size="sm" className="gradient-primary text-primary-foreground border-0"><Plus className="h-4 w-4 mr-1.5" /> Add Single User</Button>
          <ThemeToggle />
        </div>
      </div>

      <div className="p-8 space-y-6">
        {/* CSV Upload */}
        <div className="glass border border-border rounded-3xl p-6">
          <div className="flex items-start justify-between mb-4 gap-3 flex-wrap">
            <div>
              <h2 className="font-display text-lg font-bold">Bulk import</h2>
              <p className="text-sm text-muted-foreground">CSV with first_name, last_name, email, role, faculty, student_id</p>
            </div>
            <Button variant="outline" size="sm" onClick={downloadTemplate}><Download className="h-4 w-4 mr-1.5" /> Download CSV Template</Button>
          </div>
          <input ref={fileRef} type="file" accept=".csv" hidden onChange={(e) => onCsv(e.target.files?.[0])} />
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-border rounded-2xl p-10 text-center hover:border-primary/50 hover:bg-primary/5 transition"
          >
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <div className="font-medium">Drag & drop your CSV file here, or click to browse</div>
            <div className="text-xs text-muted-foreground mt-1">.csv only · max 5MB</div>
          </button>

          {csvFile && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                <div className="text-sm"><span className="font-medium">{csvFile.name}</span> · <span className="text-muted-foreground">{csvFile.rows} rows detected</span></div>
                <Button size="sm" onClick={onUpload} disabled={uploading} className="gradient-primary text-primary-foreground border-0">
                  {uploading ? "Uploading..." : "Upload & Create Users"}
                </Button>
              </div>
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 text-muted-foreground"><tr>
                    <th className="text-left p-2">first_name</th><th className="text-left p-2">last_name</th><th className="text-left p-2">email</th><th className="text-left p-2">role</th><th className="text-left p-2">faculty</th>
                  </tr></thead>
                  <tbody>
                    {STUDENTS.slice(0, 5).map((s) => (
                      <tr key={s.id} className="border-t border-border">
                        <td className="p-2">{s.name.split(" ")[0]}</td>
                        <td className="p-2">{s.name.split(" ")[1]}</td>
                        <td className="p-2 font-mono">{s.email}</td>
                        <td className="p-2">student</td>
                        <td className="p-2">{s.faculty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {uploadResult === "success" && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-success/10 border border-success/30 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-success" /> 47 users created successfully.
                </div>
              )}
              {uploadResult === "error" && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-sm">
                  <div className="flex items-center gap-2"><AlertCircle className="h-4 w-4 text-destructive" /> 3 rows failed.</div>
                  <Button size="sm" variant="outline" onClick={downloadErrors}><Download className="h-3.5 w-3.5 mr-1.5" /> Download Error Report</Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Users table */}
        <div className="glass border border-border rounded-3xl p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <h2 className="font-display text-xl font-bold">Existing users</h2>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search name/email..." className="pl-9 h-9 w-56" />
              </div>
              <div className="flex gap-1 p-1 rounded-full bg-muted">
                {(["All", "Student", "Counselor"] as const).map((t) => (
                  <button key={t} onClick={() => { setFilter(t); setPage(1); }} className={cn("px-3 py-1 text-xs font-semibold rounded-full transition", filter === t ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>{t}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="text-left p-3">Name</th><th className="text-left p-3">Email</th><th className="text-left p-3">Role</th><th className="text-left p-3">Faculty</th><th className="text-left p-3">Student ID</th><th className="text-left p-3">Added</th><th className="text-left p-3">Status</th><th className="text-left p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((u) => (
                  <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="p-3 font-medium">{u.first_name} {u.last_name}</td>
                    <td className="p-3 text-muted-foreground font-mono text-xs">{u.email}</td>
                    <td className="p-3">{u.role}</td>
                    <td className="p-3 text-muted-foreground">{u.faculty}</td>
                    <td className="p-3 font-mono text-xs">{u.matric}</td>
                    <td className="p-3 text-muted-foreground">{u.date}</td>
                    <td className="p-3">
                      <span className={cn("text-xs px-2.5 py-0.5 rounded-full font-medium", u.status === "Active" ? "bg-success/15 text-foreground" : "bg-muted text-muted-foreground")}>{u.status}</span>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setUsers(arr => arr.map(x => x.id === u.id ? { ...x, status: x.status === "Active" ? "Inactive" : "Active" } : x))}>
                          {u.status === "Active" ? "Deactivate" : "Activate"}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => toast.success(`Password reset email sent to ${u.email}`)}>Reset</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
            <span>Showing {pageRows.length} of {filtered.length}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
              <span className="px-3 py-1.5">{page} / {pageCount}</span>
              <Button size="sm" variant="outline" disabled={page >= pageCount} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        </div>
      </div>

      <AddUserModal open={addOpen} onOpenChange={setAddOpen} onCreate={(u) => setUsers((arr) => [u, ...arr])} />
    </AppShell>
  );
}

function AddUserModal({ open, onOpenChange, onCreate }: { open: boolean; onOpenChange: (v: boolean) => void; onCreate: (u: Row) => void }) {
  const [form, setForm] = useState({ first: "", last: "", email: "", role: "Student" as "Student" | "Counselor", faculty: FACULTIES[0], matric: "" });
  const submit = () => {
    if (!form.first || !form.last || !form.email) return toast.error("Fill all required fields");
    onCreate({
      id: `USR-${Date.now()}`, first_name: form.first, last_name: form.last, email: form.email, role: form.role,
      faculty: form.faculty, matric: form.matric, date: new Date().toISOString().split("T")[0], status: "Active",
    });
    toast.success("User created successfully");
    onOpenChange(false);
    setForm({ first: "", last: "", email: "", role: "Student", faculty: FACULTIES[0], matric: "" });
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add user</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div><Label>First name</Label><Input value={form.first} onChange={(e) => setForm({ ...form, first: e.target.value })} className="mt-1" /></div>
          <div><Label>Last name</Label><Input value={form.last} onChange={(e) => setForm({ ...form, last: e.target.value })} className="mt-1" /></div>
          <div className="col-span-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1" /></div>
          <div>
            <Label>Role</Label>
            <Select value={form.role} onValueChange={(v: "Student" | "Counselor") => setForm({ ...form, role: v })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="Student">Student</SelectItem><SelectItem value="Counselor">Counselor</SelectItem></SelectContent>
            </Select>
          </div>
          <div>
            <Label>Faculty</Label>
            <Select value={form.faculty} onValueChange={(v) => setForm({ ...form, faculty: v })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>{FACULTIES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="col-span-2"><Label>Student ID</Label><Input value={form.matric} onChange={(e) => setForm({ ...form, matric: e.target.value })} className="mt-1" /></div>
        </div>
        <DialogFooter><Button onClick={submit} className="gradient-primary text-primary-foreground border-0">Create User</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
