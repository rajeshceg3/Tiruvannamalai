import { useQuery, useMutation } from "@tanstack/react-query";
import { type Shrine, type Visit } from "@shared/schema";
import { PathfinderCompass } from "@/components/pathfinder-compass";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar"; // Assuming this exists or similar layout
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";

export default function PathfinderPage() {
  const { toast } = useToast();
  const [selectedShrineId, setSelectedShrineId] = useState<string | null>(null);

  const { data: shrines, isLoading: isLoadingShrines } = useQuery<Shrine[]>({
    queryKey: ["/api/shrines"],
  });

  const { data: visits, isLoading: isLoadingVisits } = useQuery<Visit[]>({
    queryKey: ["/api/visits"],
  });

  const checkInMutation = useMutation({
    mutationFn: async (data: { shrineId: string; latitude: number; longitude: number; accuracy: number }) => {
      const res = await apiRequest("POST", "/api/visits", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/journey"] });
      toast({
        title: "Verified Check-in Successful",
        description: "Your physical presence has been confirmed on the blockchain of spirituality.",
      });
    },
    onError: (error) => {
      toast({
        title: "Check-in Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoadingShrines || isLoadingVisits) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!shrines || !visits) return null;

  // Determine next target
  const visitedIds = new Set(visits.map((v) => v.shrineId));
  const nextShrine = shrines.find((s) => !visitedIds.has(s.id)) || shrines[0];
  const targetShrine = selectedShrineId
    ? shrines.find(s => s.id === selectedShrineId)
    : nextShrine;

  const hasVisitedTarget = targetShrine ? visitedIds.has(targetShrine.id) : false;

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Mobile-first layout adjustments could be made here, reusing existing Layout if possible */}
      <Sidebar className="hidden md:flex" />

      <main className="flex-1 overflow-auto p-4 md:p-8 relative">
        <header className="md:hidden flex justify-between items-center mb-6">
           <h1 className="text-xl font-bold flex items-center gap-2">
             Sacred Steps <span role="img" aria-label="Sacred Om Symbol">🕉️</span>
           </h1>
           <MobileSidebar />
        </header>

        <div className="max-w-4xl mx-auto space-y-8">

          <div className="space-y-2">
             <h1 className="text-3xl font-bold tracking-tight">Pilgrim's Pathfinder</h1>
             <p className="text-muted-foreground">
               Geospatial navigation and verification protocol.
             </p>
          </div>

          <Tabs defaultValue="compass" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="compass">Navigation</TabsTrigger>
              <TabsTrigger value="targets">Target List</TabsTrigger>
            </TabsList>

            <TabsContent value="compass" className="mt-6">
              {targetShrine ? (
                <PathfinderCompass
                  targetShrine={targetShrine}
                  hasVisited={hasVisitedTarget}
                  isCheckingIn={checkInMutation.isPending}
                  onCheckIn={(loc) => checkInMutation.mutate({
                    shrineId: targetShrine.id,
                    ...loc
                  })}
                />
              ) : (
                <Card>
                  <CardContent className="pt-6 text-center">
                     <p>All shrines visited. Pilgrimage complete.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="targets" className="mt-6">
               <div className="grid gap-4 md:grid-cols-2">
                 {shrines.map(shrine => {
                   const isVisited = visitedIds.has(shrine.id);
                   return (
                     <Card
                       key={shrine.id}
                       className={`cursor-pointer transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${selectedShrineId === shrine.id ? 'border-primary' : ''}`}
                       onClick={() => setSelectedShrineId(shrine.id)}
                       role="button"
                       tabIndex={0}
                       onKeyDown={(e) => {
                         if (e.key === 'Enter' || e.key === ' ') {
                           e.preventDefault();
                           setSelectedShrineId(shrine.id);
                         }
                       }}
                       aria-label={`Select ${shrine.name}${isVisited ? ', marked as completed' : ''}`}
                     >
                       <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                         <CardTitle className="text-sm font-medium">
                           {shrine.name}
                         </CardTitle>
                         <span className="text-xl">{shrine.emoji}</span>
                       </CardHeader>
                       <CardContent>
                         <div className="text-xs text-muted-foreground">{shrine.element}</div>
                         {isVisited && <div className="text-xs text-green-500 font-bold mt-2">COMPLETED</div>}
                       </CardContent>
                     </Card>
                   )
                 })}
               </div>
            </TabsContent>
          </Tabs>

        </div>
      </main>
    </div>
  );
}
