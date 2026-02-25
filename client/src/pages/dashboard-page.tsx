import { useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { Journey, Visit, Shrine } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";
import { Sidebar } from "@/components/layout/sidebar";
import { JourneyProgress } from "@/components/dashboard/journey-progress";
import { VisitCard } from "@/components/dashboard/visit-card";
import { ShrineList } from "@/components/dashboard/shrine-list";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { Loader2 } from "lucide-react";
import { useInView } from "react-intersection-observer";
import { Skeleton } from "@/components/ui/skeleton";
import { MissionFailed } from "@/components/ui/mission-failed";
import { useCheckIn } from "@/hooks/use-check-in";
import { Quote } from "lucide-react";

const DAILY_QUOTES = [
  "Your own Self-Realization is the greatest service you can render the world. - Ramana Maharshi",
  "Happiness is your nature. It is not wrong to desire it. What is wrong is seeking it outside when it is inside. - Ramana Maharshi",
  "The path is not a line, but a circle. You are not going anywhere, you are returning. - Ancient Wisdom",
  "Walk as if you are kissing the Earth with your feet. - Thich Nhat Hanh",
  "The purpose of the pilgrimage is to quiet the mind so the soul can speak. - Sacred Steps",
  "Silence is the language of God, all else is poor translation. - Rumi",
  "What you are looking for is what is looking. - St. Francis of Assisi",
  "The cave you fear to enter holds the treasure you seek. - Joseph Campbell",
  "Be still and know. - Psalm 46:10",
  "Arunachala is the self. To know the self is to know Arunachala. - Ramana Maharshi",
  "The journey of a thousand miles begins with a single step. - Lao Tzu",
  "You are not a drop in the ocean. You are the entire ocean in a drop. - Rumi",
  "Let yourself be silently drawn by the strange pull of what you really love. It will not lead you astray. - Rumi",
  "The foot feels the foot when it feels the ground. - Buddha",
];

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
  const { user } = useAuth();
  const { ref, inView } = useInView();

  const {
    data: shrines,
    isError: isShrinesError,
    error: shrinesError,
    refetch: refetchShrines
  } = useQuery<Shrine[]>({
    queryKey: ["/api/shrines"]
  });

  const {
    data: visitsPageData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
    isError: isVisitsError,
    error: visitsError,
    refetch: refetchVisits
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

  const shrinesById = useMemo(() => {
    return new Map(shrines?.map(s => [s.id, s]));
  }, [shrines]);

  const { data: journey } = useQuery<Journey>({
    queryKey: ["/api/journey"]
  });

  const dailyQuote = useMemo(() => DAILY_QUOTES[Math.floor(Math.random() * DAILY_QUOTES.length)], []);

  // Use the extracted hook
  const checkInMutation = useCheckIn(shrines);

  if (isShrinesError || isVisitsError) {
    return (
      <MissionFailed
        onRetry={() => {
          refetchShrines();
          refetchVisits();
        }}
        error={shrinesError || visitsError}
      />
    );
  }

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
           <h1 className="text-xl font-bold flex items-center gap-2">
             Sacred Steps <span role="img" aria-label="Sacred Om Symbol">🕉️</span>
           </h1>
           <MobileSidebar />
        </header>

        <div className="max-w-6xl mx-auto">
          <div className="mb-6 flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-muted-foreground">Namaste, {user?.username || "Traveler"}</p>
            </div>
          </div>

          <Card className="mb-8 bg-gradient-to-r from-saffron/10 to-transparent border-none shadow-sm">
            <div className="p-6 flex gap-4 items-start">
              <Quote className="w-8 h-8 text-saffron/50 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-saffron mb-1">Daily Wisdom</h3>
                <p className="text-muted-foreground italic">"{dailyQuote}"</p>
              </div>
            </div>
          </Card>

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
                  <div className="text-center p-8 border border-dashed rounded-lg text-muted-foreground bg-muted/20">
                    <p className="font-medium text-lg text-saffron">Your Journal Awaits</p>
                    <p className="text-sm mt-2 leading-relaxed">
                      "The ink of the scholar is more sacred than the blood of the martyr."
                      <br /><br />
                      This space is for your inner reflections. As you walk the path, pause at each shrine. Listen to the silence. Write down what you feel, what you release, and what you find. Your first entry begins with your first step.
                    </p>
                  </div>
                ) : (
                  <>
                    {visits.map(visit => {
                      const shrine = shrinesById.get(visit.shrineId);
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
