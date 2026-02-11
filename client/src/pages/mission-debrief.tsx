import { useQuery } from "@tanstack/react-query";
import { Visit, Shrine, MovementLog, SitRep, Group } from "@shared/schema";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Award, MapPin, Footprints, PlayCircle, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import { formatDuration, intervalToDuration } from "date-fns";
import React, { useState, useEffect, useRef } from "react";
import { AARMap } from "@/components/aar/aar-map";
import { TimelineControls } from "@/components/aar/timeline-controls";

export default function MissionDebriefPage() {
  const { data: shrines } = useQuery<Shrine[]>({ queryKey: ["/api/shrines"] });
  const { data: visits } = useQuery<Visit[]>({ queryKey: ["/api/visits"] });
  const { data: group } = useQuery<Group>({ queryKey: ["/api/groups/current"] });

  const groupId = group?.id;

  const { data: aarData, isLoading: isLoadingAAR } = useQuery<{ logs: MovementLog[], sitreps: SitRep[] }>({
    queryKey: [`/api/groups/${groupId}/aar`],
    enabled: !!groupId,
    refetchInterval: false, // Don't refetch automatically during playback
  });

  if (!shrines || !visits) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar className="hidden md:flex" />
      <main className="flex-1 overflow-auto p-4 md:p-8">
        <header className="md:hidden flex justify-between items-center mb-6">
           <h1 className="text-xl font-bold flex items-center gap-2">
             Sacred Steps <span role="img" aria-label="Sacred Om Symbol">🕉️</span>
           </h1>
           <MobileSidebar />
        </header>
        <div className="max-w-6xl mx-auto space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-2"
          >
            <h1 className="text-4xl font-bold tracking-tight">Mission Debrief</h1>
            <p className="text-muted-foreground text-lg">Tactical Review & Spiritual Statistics</p>
          </motion.div>

          <Tabs defaultValue="stats" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 max-w-[400px] mx-auto">
              <TabsTrigger value="stats" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                <span>Statistics</span>
              </TabsTrigger>
              <TabsTrigger value="aar" className="flex items-center gap-2" disabled={!groupId}>
                 <PlayCircle className="w-4 h-4" />
                 <span>Tactical Replay</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="stats">
                <StatsView shrines={shrines} visits={visits} />
            </TabsContent>

            <TabsContent value="aar">
              {isLoadingAAR ? (
                  <div className="flex justify-center p-12">
                      <Loader2 className="animate-spin w-8 h-8" />
                  </div>
              ) : aarData && aarData.logs.length > 0 ? (
                  <AARPlayer logs={aarData.logs} sitreps={aarData.sitreps} />
              ) : (
                  <div className="text-center p-12 text-muted-foreground border rounded-lg bg-muted/20">
                      No tactical telemetry available for replay.
                  </div>
              )}
            </TabsContent>
          </Tabs>

        </div>
      </main>
    </div>
  );
}

function StatsView({ shrines, visits }: { shrines: Shrine[], visits: Visit[] }) {
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
        <div className="space-y-8">
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
    );
}

function AARPlayer({ logs, sitreps }: { logs: MovementLog[], sitreps: SitRep[] }) {
    // Sort logs by time
    const sortedLogs = React.useMemo(() =>
        [...logs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
    [logs]);

    const startTime = new Date(sortedLogs[0].timestamp).getTime();
    const endTime = new Date(sortedLogs[sortedLogs.length - 1].timestamp).getTime();

    // Add a small buffer to end time so we can see the final state
    const displayEndTime = endTime + 10000;

    const [currentTime, setCurrentTime] = useState(startTime);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1); // 1x, 5x, 10x, 20x

    const animationRef = useRef<number>();
    const lastTickRef = useRef<number>(0);

    const togglePlay = () => setIsPlaying(!isPlaying);

    const changeSpeed = () => {
        const speeds = [1, 5, 10, 20, 60];
        const nextSpeed = speeds[(speeds.indexOf(playbackSpeed) + 1) % speeds.length];
        setPlaybackSpeed(nextSpeed);
    };

    const handleSeek = (time: number) => {
        setCurrentTime(time);
        if (time >= displayEndTime) setIsPlaying(false);
    };

    useEffect(() => {
        if (isPlaying) {
            lastTickRef.current = performance.now();

            const animate = (now: number) => {
                const delta = now - lastTickRef.current;
                lastTickRef.current = now;

                setCurrentTime(prev => {
                    // Calculate simulated time advance
                    // Let's say at 1x, 1 real second = 1 second sim.
                    // delta is in ms.

                    const newTime = prev + (delta * playbackSpeed);

                    if (newTime >= displayEndTime) {
                        setIsPlaying(false);
                        return displayEndTime;
                    }
                    return newTime;
                });

                if (isPlaying) { // Check ref inside loop? state is captured in closure? No, react state updates trigger re-render
                   animationRef.current = requestAnimationFrame(animate);
                }
            };

            animationRef.current = requestAnimationFrame(animate);
        }

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [isPlaying, playbackSpeed, displayEndTime]);

    // When pause/play toggles, the effect re-runs.
    // The issue is `isPlaying` in the closure of `animate` is stale?
    // Actually, setting state triggers re-render, which tears down effect and restarts it with new isPlaying.
    // So logic is fine.

    return (
        <div className="h-[600px] flex flex-col gap-4">
            <div className="flex-1 border rounded-lg overflow-hidden relative">
                 <AARMap
                    logs={sortedLogs}
                    sitreps={sitreps}
                    currentTime={currentTime}
                 />

                 <div className="absolute bottom-4 left-4 right-4 z-[1000]">
                    <TimelineControls
                        isPlaying={isPlaying}
                        onPlayPause={togglePlay}
                        currentTime={currentTime}
                        startTime={startTime}
                        endTime={displayEndTime}
                        onSeek={handleSeek}
                        speed={playbackSpeed}
                        onSpeedChange={changeSpeed}
                    />
                 </div>
            </div>

            <div className="p-4 bg-muted/20 rounded-lg text-sm text-muted-foreground border">
                <strong>Tactical Note:</strong> Playback simulates historical movement data captured during the operation.
                Speed can be adjusted up to 60x for rapid review.
            </div>
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
