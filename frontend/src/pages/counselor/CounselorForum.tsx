import { useState, useMemo } from "react";
import { LayoutDashboard, Users, Calendar, MessageSquare, LogOut, Search, Flag, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CrisisBanner } from "@/components/CrisisBanner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { counselorSidebarItems } from "@/data/sidebar";

type Topic = "Academics" | "Anxiety" | "Sleep" | "Social" | "General";
type FlagReason = "Harmful Content" | "Crisis Signal" | "Spam" | "Other";

interface Post {
  id: string;
  content: string;
  createdAt: string;
  topic: Topic;
  relateCount: number;
  isFlagged?: boolean;
}

const TOPICS: Topic[] = ["Academics", "Anxiety", "Sleep", "Social", "General"];

const TOPIC_COLORS: Record<Topic, string> = {
  Academics: "#3B82F6",
  Anxiety: "#FF8C42",
  Sleep: "#8B5CF6",
  Social: "#10B981",
  General: "#6B7280",
};

const INITIAL_POSTS: Post[] = [
  { id: "p1", content: "Is anyone else feeling completely overwhelmed by the workload this semester? I feel like I'm falling behind and the exams haven't even started yet.", createdAt: "2 hours ago", topic: "Academics", relateCount: 5 },
  { id: "p2", content: "I've been having really bad anxiety before my presentations. My heart races and I can't think straight. Any tips on how to handle this?", createdAt: "5 hours ago", topic: "Anxiety", relateCount: 8 },
  { id: "p3", content: "My sleep schedule is completely ruined. I stay up worrying about assignments and then I'm too exhausted to focus in class the next day.", createdAt: "Yesterday", topic: "Sleep", relateCount: 12 },
  { id: "p4", content: "Feeling really isolated lately. Most of my friends are in different faculties and I'm struggling to connect with people in my current classes.", createdAt: "Yesterday", topic: "Social", relateCount: 3 },
  { id: "p5", content: "Just wanted to say that utilizing the breathing exercises in the resources section actually helped me calm down before my midterm today. Highly recommend!", createdAt: "2 days ago", topic: "General", relateCount: 6 },
];

export default function CounselorForum() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [search, setSearch] = useState("");
  const [filterTopic, setFilterTopic] = useState<Topic | "All">("All");
  const [flagModalOpen, setFlagModalOpen] = useState(false);
  const [flaggedPostId, setFlaggedPostId] = useState<string | null>(null);
  const [flagReason, setFlagReason] = useState<FlagReason>("Harmful Content");
  const [flagNotes, setFlagNotes] = useState("");

  // Filter posts based on search and topic
  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      const matchesSearch = post.content.toLowerCase().includes(search.toLowerCase());
      const matchesTopic = filterTopic === "All" || post.topic === filterTopic;
      return matchesSearch && matchesTopic;
    });
  }, [posts, search, filterTopic]);

  const handleFlagClick = (postId: string) => {
    setFlaggedPostId(postId);
    setFlagModalOpen(true);
  };

  const handleFlagConfirm = () => {
    if (!flaggedPostId) return;
    
    setPosts(posts.map(p => 
      p.id === flaggedPostId 
        ? { ...p, isFlagged: true }
        : p
    ));
    
    setFlagModalOpen(false);
    setFlaggedPostId(null);
    setFlagReason("Harmful Content");
    setFlagNotes("");
    toast.success("Post flagged for review");
  };

  const handleRemoveClick = (postId: string) => {
    if (confirm("Remove this post?")) {
      setPosts(posts.filter(p => p.id !== postId));
      toast.success("Post removed.");
    }
  };

  return (
    <AppShell items={counselorSidebarItems}>
      <div className="flex items-start md:items-center justify-between py-4 md:h-16 px-4 md:px-8 border-b border-border bg-background md:bg-background/60 md:backdrop-blur-sm sticky top-0 z-30">
        <div className="flex-1 pr-2">
          <h1 className="font-display text-xl font-bold">Student Forum</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Monitor anonymous student posts for wellbeing signals.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={() => logout()} className="md:hidden rounded-full h-9 w-9">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <CrisisBanner />

      <div className="p-4 md:p-6 lg:p-8 space-y-6 pt-0">
        {/* Privacy Banner */}
        <div className="w-full rounded-xl p-4 flex items-center gap-3 text-sm font-medium" style={{ backgroundColor: "#6C3FE815", border: "1px solid #6C3FE840", color: "var(--foreground)" }}>
          <span className="text-lg">🔒</span>
          Posts are anonymous. Student identities are never revealed — even to psychologists.
        </div>

        {/* Search Bar */}
        <div className="max-w-4xl mx-auto relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search posts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Topic Filter Pills */}
        <div className="max-w-4xl mx-auto flex flex-wrap gap-2">
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
        <div className="space-y-4 max-w-4xl mx-auto">
          {filteredPosts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No posts found matching your search.</p>
            </div>
          ) : (
            filteredPosts.map((post) => (
              <div 
                key={post.id} 
                className="surface-card p-5 bg-card relative"
                style={{ borderLeft: `4px solid ${TOPIC_COLORS[post.topic]}` }}
              >
                {/* Flagged Badge */}
                {post.isFlagged && (
                  <div className="absolute top-4 right-4 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-50 dark:bg-orange-950 text-orange-600 dark:text-orange-400">
                    Flagged
                  </div>
                )}

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
                <p className="text-sm leading-relaxed mb-4 pr-16">{post.content}</p>

                {/* Post Meta and Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <div className="text-xs text-muted-foreground">
                    ❤️ {post.relateCount} relate
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => handleFlagClick(post.id)}
                      variant="ghost"
                      size="sm"
                      className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950"
                    >
                      <Flag className="h-4 w-4 mr-1.5" />
                      Flag Post
                    </Button>
                    <Button
                      onClick={() => handleRemoveClick(post.id)}
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4 mr-1.5" />
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Flag Modal */}
      <Dialog open={flagModalOpen} onOpenChange={setFlagModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Flag this post</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {/* Reason Dropdown */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason</label>
              <Select value={flagReason} onValueChange={(value) => setFlagReason(value as FlagReason)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Harmful Content">Harmful Content</SelectItem>
                  <SelectItem value="Crisis Signal">Crisis Signal</SelectItem>
                  <SelectItem value="Spam">Spam</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notes Textarea */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes (optional)</label>
              <Textarea 
                placeholder="Add any additional context..."
                value={flagNotes}
                onChange={(e) => setFlagNotes(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-col gap-2">
            <Button 
              onClick={handleFlagConfirm}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white"
            >
              Flag
            </Button>
            <Button onClick={() => setFlagModalOpen(false)} variant="ghost" className="w-full">Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
