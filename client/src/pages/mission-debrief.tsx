import { useQuery } from "@tanstack/react-query";
import { Visit, Shrine } from "@shared/schema";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Award, MapPin, Footprints } from "lucide-react";
import { motion } from "framer-motion";
import { formatDuration, intervalToDuration } from "date-fns";
import React from "react";

export default function MissionDebriefPage() {
  const { data: shrines } = useQuery<Shrine[]>({ queryKey: ["/api/shrines"] });
  const { data: visits } = useQuery<Visit[]>({ queryKey: ["/api/visits"] });

  // Journey data is not strictly needed for the aggregate stats we show here,
  // preventing unused variable warning.

  if (!shrines || !visits) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Calculate stats
  const totalShrines = shrines.length;
  const visitedCount = visits.length;
  const progress = Math.round((visitedCount / totalShrines) * 100);

  const startTime = visits.length > 0
    ? new Date(Math.min(...visits.map(v => new Date(v.visitedAt).getTime())))
    : null;

  const lastTime = visits.length > 0
    ? new Date(Math.max(...visits.map(v => new Date(v.visitedAt).getTime())))
    : null;

  const duration = (startTime && lastTime && visitedCount > 1)
    ? formatDuration(intervalToDuration({ start: startTime, end: lastTime }), { format: ['hours', 'minutes'] })
    : "Just started";

  return (
    <div className="flex h-screen bg-background">
      <Sidebar className="hidden md:flex" />
      <main className="flex-1 overflow-auto p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-2"
          >
            <h1 className="text-4xl font-bold tracking-tight">Mission Debrief</h1>
            <p className="text-muted-foreground text-lg">Your spiritual journey statistics</p>
          </motion.div>

          <div className="grid gap-4 md:grid-cols-3">
            <StatsCard
              icon={<Award className="w-8 h-8 text-yellow-500" />}
              label="Completion"
              value={`${progress}%`}
              delay={0.1}
            />
            <StatsCard
              icon={<MapPin className="w-8 h-8 text-blue-500" />}
              label="Shrines Visited"
              value={`${visitedCount} / ${totalShrines}`}
              delay={0.2}
            />
            <StatsCard
              icon={<Footprints className="w-8 h-8 text-green-500" />}
              label="Time on Path"
              value={duration}
              delay={0.3}
            />
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="bg-muted/50 rounded-lg p-8 text-center"
          >
             <h2 className="text-2xl font-semibold mb-4">
               {progress === 100 ? "Journey Complete" : "Path in Progress"}
             </h2>
             <p className="max-w-2xl mx-auto text-muted-foreground">
               {progress === 100
                 ? "You have successfully completed the Giri Pradakshina. May the energy of Arunachala stay with you forever."
                 : "Keep going. Every step brings you closer to the center of your own being."
               }
             </p>
          </motion.div>
        </div>
      </main>
    </div>
  );
}

function StatsCard({ icon, label, value, delay }: { icon: React.ReactNode, label: string, value: string, delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.4 }}
    >
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-6 space-y-4">
          <div className="p-3 bg-muted rounded-full">
            {icon}
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-sm text-muted-foreground">{label}</div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
