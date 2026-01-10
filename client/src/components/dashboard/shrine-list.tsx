import { Shrine, Visit } from "@shared/schema";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

export function ShrineList({ shrines, visits, onCheckIn }: { shrines: Shrine[], visits: Visit[], onCheckIn: (id: string, location?: GeolocationCoordinates) => void }) {
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
