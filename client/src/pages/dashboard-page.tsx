import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Journey, Visit, Shrine } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, MapPin, CheckCircle2, Circle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { motion } from "framer-motion";

function JourneyProgress({ journey, shrines }: { journey: Journey | null, shrines: Shrine[] }) {
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

function VisitCard({ visit, shrine }: { visit: Visit, shrine: Shrine }) {
  const [notes, setNotes] = useState(visit.notes || "");
  const { toast } = useToast();

  const updateNoteMutation = useMutation({
    mutationFn: async (newNotes: string) => {
      const res = await apiRequest("PATCH", `/api/visits/${visit.id}`, { notes: newNotes });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits"] });
      toast({ title: "Journal updated" });
    },
  });

  return (
    <Card className="mb-4 overflow-hidden">
      <div className="flex flex-col md:flex-row">
        <div className="w-full md:w-32 h-32 md:h-auto bg-cover bg-center" style={{ backgroundImage: `url(${shrine.imageUrl})` }} />
        <div className="flex-1 p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-semibold text-lg flex items-center gap-2">
                {shrine.emoji} {shrine.name}
              </h3>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {shrine.direction} • {format(new Date(visit.visitedAt), "PPP")}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <h4 className="text-sm font-medium mb-1">Your Reflection:</h4>
            <div className="flex gap-2">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Write your thoughts here..."
                className="min-h-[60px]"
              />
              <Button
                size="sm"
                variant="outline"
                className="h-auto"
                onClick={() => updateNoteMutation.mutate(notes)}
                disabled={updateNoteMutation.isPending || notes === visit.notes}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function ShrineList({ shrines, visits, onCheckIn }: { shrines: Shrine[], visits: Visit[], onCheckIn: (id: string) => void }) {
  const visitedIds = new Set(visits.map(v => v.shrineId));

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {shrines.map((shrine) => {
        const isVisited = visitedIds.has(shrine.id);

        return (
          <motion.div
            key={shrine.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: shrine.order * 0.1 }}
          >
            <Card className={`h-full flex flex-col ${isVisited ? 'border-primary/50 bg-primary/5' : ''}`}>
              <CardHeader className="p-4">
                <div className="flex justify-between items-start">
                  <div className="w-10 h-10 rounded-full bg-background border flex items-center justify-center text-2xl shadow-sm">
                    {shrine.emoji}
                  </div>
                  {isVisited ? (
                    <CheckCircle2 className="text-primary w-6 h-6" />
                  ) : (
                    <Circle className="text-muted-foreground/30 w-6 h-6" />
                  )}
                </div>
                <CardTitle className="mt-4 text-lg">{shrine.name}</CardTitle>
                <CardDescription>{shrine.element} Element • {shrine.direction}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 p-4 pt-0">
                <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                  {shrine.description}
                </p>
                {!isVisited && (
                  <Button onClick={() => onCheckIn(shrine.id)} className="w-full mt-auto">
                    Check In
                  </Button>
                )}
                {isVisited && (
                  <Button variant="outline" className="w-full mt-auto" disabled>
                    Visited
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}

export default function DashboardPage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();

  const { data: shrines } = useQuery<Shrine[]>({
    queryKey: ["/api/shrines"]
  });

  const { data: visits } = useQuery<Visit[]>({
    queryKey: ["/api/visits"]
  });

  const { data: journey } = useQuery<Journey>({
    queryKey: ["/api/journey"]
  });

  const checkInMutation = useMutation({
    mutationFn: async (shrineId: string) => {
      const res = await apiRequest("POST", "/api/visits", { shrineId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/journey"] });
      toast({ title: "Checked in!", description: "May this step bring you peace." });
    },
  });

  if (!shrines || !visits) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="space-y-4 w-full max-w-lg px-4">
           <div className="h-4 bg-muted animate-pulse rounded w-3/4 mx-auto" />
           <div className="h-4 bg-muted animate-pulse rounded w-1/2 mx-auto" />
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
             <div className="h-40 bg-muted animate-pulse rounded" />
             <div className="h-40 bg-muted animate-pulse rounded" />
           </div>
        </div>
      </div>
    );
  }

  // Handle case where journey is loading separately or default to null
  const currentJourney = journey ?? null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold flex items-center gap-2">
             Sacred Steps
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              Namaste, {user?.username}
            </span>
            <Button variant="ghost" size="sm" onClick={() => logoutMutation.mutate()}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <JourneyProgress journey={currentJourney} shrines={shrines} />

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold mb-6">Shrines on the Path</h2>
            <ShrineList
              shrines={shrines}
              visits={visits}
              onCheckIn={(id) => checkInMutation.mutate(id)}
            />
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-6">Your Journal</h2>
            <ScrollArea className="h-[calc(100vh-300px)] pr-4">
              {visits.length === 0 ? (
                <div className="text-center p-8 border border-dashed rounded-lg text-muted-foreground">
                  <p>Your journal is empty.</p>
                  <p className="text-sm mt-2">Check in to a shrine to start writing.</p>
                </div>
              ) : (
                visits
                  .sort((a, b) => new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime())
                  .map(visit => {
                    const shrine = shrines.find(s => s.id === visit.shrineId);
                    if (!shrine) return null;
                    return <VisitCard key={visit.id} visit={visit} shrine={shrine} />;
                  })
              )}
            </ScrollArea>
          </div>
        </div>
      </main>
    </div>
  );
}
