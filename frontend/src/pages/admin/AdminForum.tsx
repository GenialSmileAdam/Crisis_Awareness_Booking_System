import { useState } from "react";
import { AppShell } from "@/components/AppSidebar";
import { adminSidebarItems } from "@/data/sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Search, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

interface AdminPost {
  id: string;
  preview: string;
  postedAt: string;
  status: "Active" | "Removed";
}

const INITIAL_MOCK_POSTS: AdminPost[] = [
  { id: "p1", preview: "Is anyone else feeling completely overwhelmed by the...", postedAt: "2 hours ago", status: "Active" },
  { id: "p2", preview: "I've been having really bad anxiety before my presen...", postedAt: "5 hours ago", status: "Active" },
  { id: "p3", preview: "My sleep schedule is completely ruined. I stay up wo...", postedAt: "Yesterday", status: "Active" },
  { id: "p4", preview: "Feeling really isolated lately. Most of my friends a...", postedAt: "Yesterday", status: "Active" },
  { id: "p5", preview: "Just wanted to say that utilizing the breathing exer...", postedAt: "2 days ago", status: "Removed" },
];

export default function AdminForum() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<AdminPost[]>(INITIAL_MOCK_POSTS);
  const [search, setSearch] = useState("");
  
  // Pagination format handling
  const [pagination, setPagination] = useState({
    total: 12,
    limit: 10,
    offset: 0,
    has_next: true,
  });

  const [loading, setLoading] = useState(false);

  const [removeModalOpen, setRemoveModalOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [removeReason, setRemoveReason] = useState("");

  const filteredPosts = posts.filter(p => p.preview.toLowerCase().includes(search.toLowerCase()));

  const handleRemoveClick = (id: string) => {
    setSelectedPostId(id);
    setRemoveReason("");
    setRemoveModalOpen(true);
  };

  const confirmRemoval = () => {
    if (!removeReason.trim()) {
      return toast.error("Reason for removal is required.");
    }
    setPosts(posts.map(p => p.id === selectedPostId ? { ...p, status: "Removed" } : p));
    setRemoveModalOpen(false);
    toast.success("Post removed.");
  };

  const loadNextPage = () => {
    setLoading(true);
    setTimeout(() => {
      setPosts([
        ...posts,
        { id: "p6", preview: "Another mock post loaded from pagination. Reminding ev...", postedAt: "3 days ago", status: "Active" }
      ]);
      setPagination({ ...pagination, offset: pagination.offset + 10, has_next: false });
      setLoading(false);
    }, 800);
  };

  const loadPrevPage = () => {
    setPagination({ ...pagination, offset: Math.max(0, pagination.offset - 10), has_next: true });
  };

  return (
    <AppShell items={adminSidebarItems}>
      <div className="flex items-start md:items-center justify-between py-4 md:h-16 px-4 md:px-8 border-b border-border bg-background/60 backdrop-blur-sm sticky top-0 z-30">
        <div className="flex-1 pr-2">
          <h1 className="font-display text-xl md:text-2xl font-bold">Forum Moderation</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={() => { logout(); navigate("/login"); }} className="md:hidden rounded-full h-9 w-9">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="p-4 md:p-8 space-y-6">
        <div className="glass border border-border rounded-3xl p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <h2 className="font-display text-xl font-bold">All Posts</h2>
            <div className="relative w-full md:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                placeholder="Search posts..." 
                className="pl-9 h-9 w-full md:w-64" 
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="text-left p-3">Post ID</th>
                  <th className="text-left p-3 w-1/2">Preview</th>
                  <th className="text-left p-3">Posted At</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-right p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      <td className="p-3"><div className="h-4 w-16 bg-muted rounded animate-pulse"></div></td>
                      <td className="p-3"><div className="h-4 w-64 bg-muted rounded animate-pulse"></div></td>
                      <td className="p-3"><div className="h-4 w-24 bg-muted rounded animate-pulse"></div></td>
                      <td className="p-3"><div className="h-4 w-16 bg-muted rounded animate-pulse"></div></td>
                      <td className="p-3"><div className="h-4 w-20 bg-muted rounded animate-pulse ml-auto"></div></td>
                    </tr>
                  ))
                ) : filteredPosts.map((post) => (
                  <tr key={post.id} className="border-b border-border hover:bg-muted/30">
                    <td className="p-3 font-mono text-xs">{post.id}</td>
                    <td className="p-3 text-muted-foreground truncate max-w-sm">{post.preview}</td>
                    <td className="p-3 text-muted-foreground">{post.postedAt}</td>
                    <td className="p-3">
                      {post.status === "Removed" ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">Removed</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-success/15 text-foreground">Active</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => handleRemoveClick(post.id)}
                        disabled={post.status === "Removed"}
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
                {!loading && filteredPosts.length === 0 && (
                  <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No posts found.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
            <span>Showing limit {pagination.limit} (offset {pagination.offset})</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={pagination.offset === 0} onClick={loadPrevPage}>Prev</Button>
              <Button size="sm" variant="outline" disabled={!pagination.has_next} onClick={loadNextPage}>Next</Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={removeModalOpen} onOpenChange={setRemoveModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Post</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Textarea 
              placeholder="Reason for removal (required)" 
              value={removeReason}
              onChange={(e) => setRemoveReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button onClick={confirmRemoval} variant="destructive">Confirm Removal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
