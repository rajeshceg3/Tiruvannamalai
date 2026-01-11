import { Journey, Shrine } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

// Refactored JourneyProgress component
export function JourneyProgress({ journey, shrines }: { journey: Journey | null, shrines: Shrine[] }) {
  if (!journey) return null;

  const total = shrines.length;
  const current = journey.currentShrineOrder;
  const progress = (current / total) * 100;

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Your Spiritual Journey</CardTitle>
        <CardDescription>You have visited {current} of {total} shrines.</CardDescription>
      </CardHeader>
      <CardContent>
        <Progress value={progress} className="h-4" />
        <div className="mt-4 flex justify-between text-sm text-muted-foreground">
          <span>Start</span>
          <span>Completion</span>
        </div>
      </CardContent>
    </Card>
  );
}
