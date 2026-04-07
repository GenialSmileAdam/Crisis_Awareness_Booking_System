import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AppLayout } from "@/components/AppLayout";
import { mockStudents, mockCounselors, mockSessions, mockAppointments } from "@/data/mockData";
import { Users, UserCircle, CalendarCheck, Clock } from "lucide-react";

const AdminDashboard = () => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "students" | "counselors">("all");

  const filteredStudents = filter !== "counselors" ? mockStudents.filter(s => s.name.toLowerCase().includes(search.toLowerCase())) : [];
  const filteredCounselors = filter !== "students" ? mockCounselors.filter(c => c.name.toLowerCase().includes(search.toLowerCase())) : [];

  const stats = [
    { label: "Total Students", value: mockStudents.length, icon: Users, color: "text-primary" },
    { label: "Active Counselors", value: mockCounselors.length, icon: UserCircle, color: "text-accent" },
    { label: "Sessions This Week", value: mockSessions.length, icon: CalendarCheck, color: "text-primary" },
    { label: "Pending Appointments", value: mockAppointments.filter(a => a.status === "pending").length, icon: Clock, color: "text-accent" },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <Card key={s.label}>
              <CardContent className="flex items-center gap-3 p-6">
                <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-lg">User Management</CardTitle>
              <div className="flex gap-2">
                <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-48" />
                {(["all", "students", "counselors"] as const).map((f) => (
                  <Badge key={f} variant={filter === f ? "default" : "secondary"} className="cursor-pointer capitalize" onClick={() => setFilter(f)}>{f}</Badge>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.email}</TableCell>
                    <TableCell><Badge>Student</Badge></TableCell>
                    <TableCell>{s.grade} · Wellness: {s.wellnessScore}</TableCell>
                  </TableRow>
                ))}
                {filteredCounselors.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.email}</TableCell>
                    <TableCell><Badge variant="secondary">Counselor</Badge></TableCell>
                    <TableCell>{c.specialization}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default AdminDashboard;
