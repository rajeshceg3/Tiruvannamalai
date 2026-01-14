import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Journey, Visit, Shrine } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Sidebar } from "@/components/layout/sidebar";
import { JourneyProgress } from "@/components/dashboard/journey-progress";
import { VisitCard } from "@/components/dashboard/visit-card";
import { ShrineList } from "@/components/dashboard/shrine-list";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";

// Dashboard Page: Main entry point for user stats and shrine check-ins
// Refactored to use modular components for better maintainability
export default function DashboardPage() {
  const { user } = useAuth(); // Removed logoutMutation as it is now in Sidebar
  const { toast } = useToast();
  const [visitLimit, setVisitLimit] = useState(50);

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
           <MobileSidebar />
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
                  <>
                    {visits.slice(0, visitLimit).map(visit => {
                      const shrine = shrines.find(s => s.id === visit.shrineId);
                      if (!shrine) return null;
                      return <VisitCard key={visit.id} visit={visit} shrine={shrine} />;
                    })}
                    {visits.length > visitLimit && (
                      <Button
                        variant="outline"
                        className="w-full mt-4"
                        onClick={() => setVisitLimit(prev => prev + 50)}
                      >
                        Load More Entries ({visits.length - visitLimit} remaining)
                      </Button>
                    )}
                  </>
                )}
              </ScrollArea>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
