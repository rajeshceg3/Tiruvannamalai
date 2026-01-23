import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useInfiniteQuery } from "@tanstack/react-query";
import { Journey, Visit, Shrine, type InsertVisit } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Sidebar } from "@/components/layout/sidebar";
import { JourneyProgress } from "@/components/dashboard/journey-progress";
import { VisitCard } from "@/components/dashboard/visit-card";
import { ShrineList } from "@/components/dashboard/shrine-list";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useInView } from "react-intersection-observer";
import { Skeleton } from "@/components/ui/skeleton";

function DashboardSkeleton() {
  return (
    <div className="flex h-screen bg-background">
      <div className="hidden md:flex w-64 border-r flex-col p-4 gap-4">
         <Skeleton className="h-10 w-full" />
         <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
         </div>
      </div>
      <main className="flex-1 p-4 md:p-8 space-y-8">
        <div className="flex justify-between items-end">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-32 w-full" />
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
             <Skeleton className="h-8 w-48 mb-4" />
             <Skeleton className="h-40 w-full" />
             <Skeleton className="h-40 w-full" />
          </div>
          <div className="space-y-4">
             <Skeleton className="h-8 w-32 mb-4" />
             <Skeleton className="h-24 w-full" />
             <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </main>
    </div>
  )
}

// Dashboard Page: Main entry point for user stats and shrine check-ins
// Refactored to use modular components for better maintainability
export default function DashboardPage() {
  const { user } = useAuth(); // Removed logoutMutation as it is now in Sidebar
  const { toast } = useToast();
  const { ref, inView } = useInView();

  const { data: shrines } = useQuery<Shrine[]>({
    queryKey: ["/api/shrines"]
  });

  const {
    data: visitsPageData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status
  } = useInfiniteQuery({
    queryKey: ["/api/visits"],
    queryFn: async ({ pageParam = 0 }) => {
      const res = await apiRequest("GET", `/api/visits?limit=20&offset=${pageParam}`);
      return res.json() as Promise<Visit[]>;
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === 20 ? allPages.length * 20 : undefined;
    },
    initialPageParam: 0
  });

  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage]);

  // Flatten the pages into a single array
  const visits = visitsPageData?.pages.flat() || [];

  const { data: journey } = useQuery<Journey>({
    queryKey: ["/api/journey"]
  });

  const checkInMutation = useMutation({
    mutationFn: async ({ shrineId, location }: { shrineId: string, location?: GeolocationCoordinates }) => {
      const payload: InsertVisit = { shrineId };
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

      const previousVisits = queryClient.getQueryData(["/api/visits"]);
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

          queryClient.setQueryData<{ pages: Visit[][], pageParams: any[] }>(["/api/visits"], (old) => {
             if (!old) return { pages: [[optimisticVisit]], pageParams: [0] };
             // Prepend to the first page
             const newFirstPage = [optimisticVisit, ...old.pages[0]];
             return {
               ...old,
               pages: [newFirstPage, ...old.pages.slice(1)]
             };
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

  if (!shrines || status === 'pending') {
    return <DashboardSkeleton />;
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
                    {visits.map(visit => {
                      const shrine = shrines.find(s => s.id === visit.shrineId);
                      if (!shrine) return null;
                      return <VisitCard key={visit.id} visit={visit} shrine={shrine} />;
                    })}
                    <div ref={ref} className="py-4 text-center">
                       {isFetchingNextPage ? (
                           <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                       ) : hasNextPage ? (
                           <Button
                             variant="ghost"
                             onClick={() => fetchNextPage()}
                             className="text-muted-foreground"
                           >
                             Load Older Entries
                           </Button>
                       ) : visits.length > 0 ? (
                           <span className="text-xs text-muted-foreground">All entries loaded</span>
                       ) : null}
                    </div>
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
