import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const FamilyDashboard = () => {
  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Family Dashboard</h1>
        <Card>
          <CardHeader><CardTitle className="text-lg">Welcome</CardTitle></CardHeader>
          <CardContent>
            <p className="text-muted-foreground">View updates from your student's counselor here. Check back for new messages and progress reports.</p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default FamilyDashboard;
