import { type Shrine } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Navigation, MapPin, CheckCircle2 } from "lucide-react";
import { useGeolocation } from "@/hooks/use-geolocation";
import { motion } from "framer-motion";
import { calculateDistance } from "@shared/geo";
import { LOCATION_VERIFICATION_THRESHOLD } from "@shared/schema";

interface PathfinderCompassProps {
  targetShrine: Shrine;
  onCheckIn: (location: { latitude: number; longitude: number; accuracy: number }) => void;
  isCheckingIn: boolean;
  hasVisited: boolean;
}

function calculateBearing(startLat: number, startLng: number, destLat: number, destLng: number): number {
  const startLatRad = (startLat * Math.PI) / 180;
  const startLngRad = (startLng * Math.PI) / 180;
  const destLatRad = (destLat * Math.PI) / 180;
  const destLngRad = (destLng * Math.PI) / 180;

  const y = Math.sin(destLngRad - startLngRad) * Math.cos(destLatRad);
  const x =
    Math.cos(startLatRad) * Math.sin(destLatRad) -
    Math.sin(startLatRad) * Math.cos(destLatRad) * Math.cos(destLngRad - startLngRad);

  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

export function PathfinderCompass({ targetShrine, onCheckIn, isCheckingIn, hasVisited }: PathfinderCompassProps) {
  const { latitude, longitude, accuracy, error, loading } = useGeolocation();

  if (loading) {
    return (
      <Card className="w-full max-w-md mx-auto text-center p-8">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="mt-4 text-muted-foreground">Acquiring satellite lock...</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-md mx-auto border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Signal Lost</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Please enable location services to access the Pathfinder.</p>
          <p className="text-xs text-muted-foreground mt-2">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (latitude === null || longitude === null) return null;

  const distance = calculateDistance(latitude, longitude, targetShrine.latitude, targetShrine.longitude);
  const bearing = calculateBearing(latitude, longitude, targetShrine.latitude, targetShrine.longitude);
  const isWithinRange = distance <= LOCATION_VERIFICATION_THRESHOLD;

  // Note: We don't have device orientation in this simple hook,
  // so the arrow points to the bearing relative to North.
  // Users need to align themselves or we assume North is up.
  // Ideally we'd use DeviceOrientationEvent for true compass.

  return (
    <Card className="w-full max-w-md mx-auto overflow-hidden relative border-primary/20 bg-background/95 backdrop-blur">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />

      <CardHeader className="text-center pb-2">
        <Badge variant="outline" className="mx-auto mb-2 font-mono text-xs uppercase tracking-widest">
          Target Locked
        </Badge>
        <CardTitle className="text-2xl font-bold text-primary">{targetShrine.name}</CardTitle>
        <CardDescription className="flex items-center justify-center gap-2">
           <span className="text-2xl">{targetShrine.emoji}</span> {targetShrine.element} Element
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col items-center gap-8 py-8">
        {/* Compass Visual */}
        <div className="relative w-48 h-48 rounded-full border-4 border-muted flex items-center justify-center bg-muted/10 shadow-inner">
           {/* North Marker */}
           <div className="absolute top-2 text-xs font-bold text-muted-foreground">N</div>

           {/* Direction Arrow */}
           <motion.div
             className="text-primary absolute"
             animate={{ rotate: bearing }}
             transition={{ type: "spring", stiffness: 50 }}
           >
             <Navigation className="w-16 h-16 fill-current" />
           </motion.div>

           <div className="absolute bottom-[-30px] font-mono text-lg font-bold">
             {Math.round(distance)}m
           </div>
        </div>

        <div className="space-y-4 w-full text-center">
          <div className="grid grid-cols-2 gap-4 text-xs font-mono text-muted-foreground">
             <div className="bg-muted p-2 rounded">
               <span className="block opacity-50">LAT</span>
               {latitude.toFixed(6)}
             </div>
             <div className="bg-muted p-2 rounded">
               <span className="block opacity-50">LNG</span>
               {longitude.toFixed(6)}
             </div>
          </div>

          {hasVisited ? (
             <Button className="w-full gap-2" size="lg" variant="secondary" disabled>
               <CheckCircle2 className="w-5 h-5 text-green-500" />
               Already Visited
             </Button>
          ) : (
            <Button
              className={`w-full gap-2 transition-all ${isWithinRange ? 'animate-pulse' : ''}`}
              size="lg"
              onClick={() => onCheckIn({ latitude, longitude, accuracy: accuracy || 0 })}
              disabled={!isWithinRange || isCheckingIn}
              variant={isWithinRange ? "default" : "secondary"}
            >
              {isWithinRange ? (
                <>
                  <MapPin className="w-5 h-5" /> Verify Presence
                </>
              ) : (
                <>
                  <Navigation className="w-5 h-5" /> {Math.round(distance)}m to Target
                </>
              )}
            </Button>
          )}

          {!isWithinRange && !hasVisited && (
             <p className="text-xs text-muted-foreground animate-pulse">
               Move closer to verify your presence.
             </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
