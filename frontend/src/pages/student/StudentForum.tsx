import { useState, useMemo, useEffect } from "react";
import { Plus, LogOut, Search, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CrisisBanner } from "@/components/CrisisBanner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { NeonSpinner } from "@/components/NeonSpinner";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { listForumPosts, createForumPost } from "@/api/forum";
import { studentSidebarItems } from "@/data/sidebar";

const TOPIC_COLORS: Record<string, string> = {
  Academics: "#3B82F6",
  Anxiety: "#FF8C42",
  Sleep: "#8B5CF6",
  Social: "#10B981",
  General: "#6B7280",
};

const TOPICS = ["Academics", "Anxiety", "Sleep", "Social", "General"] as const;
type Topic = typeof TOPICS[number];

export default function StudentForum() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [search, setSearch] = useState("");
  const [userRelates, setUserRelates] = useState<Record<string, boolean>>({});
  const [localRelateCounts, setLocalRelateCounts] = useState<Record<string, number>>({});
  const [offset, setOffset] = useState(0);

  const PAGE_SIZE = 20;

  const postsQuery = useQuery({
    queryKey: ["forum", "posts", offset],
    queryFn: () => listForumPosts(PAGE_SIZE, offset),
    staleTime: 1000 * 60,
  });

  const createMutation = useMutation({
    mutationFn: (text: string) => createForumPost(text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum", "posts"] });
      setContent("");
      setSelectedTopic(null);
      setOpen(false);
      toast.success("Your post has been shared anonymously.");
    },
    onError: () => {
      toast.error("Failed to post. Please try again.");
    },
  });

  useEffect(() => {
    const stored = localStorage.getItem("forum_user_relates");
    if (stored) {
      try { setUserRelates(JSON.parse(stored)); } catch { /* ignore */ }
    }
  }, []);

  const posts = postsQuery.data?.data || [];
  const pagination = postsQuery.data?.pagination;

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const matchesSearch = post.content.toLowerCase().includes(search.toLowerCase());
      return matchesSearch;
    });
  }, [posts, search]);

  const handlePost = () => {
    if (!content.trim()) return toast.error("Post content cannot be empty.");
    createMutation.mutate(content.trim());
  };

  const toggleRelate = (postId: string) => {
    const newRelates = { ...userRelates };
    const isRelated = newRelates[postId];
    if (isRelated) {
      delete newRelates[postId];
    } else {
      newRelates[postId] = true;
    }
    setUserRelates(newRelates);
    localStorage.setItem("forum_user_relates", JSON.stringify(newRelates));
    setLocalRelateCounts((prev) => ({
      ...prev,
      [postId]: (prev[postId] ?? 0) + (isRelated ? -1 : 1),
    }));
  };

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <AppShell items={studentSidebarItems}>
      <div className="flex items-start md:items-center justify-between py-4 md:h-16 px-4 md:px-8 border-b border-border bg-background md:bg-background/60 md:backdrop-blur-sm sticky top-0 z-30">
        <div className="flex-1 pr-2">
          <h1 className="font-display text-xl font-bold">Wellness Forum</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Anonymous peer support — your identity is never revealed.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={() => setOpen(true)}
            size="sm"
            className="hidden md:flex bg-[#6C3FE8] hover:bg-[#6C3FE8]/90 text-white border-0"
          >
            <Plus className="h-4 w-4 mr-1.5" /> New Post
          </Button>
          <Button
            onClick={() => setOpen(true)}
            size="icon"
            variant="ghost"
            className="md:hidden h-9 w-9 bg-[#6C3FE8]/10 text-[#6C3FE8] rounded-full"
          >
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
        <div className="w-full rounded-xl p-4 flex items-center gap-3 text-sm font-medium" style={{ backgroundColor: "#6C3FE815", border: "1px solid #6C3FE840" }}>
          <span className="text-lg">🔒</span>
          All posts are completely anonymous. Your student ID is never visible to other students or staff.
        </div>

        <div className="max-w-3xl mx-auto relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search posts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="space-y-4 max-w-3xl mx-auto">
          {postsQuery.isPending ? (
            <div className="flex justify-center py-10"><NeonSpinner size={28} /></div>
          ) : postsQuery.error ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Failed to load posts.{" "}
              <button onClick={() => postsQuery.refetch()} className="underline text-primary">Retry</button>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No posts yet. Be the first to share!</p>
            </div>
          ) : (
            filteredPosts.map((post) => (
              <div
                key={post.id}
                className="surface-card p-5 bg-card"
                style={{ borderLeft: `4px solid ${TOPIC_COLORS["General"]}` }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="font-semibold text-sm flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs">👤</div>
                    Anonymous Student
                  </div>
                  <div className="text-xs text-muted-foreground">{fmtDate(post.created_at)}</div>
                </div>

                <p className="text-sm leading-relaxed mb-4">{post.content}</p>

                <div className="flex justify-end">
                  <button
                    onClick={() => toggleRelate(post.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors",
                      userRelates[post.id]
                        ? "bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400"
                        : "bg-muted hover:bg-muted/80 text-muted-foreground"
                    )}
                  >
                    <Heart className={cn("h-4 w-4", userRelates[post.id] && "fill-current")} />
                    <span>{localRelateCounts[post.id] ?? 0}</span>
                  </button>
                </div>
              </div>
            ))
          )}

          {pagination?.has_next && (
            <div className="pt-4 flex justify-center">
              <Button variant="outline" onClick={() => setOffset((o) => o + PAGE_SIZE)} disabled={postsQuery.isFetching}>
                {postsQuery.isFetching ? "Loading..." : "Load more posts"}
              </Button>
            </div>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Anonymously</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select a Topic</label>
              <div className="flex flex-wrap gap-2">
                {TOPICS.map((topic) => (
                  <button
                    key={topic}
                    onClick={() => setSelectedTopic(topic)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                      selectedTopic === topic
                        ? "bg-[#6C3FE8] text-white"
                        : "border border-input bg-background hover:bg-accent text-foreground"
                    )}
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Textarea
                placeholder="Write freely. No one can identify you."
                value={content}
                onChange={(e) => { if (e.target.value.length <= 500) setContent(e.target.value); }}
                rows={5}
                className="resize-none"
              />
              <div className={cn("text-xs text-right", content.length === 500 ? "text-destructive" : "text-muted-foreground")}>
                {content.length} / 500
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-col gap-2">
            <Button
              onClick={handlePost}
              disabled={!content.trim() || createMutation.isPending}
              className="w-full bg-[#6C3FE8] hover:bg-[#6C3FE8]/90 text-white"
            >
              {createMutation.isPending ? "Posting..." : "Post Anonymously"}
            </Button>
            <Button onClick={() => setOpen(false)} variant="ghost" className="w-full">Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
