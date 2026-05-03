import { useState } from "react";
import { AppShell } from "@/components/AppSidebar";
import { adminSidebarItems } from "@/data/sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

type ResourceType = "Article" | "Video" | "Exercise";
type Topic = "Anxiety" | "Stress" | "Depression" | "Focus" | "Sleep" | "Motivation";

interface AdminResource {
  id: string;
  title: string;
  type: ResourceType;
  topic: Topic;
  url: string;
  description: string;
  addedBy: string;
  dateAdded: string;
}

const INITIAL_RESOURCES: AdminResource[] = [
  { id: "r1", title: "Understanding Anxiety in University Life", type: "Article", topic: "Anxiety", url: "https://www.mind.org.uk/information-support/types-of-mental-health-problems/anxiety-and-panic-attacks/", description: "Learn to recognize anxiety triggers...", addedBy: "Admin User", dateAdded: "2026-04-15" },
  { id: "r2", title: "5-Minute Stress Relief Breathing", type: "Video", topic: "Stress", url: "https://www.youtube.com/watch?v=tEmt1Znux58", description: "A guided breathing exercise...", addedBy: "Admin User", dateAdded: "2026-04-20" },
  { id: "r3", title: "Pomodoro Focus Timer Technique", type: "Exercise", topic: "Focus", url: "https://todoist.com/productivity-methods/pomodoro-technique", description: "A structured study technique...", addedBy: "Dr. Amara Obi", dateAdded: "2026-04-22" },
];

const FILTERS = ["All", "Articles", "Videos", "Exercises"] as const;

export default function AdminResources() {
  const { logout } = useAuth();
  const [resources, setResources] = useState<AdminResource[]>(INITIAL_RESOURCES);
  const [filter, setFilter] = useState<typeof FILTERS[number]>("All");
  
  const [open, setOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<ResourceType | "">("");
  const [newTopic, setNewTopic] = useState<Topic | "">("");
  const [newUrl, setNewUrl] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const filteredResources = resources.filter((r) => {
    if (filter === "All") return true;
    if (filter === "Articles") return r.type === "Article";
    if (filter === "Videos") return r.type === "Video";
    if (filter === "Exercises") return r.type === "Exercise";
    return true;
  });

  const handleAdd = () => {
    if (!newTitle || !newType || !newTopic || !newUrl) {
      return toast.error("Please fill in all required fields.");
    }
    const res: AdminResource = {
      id: Math.random().toString(36).substring(7),
      title: newTitle,
      type: newType as ResourceType,
      topic: newTopic as Topic,
      url: newUrl,
      description: newDesc,
      addedBy: "Admin User",
      dateAdded: new Date().toISOString().split("T")[0],
    };
    setResources([res, ...resources]);
    setOpen(false);
    setNewTitle(""); setNewType(""); setNewTopic(""); setNewUrl(""); setNewDesc("");
    toast.success("Resource added.");
  };

  const handleRemove = (id: string) => {
    setResources(resources.filter(r => r.id !== id));
    toast.success("Resource removed.");
  };

  return (
    <AppShell items={adminSidebarItems}>
      <div className="flex items-start md:items-center justify-between py-4 md:h-16 px-4 md:px-8 border-b border-border bg-background/60 backdrop-blur-sm sticky top-0 z-30">
        <div className="flex-1 pr-2">
          <h1 className="font-display text-xl md:text-2xl font-bold">Resource Library</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Manage wellness resources available to students.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button onClick={() => setOpen(true)} size="sm" className="hidden md:flex bg-[#6C3FE8] hover:bg-[#6C3FE8]/90 text-white border-0">
            <Plus className="h-4 w-4 mr-1.5" /> Add Resource
          </Button>
          <Button onClick={() => setOpen(true)} size="icon" variant="ghost" className="md:hidden h-9 w-9 bg-[#6C3FE8]/10 text-[#6C3FE8] rounded-full">
            <Plus className="h-4 w-4" />
          </Button>
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={() => logout()} className="md:hidden rounded-full h-9 w-9">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="p-4 md:p-8 space-y-6">
        <div className="flex flex-wrap gap-1 p-1 rounded-xl md:rounded-full bg-muted w-fit">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-1.5 text-xs font-semibold rounded-full transition",
                filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="glass border border-border rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <tr>
                  <th className="text-left p-4 font-semibold">Title</th>
                  <th className="text-left p-4 font-semibold">Type</th>
                  <th className="text-left p-4 font-semibold">Topic</th>
                  <th className="text-left p-4 font-semibold">URL</th>
                  <th className="text-left p-4 font-semibold">Added By</th>
                  <th className="text-left p-4 font-semibold">Date Added</th>
                  <th className="text-right p-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredResources.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="p-4 font-medium">{r.title}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-muted">{r.type}</span>
                    </td>
                    <td className="p-4 text-muted-foreground">{r.topic}</td>
                    <td className="p-4 text-muted-foreground truncate max-w-[200px]">
                      <a href={r.url} target="_blank" rel="noopener noreferrer" className="hover:underline text-primary">{r.url}</a>
                    </td>
                    <td className="p-4 text-muted-foreground">{r.addedBy}</td>
                    <td className="p-4 text-muted-foreground">{r.dateAdded}</td>
                    <td className="p-4 text-right">
                      <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => handleRemove(r.id)}>
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
                {filteredResources.length === 0 && (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No resources found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Resource</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Title</label>
              <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Resource title" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Type</label>
                <Select value={newType} onValueChange={(v: any) => setNewType(v)}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Article">Article</SelectItem>
                    <SelectItem value="Video">Video</SelectItem>
                    <SelectItem value="Exercise">Exercise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Topic</label>
                <Select value={newTopic} onValueChange={(v: any) => setNewTopic(v)}>
                  <SelectTrigger><SelectValue placeholder="Select topic" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Anxiety">Anxiety</SelectItem>
                    <SelectItem value="Stress">Stress</SelectItem>
                    <SelectItem value="Depression">Depression</SelectItem>
                    <SelectItem value="Focus">Focus</SelectItem>
                    <SelectItem value="Sleep">Sleep</SelectItem>
                    <SelectItem value="Motivation">Motivation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">URL</label>
              <Input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Short Description</label>
              <Textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={2} placeholder="Brief description..." />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAdd} className="w-full bg-[#6C3FE8] hover:bg-[#6C3FE8]/90 text-white">Add Resource</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
