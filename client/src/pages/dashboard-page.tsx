import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Journey, Visit, Shrine } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MapPin, CheckCircle2, Circle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Sidebar } from "@/components/layout/sidebar";

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
    onMutate: async (newNotes) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ["/api/visits"] });

      // Snapshot the previous value
      const previousVisits = queryClient.getQueryData<Visit[]>(["/api/visits"]);

      // Optimistically update to the new value
      queryClient.setQueryData<Visit[]>(["/api/visits"], (old) => {
        if (!old) return [];
        return old.map((v) =>
          v.id === visit.id ? { ...v, notes: newNotes } : v
        );
      });

      // Return a context object with the snapshotted value
      return { previousVisits };
    },
    onError: (err, newNotes, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousVisits) {
        queryClient.setQueryData(["/api/visits"], context.previousVisits);
      }
      toast({
        title: "Update failed",
        description: "Your journal entry could not be saved.",
        variant: "destructive"
      });
    },
    onSettled: () => {
      // Always refetch after error or success:
      queryClient.invalidateQueries({ queryKey: ["/api/visits"] });
    },
    onSuccess: () => {
      toast({ title: "Journal updated" });
    },
  });

  return (
    <Card className="mb-4 overflow-hidden">
      <div className="flex flex-col md:flex-row">
        <div className="w-full md:w-32 h-32 md:h-auto overflow-hidden relative bg-muted">
          <img
            src={shrine.imageUrl}
            alt={`View of ${shrine.name}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
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

function ShrineList({ shrines, visits, onCheckIn }: { shrines: Shrine[], visits: Visit[], onCheckIn: (id: string, location?: GeolocationCoordinates) => void }) {
  const visitedIds = new Set(visits.map(v => v.shrineId));
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleCheckIn = (shrineId: string) => {
    setVerifyingId(shrineId);
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation not supported",
        description: "Checking in virtually.",
      });
      onCheckIn(shrineId);
      setVerifyingId(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        onCheckIn(shrineId, position.coords);
        setVerifyingId(null);
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast({
          title: "Location access denied",
          description: "Checking in virtually. Enable location for physical verification.",
          variant: "destructive"
        });
        onCheckIn(shrineId);
        setVerifyingId(null);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {shrines.map((shrine) => {
        const isVisited = visitedIds.has(shrine.id);
        const isVerifying = verifyingId === shrine.id;

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
                  <Button
                    onClick={() => handleCheckIn(shrine.id)}
                    className="w-full mt-auto"
                    disabled={isVerifying}
                  >
                    {isVerifying ? "Verifying Location..." : "Check In"}
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
  const { user } = useAuth(); // Removed logoutMutation as it is now in Sidebar
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
    mutationFn: async ({ shrineId, location }: { shrineId: string, location?: GeolocationCoordinates }) => {
      const payload: any = { shrineId };
      if (location) {
        payload.latitude = location.latitude;
        payload.longitude = location.longitude;
        payload.accuracy = location.accuracy;
      }
      const res = await apiRequest("POST", "/api/visits", payload);
      return res.json();
    },
    onMutate: async ({ shrineId, location }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/visits"] });
      await queryClient.cancelQueries({ queryKey: ["/api/journey"] });

      const previousVisits = queryClient.getQueryData<Visit[]>(["/api/visits"]);
      const previousJourney = queryClient.getQueryData<Journey>(["/api/journey"]);

      // Optimistic Update for Visits (Add temporary visit)
      const shrine = shrines?.find(s => s.id === shrineId);
      if (shrine) {
          const optimisticVisit: Visit = {
            id: -1, // Temporary ID
            userId: user?.id || 0,
            shrineId: shrine.id,
            visitedAt: new Date(), // Date object is compatible with Visit type in frontend usage (drizzle returns Date objects)
            notes: null,
            isVirtual: !location,
            verifiedLocation: location ? {
              latitude: location.latitude,
              longitude: location.longitude,
              accuracy: location.accuracy,
              timestamp: new Date().toISOString()
            } : null
          };

          queryClient.setQueryData<Visit[]>(["/api/visits"], (old) => {
            return old ? [optimisticVisit, ...old] : [optimisticVisit];
          });

          // Optimistic Update for Journey
          if (journey) {
               queryClient.setQueryData<Journey>(["/api/journey"], (old) => {
                    if (!old) return old;
                    // Assuming monotonic progress, but we just increment for visual feedback
                    return { ...old, currentShrineOrder: Math.max(old.currentShrineOrder, shrine.order) };
               });
          }
      }

      return { previousVisits, previousJourney };
    },
    onError: (err, variables, context) => {
      if (context?.previousVisits) {
        queryClient.setQueryData(["/api/visits"], context.previousVisits);
      }
      if (context?.previousJourney) {
        queryClient.setQueryData(["/api/journey"], context.previousJourney);
      }
      toast({
        title: "Check-in failed",
        description: "Could not record your visit. Please try again.",
        variant: "destructive"
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/journey"] });
    },
    onSuccess: (data, variables) => {
      if (variables.location) {
         toast({ title: "Location Verified!", description: "You have physically checked in." });
      } else {
         toast({ title: "Checked in!", description: "Virtual visit recorded." });
      }
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
    <div className="flex h-screen bg-background">
       {/* Use Sidebar Layout */}
       <Sidebar className="hidden md:flex" />

       <main className="flex-1 overflow-auto p-4 md:p-8 relative">
        <header className="md:hidden flex justify-between items-center mb-6">
           <h1 className="text-xl font-bold">Sacred Steps</h1>
           {/* Mobile Sidebar Trigger could go here, for now rely on basic layout */}
        </header>

        <div className="max-w-6xl mx-auto">
          <div className="mb-6 flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-muted-foreground">Namaste, {user?.username || "Traveler"}</p>
            </div>
          </div>

          <JourneyProgress journey={currentJourney} shrines={shrines} />

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-bold mb-6">Shrines on the Path</h2>
              {shrines.length === 0 ? (
                <Card className="p-8 text-center text-muted-foreground">
                  <p>No shrines found. The path is currently hidden.</p>
                </Card>
              ) : (
                <ShrineList
                  shrines={shrines}
                  visits={visits}
                  onCheckIn={(id, location) => checkInMutation.mutate({ shrineId: id, location })}
                />
              )}
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
                    .map(visit => {
                      const shrine = shrines.find(s => s.id === visit.shrineId);
                      if (!shrine) return null;
                      return <VisitCard key={visit.id} visit={visit} shrine={shrine} />;
                    })
                )}
              </ScrollArea>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
