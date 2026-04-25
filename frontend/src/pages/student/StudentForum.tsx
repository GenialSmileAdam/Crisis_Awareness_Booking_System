import { useState } from "react";
import { Home, ClipboardList, History, BookOpen, Calendar, MessageSquare, Plus, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppShell, SidebarItem } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { CrisisBanner } from "@/components/CrisisBanner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { studentSidebarItems } from "@/data/sidebar";

interface Post {
  id: string;
  content: string;
  createdAt: string;
}

const INITIAL_MOCK_POSTS: Post[] = [
  { id: "p1", content: "Is anyone else feeling completely overwhelmed by the workload this semester? I feel like I'm falling behind and the exams haven't even started yet.", createdAt: "2 hours ago" },
  { id: "p2", content: "I've been having really bad anxiety before my presentations. My heart races and I can't think straight. Any tips on how to handle this?", createdAt: "5 hours ago" },
  { id: "p3", content: "My sleep schedule is completely ruined. I stay up worrying about assignments and then I'm too exhausted to focus in class the next day.", createdAt: "Yesterday" },
  { id: "p4", content: "Feeling really isolated lately. Most of my friends are in different faculties and I'm struggling to connect with people in my current classes.", createdAt: "Yesterday" },
  { id: "p5", content: "Just wanted to say that utilizing the breathing exercises in the resources section actually helped me calm down before my midterm today. Highly recommend!", createdAt: "2 days ago" },
];

export default function StudentForum() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [posts, setPosts] = useState<Post[]>(INITIAL_MOCK_POSTS);

  // Mock pagination state
  const [pagination, setPagination] = useState({
    total: 12,
    limit: 10,
    offset: 0,
    has_next: true,
  });

  const [loadingMore, setLoadingMore] = useState(false);

  const handlePost = () => {
    if (!content.trim()) return toast.error("Post content cannot be empty.");
    const newPost: Post = {
      id: Math.random().toString(36).substring(7),
      content,
      createdAt: "Just now",
    };
    setPosts([newPost, ...posts]);
    setContent("");
    setOpen(false);
    toast.success("Your post has been shared anonymously.");
  };

  const loadMore = () => {
    setLoadingMore(true);
    setTimeout(() => {
      setPosts([
        ...posts,
        { id: "p6", content: "Another mock post loaded from pagination. Reminding everyone to take a break!", createdAt: "3 days ago" },
        { id: "p7", content: "Midterms are tough, but we will get through it.", createdAt: "4 days ago" }
      ]);
      setPagination({ ...pagination, offset: pagination.offset + 10, has_next: false });
      setLoadingMore(false);
    }, 800);
  };

  return (
    <AppShell items={studentSidebarItems}>
      <div className="flex items-start md:items-center justify-between py-4 md:h-16 px-4 md:px-8 border-b border-border bg-background md:bg-background/60 md:backdrop-blur-sm sticky top-0 z-30">
        <div className="flex-1 pr-2">
          <h1 className="font-display text-xl font-bold">Wellness Forum</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Anonymous peer support — your identity is never revealed.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button onClick={() => setOpen(true)} size="sm" className="hidden md:flex bg-[#6C3FE8] hover:bg-[#6C3FE8]/90 text-white border-0">
            <Plus className="h-4 w-4 mr-1.5" /> New Post
          </Button>
          <Button onClick={() => setOpen(true)} size="icon" variant="ghost" className="md:hidden h-9 w-9 bg-[#6C3FE8]/10 text-[#6C3FE8] rounded-full">
            <Plus className="h-4 w-4" />
          </Button>
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={() => { logout(); navigate("/login"); }} className="md:hidden rounded-full h-9 w-9">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <CrisisBanner />

      <div className="p-4 md:p-6 lg:p-8 space-y-6 pt-0">
        {/* Anonymity Notice Banner */}
        <div className="w-full rounded-xl p-4 flex items-center gap-3 text-sm font-medium" style={{ backgroundColor: "#6C3FE815", border: "1px solid #6C3FE840", color: "var(--foreground)" }}>
          <span className="text-lg">🔒</span>
          All posts are completely anonymous. Your student ID is never visible to other students or staff.
        </div>

        {/* Posts Feed */}
        <div className="space-y-4 max-w-3xl mx-auto">
          {posts.map((post) => (
            <div key={post.id} className="surface-card p-5 bg-card">
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold text-sm flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs">👤</div>
                  Anonymous Student
                </div>
                <div className="text-xs text-muted-foreground">{post.createdAt}</div>
              </div>
              <p className="text-sm leading-relaxed">{post.content}</p>
            </div>
          ))}

          {pagination.has_next && (
            <div className="pt-4 flex justify-center">
              <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? "Loading..." : "Load more posts"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* New Post Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Anonymously</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Textarea 
              placeholder="Write freely. No one can identify you." 
              value={content}
              onChange={(e) => {
                if (e.target.value.length <= 500) setContent(e.target.value);
              }}
              rows={5}
              className="resize-none"
            />
            <div className={cn("text-xs text-right", content.length === 500 ? "text-destructive" : "text-muted-foreground")}>
              {content.length} / 500
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-col gap-2">
            <Button onClick={handlePost} className="w-full bg-[#6C3FE8] hover:bg-[#6C3FE8]/90 text-white">Post Anonymously</Button>
            <Button onClick={() => setOpen(false)} variant="ghost" className="w-full">Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
