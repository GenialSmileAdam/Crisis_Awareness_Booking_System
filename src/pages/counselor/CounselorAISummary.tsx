import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppLayout } from "@/components/AppLayout";
import { mockAISummaries } from "@/data/mockData";
import { Brain, AlertTriangle, Lightbulb, Tag, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const CounselorAISummary = () => {
  const { studentId } = useParams();
  const summary = mockAISummaries.find(s => s.studentId === studentId) || mockAISummaries[0];

  const handleRegenerate = () => {
    toast({ title: "Regenerating...", description: "AI summary is being updated." });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">AI Summary — {summary.studentName}</h1>
          <Button variant="outline" onClick={handleRegenerate}><RefreshCw className="mr-2 h-4 w-4" />Regenerate</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Tag className="h-5 w-5 text-primary" />Key Themes</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {summary.keyThemes.map((theme, i) => <Badge key={i} variant="secondary" className="mr-1">{theme}</Badge>)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-accent" />Risk Flags</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {summary.riskFlags.map((flag, i) => (
                <div key={i} className="flex items-center gap-2 text-sm"><div className="h-2 w-2 rounded-full bg-accent" />{flag}</div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Lightbulb className="h-5 w-5 text-primary" />Recommendations</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {summary.recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-2 text-sm"><span className="text-primary font-bold">{i + 1}.</span>{rec}</div>
              ))}
            </CardContent>
          </Card>
        </div>
        <p className="text-xs text-muted-foreground">Generated: {new Date(summary.generatedAt).toLocaleString()}</p>
      </div>
    </AppLayout>
  );
};

export default CounselorAISummary;
