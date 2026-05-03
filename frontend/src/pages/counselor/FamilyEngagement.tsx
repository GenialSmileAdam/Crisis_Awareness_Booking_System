import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AppLayout } from "@/components/AppLayout";
import { mockStudents } from "@/data/mockData";
import { Search, SlidersHorizontal, Phone, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const FamilyEngagement = () => {
  const [search, setSearch] = useState("");

  const contacts = mockStudents.flatMap(s =>
    s.familyContact ? [{ studentId: s.id, ...s.familyContact }] : []
  );

  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl">
        <h1 className="text-2xl font-bold text-primary">Family Engagement</h1>

        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-bold mb-4">Primary Contacts</h2>

            <div className="flex items-center gap-2 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search ..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-secondary/30 border-0"
                />
              </div>
              <button className="h-10 w-10 rounded-lg border flex items-center justify-center">
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-3">
              {filtered.map((contact, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-secondary/30">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      <User className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold">{contact.name}</p>
                    <p className="text-sm text-muted-foreground">{contact.relationship} • {contact.phone}</p>
                  </div>
                  <button className="h-10 w-10 rounded-full flex items-center justify-center hover:bg-secondary">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default FamilyEngagement;
