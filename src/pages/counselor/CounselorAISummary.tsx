import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppLayout } from "@/components/AppLayout";
import { mockAISummaries } from "@/data/mockData";
import { Sparkles, FileDown, Save, Bold, Italic, List, AlignLeft } from "lucide-react";

const CounselorAISummary = () => {
  const { studentId } = useParams();
  const summary = mockAISummaries.find(s => s.studentId === studentId) || mockAISummaries[0];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Sessions</span> <span>›</span>
          <span>Patient ID: #ST-8829</span> <span>›</span>
          <span className="text-primary font-semibold">AI Summary</span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{summary.studentName}</h1>
            <p className="text-muted-foreground">Session: {summary.sessionTitle} • {summary.sessionDate}</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline"><FileDown className="mr-2 h-4 w-4" />Export PDF</Button>
            <Button><Save className="mr-2 h-4 w-4" />Save Summary</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-6 space-y-6">
                {/* AI Generated Insight header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <h3 className="text-xl font-bold">AI Generated Insight</h3>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8"><Bold className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><Italic className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><List className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><AlignLeft className="h-4 w-4" /></Button>
                  </div>
                </div>

                {/* Quote */}
                <div className="border-l-4 border-primary pl-4 bg-secondary/30 rounded-r-lg p-4">
                  <p className="text-sm italic text-muted-foreground">"{summary.quote}"</p>
                </div>

                {/* Discourse */}
                <div>
                  <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">Summary of Discourse</p>
                  <p className="text-sm leading-relaxed text-foreground">{summary.discourse}</p>
                </div>

                {/* Key Themes & Intervention */}
                <div className="grid grid-cols-2 gap-4">
                  <Card className="bg-secondary/30 border-0">
                    <CardContent className="p-4">
                      <p className="text-sm font-semibold text-primary mb-3">Key Themes</p>
                      <ul className="space-y-2">
                        {summary.keyThemes.map((theme, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm">
                            <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                            {theme}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                  <Card className="bg-secondary/30 border-0">
                    <CardContent className="p-4">
                      <p className="text-sm font-semibold text-accent mb-3">Intervention Plan</p>
                      <ul className="space-y-2">
                        {summary.recommendations.map((rec, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                {/* Recommended Actions */}
                <div>
                  <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">Recommended Actions</p>
                  <p className="text-sm leading-relaxed">{summary.recommendedActions}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Risk Assessment */}
            <Card>
              <CardContent className="p-5 space-y-4">
                <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Risk Assessment</p>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold">Crisis Propensity</span>
                    <span className="text-sm font-bold text-accent">68%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div className="bg-accent h-2 rounded-full" style={{ width: "68%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold">Emotional Regulation</span>
                    <span className="text-sm font-bold text-primary">42%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full" style={{ width: "42%" }} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground italic">
                  Risk level has increased by 12% since last session due to reported sleep deprivation.
                </p>
              </CardContent>
            </Card>

            {/* Student Profile */}
            <Card className="bg-secondary/30 border-0">
              <CardContent className="p-5 space-y-3">
                <p className="text-xs uppercase tracking-wider text-primary font-semibold">Student Profile</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Major</span>
                    <span className="font-semibold">Comp. Science</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Year</span>
                    <span className="font-semibold">Junior (3rd)</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Emergency Contact</span>
                    <span className="font-semibold">Active</span>
                  </div>
                </div>
                <Button variant="outline" className="w-full text-primary text-sm">View Full History</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default CounselorAISummary;
