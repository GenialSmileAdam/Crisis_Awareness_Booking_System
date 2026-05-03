import { useState, useMemo, useEffect } from "react";
import { Home, ClipboardList, History, BookOpen, Calendar, MessageSquare, Plus, LogOut, Search, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppShell, SidebarItem } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CrisisBanner } from "@/components/CrisisBanner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { studentSidebarItems } from "@/data/sidebar";

type Topic = "Academics" | "Anxiety" | "Sleep" | "Social" | "General";

interface Post {
  id: string;
  content: string;
  createdAt: string;
  topic: Topic;
  relateCount: number;
}

const TOPICS: Topic[] = ["Academics", "Anxiety", "Sleep", "Social", "General"];

const TOPIC_COLORS: Record<Topic, string> = {
  Academics: "#3B82F6",
  Anxiety: "#FF8C42",
  Sleep: "#8B5CF6",
  Social: "#10B981",
  General: "#6B7280",
};

const INITIAL_MOCK_POSTS: Post[] = [
  { id: "p1", content: "Is anyone else feeling completely overwhelmed by the workload this semester? I feel like I'm falling behind and the exams haven't even started yet.", createdAt: "2 hours ago", topic: "Academics", relateCount: 5 },
  { id: "p2", content: "I've been having really bad anxiety before my presentations. My heart races and I can't think straight. Any tips on how to handle this?", createdAt: "5 hours ago", topic: "Anxiety", relateCount: 8 },
  { id: "p3", content: "My sleep schedule is completely ruined. I stay up worrying about assignments and then I'm too exhausted to focus in class the next day.", createdAt: "Yesterday", topic: "Sleep", relateCount: 12 },
  { id: "p4", content: "Feeling really isolated lately. Most of my friends are in different faculties and I'm struggling to connect with people in my current classes.", createdAt: "Yesterday", topic: "Social", relateCount: 3 },
  { id: "p5", content: "Just wanted to say that utilizing the breathing exercises in the resources section actually helped me calm down before my midterm today. Highly recommend!", createdAt: "2 days ago", topic: "General", relateCount: 6 },
];

export default function StudentForum() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [posts, setPosts] = useState<Post[]>(INITIAL_MOCK_POSTS);
  const [search, setSearch] = useState("");
  const [filterTopic, setFilterTopic] = useState<Topic | "All">("All");
  const [userRelates, setUserRelates] = useState<Record<string, boolean>>({});

  // Mock pagination state
  const [pagination, setPagination] = useState({
    total: 12,
    limit: 10,
    offset: 0,
    has_next: true,
  });

  const [loadingMore, setLoadingMore] = useState(false);

  // Initialize relates from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("forum_user_relates");
    if (stored) {
      try {
        setUserRelates(JSON.parse(stored));
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, []);

  // Get today's date in format YYYY-MM-DD
  const getTodayDateKey = () => {
    const today = new Date().toISOString().split("T")[0];
    return `forum_post_count_${today}`;
  };

  // Check if user has reached daily posting limit
  const getDailyPostCount = (): number => {
    const key = getTodayDateKey();
    const stored = localStorage.getItem(key);
    return stored ? parseInt(stored, 10) : 0;
  };

  const incrementDailyPostCount = () => {
    const key = getTodayDateKey();
    const current = getDailyPostCount();
    localStorage.setItem(key, String(current + 1));
  };

  const hasReachedDailyLimit = getDailyPostCount() >= 3;

  const handlePost = () => {
    if (!content.trim()) return toast.error("Post content cannot be empty.");
    if (!selectedTopic) return toast.error("Please select a topic.");
    if (hasReachedDailyLimit) return toast.error("You've reached your daily posting limit (3 posts)");

    const newPost: Post = {
      id: Math.random().toString(36).substring(7),
      content,
      createdAt: "Just now",
      topic: selectedTopic,
      relateCount: 0,
    };
    setPosts([newPost, ...posts]);
    setContent("");
    setSelectedTopic(null);
    setOpen(false);
    incrementDailyPostCount();
    toast.success("Your post has been shared anonymously.");
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

    // Update post relate count
    setPosts(posts.map(p => 
      p.id === postId 
        ? { ...p, relateCount: p.relateCount + (isRelated ? -1 : 1) }
        : p
    ));
  };

  const loadMore = () => {
    setLoadingMore(true);
    setTimeout(() => {
      setPosts([
        ...posts,
        { id: "p6", content: "Another mock post loaded from pagination. Reminding everyone to take a break!", createdAt: "3 days ago", topic: "General", relateCount: 2 },
        { id: "p7", content: "Midterms are tough, but we will get through it.", createdAt: "4 days ago", topic: "Academics", relateCount: 4 }
      ]);
      setPagination({ ...pagination, offset: pagination.offset + 10, has_next: false });
      setLoadingMore(false);
    }, 800);
  };

  // Filter posts based on search and topic
  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      const matchesSearch = post.content.toLowerCase().includes(search.toLowerCase());
      const matchesTopic = filterTopic === "All" || post.topic === filterTopic;
      return matchesSearch && matchesTopic;
    });
  }, [posts, search, filterTopic]);

  return (
    <AppShell items={studentSidebarItems}>
      <div className="flex items-start md:items-center justify-between py-4 md:h-16 px-4 md:px-8 border-b border-border bg-background md:bg-background/60 md:backdrop-blur-sm sticky top-0 z-30">
        <div className="flex-1 pr-2">
          <h1 className="font-display text-xl font-bold">Wellness Forum</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Anonymous peer support — your identity is never revealed.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                onClick={() => setOpen(true)} 
                size="sm" 
                disabled={hasReachedDailyLimit}
                className="hidden md:flex bg-[#6C3FE8] hover:bg-[#6C3FE8]/90 text-white border-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4 mr-1.5" /> New Post
              </Button>
            </TooltipTrigger>
            {hasReachedDailyLimit && (
              <TooltipContent>You've reached your daily posting limit (3 posts)</TooltipContent>
            )}
          </Tooltip>
          <Button 
            onClick={() => setOpen(true)} 
            size="icon" 
            disabled={hasReachedDailyLimit}
            variant="ghost" 
            className="md:hidden h-9 w-9 bg-[#6C3FE8]/10 text-[#6C3FE8] rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
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
        {/* Anonymity Notice Banner */}
        <div className="w-full rounded-xl p-4 flex items-center gap-3 text-sm font-medium" style={{ backgroundColor: "#6C3FE815", border: "1px solid #6C3FE840", color: "var(--foreground)" }}>
          <span className="text-lg">🔒</span>
          All posts are completely anonymous. Your student ID is never visible to other students or staff.
        </div>

        {/* Search Bar */}
        <div className="max-w-3xl mx-auto relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search posts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Topic Filter Pills */}
        <div className="max-w-3xl mx-auto flex flex-wrap gap-2">
          <Button
            onClick={() => setFilterTopic("All")}
            variant={filterTopic === "All" ? "default" : "outline"}
            size="sm"
            className={filterTopic === "All" ? "bg-[#6C3FE8] hover:bg-[#6C3FE8]/90 text-white border-0" : ""}
          >
            All
          </Button>
          {TOPICS.map(topic => (
            <Button
              key={topic}
              onClick={() => setFilterTopic(topic)}
              variant={filterTopic === topic ? "default" : "outline"}
              size="sm"
              className={filterTopic === topic ? "bg-[#6C3FE8] hover:bg-[#6C3FE8]/90 text-white border-0" : ""}
            >
              {topic}
            </Button>
          ))}
        </div>

        {/* Posts Feed */}
        <div className="space-y-4 max-w-3xl mx-auto">
          {filteredPosts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No posts found matching your search.</p>
            </div>
          ) : (
            filteredPosts.map((post) => (
              <div 
                key={post.id} 
                className="surface-card p-5 bg-card"
                style={{ borderLeft: `4px solid ${TOPIC_COLORS[post.topic]}` }}
              >
                {/* Topic Tag */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="px-2.5 py-1 rounded-full border border-[#6C3FE8]/50 text-xs font-medium text-[#6C3FE8]">
                    {post.topic}
                  </div>
                </div>

                {/* Post Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="font-semibold text-sm flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs">👤</div>
                    Anonymous Student
                  </div>
                  <div className="text-xs text-muted-foreground">{post.createdAt}</div>
                </div>

                {/* Post Content */}
                <p className="text-sm leading-relaxed mb-4">{post.content}</p>

                {/* I Relate Button */}
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
                    {userRelates[post.id] ? (
                      <Heart className="h-4 w-4 fill-current" />
                    ) : (
                      <Heart className="h-4 w-4" />
                    )}
                    <span>{post.relateCount}</span>
                  </button>
                </div>
              </div>
            ))
          )}

          {pagination.has_next && filteredPosts.length > 0 && (
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
          <div className="py-4 space-y-4">
            {/* Topic Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Select a Topic</label>
              <div className="flex flex-wrap gap-2">
                {TOPICS.map(topic => (
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

            {/* Textarea */}
            <div className="space-y-2">
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
          </div>
          <DialogFooter className="flex-col sm:flex-col gap-2">
            <Button 
              onClick={handlePost} 
              disabled={!selectedTopic || !content.trim() || hasReachedDailyLimit}
              className="w-full bg-[#6C3FE8] hover:bg-[#6C3FE8]/90 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Post Anonymously
            </Button>
            <Button onClick={() => setOpen(false)} variant="ghost" className="w-full">Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
