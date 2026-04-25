import { useState } from "react";
import { Home, ClipboardList, History, BookOpen, Calendar, ExternalLink } from "lucide-react";
import { AppShell, SidebarItem } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { CrisisBanner } from "@/components/CrisisBanner";
import { cn } from "@/lib/utils";

const items: SidebarItem[] = [
  { icon: Home, label: "Home", to: "/student", end: true },
  { icon: ClipboardList, label: "Check-in", to: "/student" },
  { icon: Calendar, label: "Appointments", to: "/student/appointments" },
  { icon: History, label: "My History", to: "/student/history" },
  { icon: BookOpen, label: "Resources", to: "/student/resources" },
];

type ResourceType = "Article" | "Video" | "Exercise";
type Topic = "Anxiety" | "Stress" | "Depression" | "Focus";

interface Resource {
  type: ResourceType;
  topic: Topic;
  title: string;
  description: string;
  url: string;
}

const RESOURCES: Resource[] = [
  {
    type: "Article",
    topic: "Anxiety",
    title: "Understanding Anxiety in University Life",
    description: "Learn to recognize anxiety triggers and develop effective coping strategies for academic pressure.",
    url: "https://www.mind.org.uk/information-support/types-of-mental-health-problems/anxiety-and-panic-attacks/",
  },
  {
    type: "Video",
    topic: "Stress",
    title: "5-Minute Stress Relief Breathing",
    description: "A guided breathing exercise to calm your nervous system during high-stress moments.",
    url: "https://www.youtube.com/watch?v=tEmt1Znux58",
  },
  {
    type: "Exercise",
    topic: "Focus",
    title: "Pomodoro Focus Timer Technique",
    description: "A structured study technique that boosts concentration using timed work-rest intervals.",
    url: "https://todoist.com/productivity-methods/pomodoro-technique",
  },
  {
    type: "Article",
    topic: "Depression",
    title: "Recognizing Signs of Depression Early",
    description: "How to identify early warning signs and when to seek professional support on campus.",
    url: "https://www.nhs.uk/mental-health/conditions/clinical-depression/symptoms/",
  },
  {
    type: "Video",
    topic: "Anxiety",
    title: "Progressive Muscle Relaxation Guide",
    description: "A 10-minute guided session to release physical tension caused by anxiety.",
    url: "https://www.youtube.com/watch?v=1nZEdqcGVzo",
  },
  {
    type: "Exercise",
    topic: "Stress",
    title: "Journaling for Mental Clarity",
    description: "Structured journaling prompts designed to help process academic and personal stress.",
    url: "https://positivepsychology.com/journaling-for-mindfulness/",
  },
];

const FILTERS = ["All", "Articles", "Videos", "Exercises"] as const;

const typeColors: Record<ResourceType, string> = {
  Article: "bg-primary/15 text-primary",
  Video: "bg-destructive/15 text-destructive",
  Exercise: "bg-[#A8FF3E]/15 text-[#A8FF3E]",
};

const topicColors: Record<Topic, string> = {
  Anxiety: "bg-[#FF8C42]/15 text-[#FF8C42]",
  Stress: "bg-[#FF4560]/15 text-[#FF4560]",
  Depression: "bg-purple-500/15 text-purple-400",
  Focus: "bg-blue-500/15 text-blue-400",
};

export default function StudentResources() {
  const [filter, setFilter] = useState<typeof FILTERS[number]>("All");

  const filtered = RESOURCES.filter((r) => {
    if (filter === "All") return true;
    if (filter === "Articles") return r.type === "Article";
    if (filter === "Videos") return r.type === "Video";
    if (filter === "Exercises") return r.type === "Exercise";
    return true;
  });

  return (
    <AppShell items={items}>
      <div className="flex items-center justify-between h-16 px-8 border-b border-border">
        <div>
          <h1 className="font-display text-xl font-bold">Wellness Resources</h1>
          <p className="text-xs text-muted-foreground">Curated articles, videos and exercises for your wellbeing.</p>
        </div>
        <ThemeToggle />
      </div>

      <CrisisBanner />

      <div className="p-8 pt-6 space-y-6">
        {/* Filter bar */}
        <div className="flex gap-1 p-1 rounded-full bg-muted w-fit">
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

        {/* Resource cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((r, i) => (
            <div key={i} className="surface-card surface-card-hover p-6 bg-card flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <span className={cn("px-2 py-0.5 rounded-full text-[10px] uppercase font-bold", typeColors[r.type])}>
                  {r.type}
                </span>
                <span className={cn("px-2 py-0.5 rounded-full text-[10px] uppercase font-bold", topicColors[r.topic])}>
                  {r.topic}
                </span>
              </div>
              <h3 className="font-display font-bold text-base mb-2">{r.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed flex-1">{r.description}</p>
              <div className="mt-4">
                <a href={r.url} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline" className="w-full">
                    View Resource <ExternalLink className="h-3 w-3 ml-1.5" />
                  </Button>
                </a>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center text-muted-foreground py-12">No resources match this filter.</div>
        )}
      </div>
    </AppShell>
  );
}
