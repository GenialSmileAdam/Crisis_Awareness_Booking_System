import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/AppLayout";
import { mockSessions } from "@/data/mockData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNavigate } from "react-router-dom";
import { Eye, Filter, Search } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const CounselorSessions = () => {
  const navigate = useNavigate();

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Your Sessions History</h1>
          <p className="text-muted-foreground mt-1">Overview of previous sessions</p>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Past Interactions</p>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon"><Filter className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon"><Search className="h-4 w-4" /></Button>
          </div>
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs uppercase">Date & Time</TableHead>
                <TableHead className="text-xs uppercase">Patient</TableHead>
                <TableHead className="text-xs uppercase">Session Type</TableHead>
                <TableHead className="text-xs uppercase">Duration</TableHead>
                <TableHead className="text-xs uppercase">Status</TableHead>
                <TableHead className="text-xs uppercase">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockSessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell>
                    <p className="font-semibold text-sm">{session.date}</p>
                    <p className="text-xs text-muted-foreground">{session.time}</p>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="bg-secondary text-[10px]">
                          {session.studentName.split(" ").map(n => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{session.studentName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs font-normal">{session.type}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{session.duration || "-"}</TableCell>
                  <TableCell>
                    <span className={`text-xs font-medium ${session.status === "completed" ? "text-emerald-600" : session.status === "cancelled" ? "text-amber-600" : "text-muted-foreground"}`}>
                      • {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => navigate(`/counselor/session/${session.id}`)}>
                      <Eye className="h-4 w-4 text-primary" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </AppLayout>
  );
};

export default CounselorSessions;
