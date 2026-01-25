import { Visit, Shrine } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";

// Refactored VisitCard component for Dashboard
export function VisitCard({ visit, shrine }: { visit: Visit, shrine: Shrine }) {
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
                aria-label={`Reflection for ${shrine.name}`}
              />
              <Button
                size="sm"
                variant="outline"
                className="h-auto"
                onClick={() => updateNoteMutation.mutate(notes)}
                disabled={updateNoteMutation.isPending || notes === visit.notes || visit.id === -1}
                title={visit.id === -1 ? "Syncing..." : "Save note"}
                aria-label={`Save reflection for ${shrine.name}`}
              >
                {visit.id === -1 ? "Syncing..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
