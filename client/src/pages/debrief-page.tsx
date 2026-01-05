import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { Loader2, Trophy, Map, Footprints, Clock, Award } from "lucide-react";

interface Achievement {
  id: number;
  badgeId: string;
  earnedAt: string;
}

interface JourneyStatsClient {
  totalVisits: number;
  physicalVisits: number;
  virtualVisits: number;
  totalDistance: number;
  completionPercentage: number;
  firstVisitDate: string | null;
  lastVisitDate: string | null;
  achievements: Achievement[];
}

interface BadgeDef {
  id: string;
  name: string;
  description: string;
  icon: string;
}

function StatCard({ title, value, icon: Icon, description }: { title: string, value: string | number, icon: any, description?: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );
}

function AchievementBadge({ badge, earned }: { badge: BadgeDef, earned: boolean }) {
  return (
    <div className={`flex flex-col items-center p-4 rounded-lg border text-center transition-all ${earned ? 'bg-primary/10 border-primary' : 'bg-muted/50 opacity-50 grayscale'}`}>
      <div className="text-4xl mb-2">{badge.icon}</div>
      <h3 className="font-semibold text-sm">{badge.name}</h3>
      <p className="text-xs text-muted-foreground mt-1">{badge.description}</p>
      {earned && <Badge variant="secondary" className="mt-2 text-[10px] bg-primary/20 text-primary">EARNED</Badge>}
    </div>
  );
}

export default function DebriefPage() {
  const { data: stats, isLoading: statsLoading } = useQuery<JourneyStatsClient>({
    queryKey: ["/api/analytics"]
  });

  const { data: badges, isLoading: badgesLoading } = useQuery<BadgeDef[]>({
    queryKey: ["/api/badges"]
  });

  if (statsLoading || badgesLoading || !stats || !badges) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const earnedBadgeIds = new Set(stats.achievements.map(a => a.badgeId));

  return (
    <div className="flex h-screen bg-background">
      <Sidebar className="hidden md:flex" />

      <main className="flex-1 overflow-auto p-4 md:p-8">
        <div className="max-w-5xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Mission Debrief</h1>
            <p className="text-muted-foreground">Tactical analysis of your spiritual journey.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Completion"
              value={`${stats.completionPercentage}%`}
              icon={Map}
              description={`${stats.physicalVisits + stats.virtualVisits} shrines visited`}
            />
            <StatCard
              title="Physical Check-ins"
              value={stats.physicalVisits}
              icon={Map}
              description="Verified on-site"
            />
            <StatCard
              title="Virtual Visits"
              value={stats.virtualVisits}
              icon={Footprints}
              description="Remote connections"
            />
            <StatCard
              title="Time in Field"
              value={stats.firstVisitDate ? Math.ceil((new Date().getTime() - new Date(stats.firstVisitDate).getTime()) / (1000 * 60 * 60 * 24)) + " Days" : "0 Days"}
              icon={Clock}
              description="Since first check-in"
            />
          </div>

          <Tabs defaultValue="achievements" className="space-y-4">
            <TabsList>
              <TabsTrigger value="achievements">Achievements</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            </TabsList>

            <TabsContent value="achievements" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    Medals & Commendations
                  </CardTitle>
                  <CardDescription>
                    You have earned {earnedBadgeIds.size} out of {badges.length} possible badges.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                     {badges.map((badge) => (
                       <AchievementBadge
                         key={badge.id}
                         badge={badge}
                         earned={earnedBadgeIds.has(badge.id)}
                       />
                     ))}
                   </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="timeline">
              <Card>
                <CardHeader>
                  <CardTitle>Mission Timeline</CardTitle>
                  <CardDescription>Chronological log of your movements.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center h-64 text-muted-foreground border-2 border-dashed rounded-lg">
                    Timeline visualization coming in Phase 2.
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

        </div>
      </main>
    </div>
  );
}
