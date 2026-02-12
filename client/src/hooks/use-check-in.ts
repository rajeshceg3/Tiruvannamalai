import { useMutation } from "@tanstack/react-query";
import { Journey, Visit, Shrine, type InsertVisit } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { offlineQueue } from "@/lib/offline-queue";
import { useAuth } from "@/hooks/use-auth";

export function useCheckIn(shrines: Shrine[] | undefined) {
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ shrineId, location }: { shrineId: string, location?: GeolocationCoordinates }) => {
      const payload: InsertVisit = { shrineId };
      if (location) {
        payload.latitude = location.latitude;
        payload.longitude = location.longitude;
        payload.accuracy = location.accuracy;
      }

      if (!navigator.onLine) {
        offlineQueue.push("visit", payload);
        // Return a mock Visit object to satisfy type safety
        const mockVisit: Visit = {
            id: -1,
            userId: user?.id || 0,
            shrineId,
            visitedAt: new Date(),
            notes: null,
            isVirtual: !location,
            verifiedLocation: location ? {
              latitude: location.latitude,
              longitude: location.longitude,
              accuracy: location.accuracy,
              timestamp: new Date().toISOString()
            } : null
        };
        return mockVisit;
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

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          queryClient.setQueryData<{ pages: Visit[][], pageParams: any[] }>(["/api/visits"], (old) => {
             if (!old || !old.pages || old.pages.length === 0) {
                return { pages: [[optimisticVisit]], pageParams: [0] };
             }
             // Prepend to the first page safely
             const firstPage = old.pages[0] || [];
             const newFirstPage = [optimisticVisit, ...firstPage];
             return {
               ...old,
               pages: [newFirstPage, ...old.pages.slice(1)]
             };
          });

          // Optimistic Update for Journey
          // We don't need 'journey' passed in because we get it from cache here
          if (previousJourney) { // Use previousJourney as the base for optimistic update check
             // Actually, the original code used 'journey' from the outer scope which was the *current* query data.
             // We can just use queryClient.setQueryData with a functional update.
             queryClient.setQueryData<Journey>(["/api/journey"], (old) => {
                  if (!old) return old;
                  // Assuming monotonic progress, but we just increment for visual feedback
                  return { ...old, currentShrineOrder: Math.max(old.currentShrineOrder, shrine.order) };
             });
          }
      }

      return { previousVisits, previousJourney };
    },
    onError: (_err, _variables, context) => {
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
      // Only refetch if online to prevent clearing optimistic data with empty offline fetch
      if (navigator.onLine) {
        queryClient.invalidateQueries({ queryKey: ["/api/visits"] });
        queryClient.invalidateQueries({ queryKey: ["/api/journey"] });
      }
    },
    onSuccess: (data, variables) => {
      if (!navigator.onLine) {
        toast({ title: "Check-in Queued", description: "You are offline. Check-in will sync when online." });
      } else if (variables.location) {
         toast({ title: "Location Verified!", description: "You have physically checked in." });
      } else {
         toast({ title: "Checked in!", description: "Virtual visit recorded." });
      }
    },
  });
}
