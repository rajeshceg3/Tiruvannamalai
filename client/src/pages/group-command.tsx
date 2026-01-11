import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { socketClient } from "@/lib/socket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Users, MapPin, Radio, Copy, Check, AlertCircle, HeartPulse, Activity, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";

type GroupMember = {
  id: number;
  userId: number;
  user: {
    username: string;
  };
  joinedAt: string;
  lastLocation?: { lat: number; lng: number };
  lastStatus?: string;
  lastSeenAt?: string;
};

type Group = {
  id: number;
  name: string;
  code: string;
  creatorId: number;
};

type SitRep = {
  id: number;
  userId: number;
  message: string;
  type: string;
  createdAt: string;
};

type CommandCenterData = {
  group: Group;
  members: GroupMember[];
  sitreps: SitRep[];
};

export default function GroupCommand() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  // 1. Fetch Basic Group Info first to get ID
  const { data: currentGroup, isLoading: isGroupLoading } = useQuery<Group | null>({
    queryKey: ["/api/groups/current"],
  });

  // 2. Fetch Full Command Center Data
  const { data: commandData, isLoading } = useQuery<CommandCenterData>({
    queryKey: [`/api/groups/${currentGroup?.id}/command-center`],
    enabled: !!currentGroup?.id,
  });

  // Real-time states
  const [memberLocations, setMemberLocations] = useState<Record<number, any>>({});
  const [memberStatus, setMemberStatus] = useState<Record<number, string>>({});
  const [memberBeacons, setMemberBeacons] = useState<Record<number, string>>({});
  const [liveSitreps, setLiveSitreps] = useState<SitRep[]>([]);
  const [personalStatus, setPersonalStatus] = useState<"ok" | "sos" | "regroup">("ok");
  const [sitrepInput, setSitrepInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize state from persistent data when loaded
  useEffect(() => {
    if (commandData) {
      const locs: Record<number, any> = {};
      const stats: Record<number, string> = {};
      const beacons: Record<number, string> = {};

      commandData.members.forEach(m => {
        if (m.lastLocation) locs[m.userId] = m.lastLocation;
        if (m.lastStatus) beacons[m.userId] = m.lastStatus;
        // Assume offline initially unless we get a ping, or use lastSeenAt logic?
        // For now, let's just leave online status to WS pings
      });

      setMemberLocations(prev => ({ ...locs, ...prev }));
      setMemberBeacons(prev => ({ ...beacons, ...prev }));
      setLiveSitreps(commandData.sitreps.reverse()); // Reverse to show oldest first in list, or handle sorting
    }
  }, [commandData]);

  useEffect(() => {
    if (currentGroup && user) {
      socketClient.joinGroup(user.id, currentGroup.id);

      const unsubLoc = socketClient.on("location_update", (data) => {
        setMemberLocations((prev) => ({ ...prev, [data.userId]: data.location }));
      });

      const unsubMem = socketClient.on("member_update", (data) => {
        setMemberStatus((prev) => ({ ...prev, [data.userId]: data.status }));
        if (data.type === "member_update") {
             queryClient.invalidateQueries({ queryKey: [`/api/groups/${currentGroup.id}/command-center`] });
        }
      });

      const unsubBeacon = socketClient.on("beacon_signal", (data) => {
        setMemberBeacons((prev) => ({ ...prev, [data.userId]: data.signal }));

        if (data.signal === "SOS") {
             const member = commandData?.members.find(m => m.userId === data.userId);
             toast({
                 title: "EMERGENCY BEACON",
                 description: `${member?.user.username || "A member"} has signaled SOS!`,
                 variant: "destructive",
                 duration: 10000
             });
        }
      });

      const unsubSitrep = socketClient.on("sitrep", (data) => {
          setLiveSitreps(prev => [...prev, data.sitrep]);
          // Auto-scroll
          if (scrollRef.current) {
              setTimeout(() => {
                  scrollRef.current?.scrollIntoView({ behavior: "smooth" });
              }, 100);
          }
      });

      // Simulate sending our location occasionally
      const interval = setInterval(() => {
        if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition((pos) => {
            socketClient.sendLocation({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              timestamp: Date.now(),
            });
          });
        }
      }, 10000);

      return () => {
        unsubLoc();
        unsubMem();
        unsubBeacon();
        unsubSitrep();
        clearInterval(interval);
      };
    }
  }, [currentGroup, user, queryClient, commandData]);

  const copyCode = () => {
    if (commandData?.group?.code) {
      navigator.clipboard.writeText(commandData.group.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Copied!", description: "Invite code copied to clipboard." });
    }
  };

  const broadcastBeacon = (signal: "SOS" | "REGROUP" | "MOVING") => {
      socketClient.sendBeacon(signal);
      setPersonalStatus(signal === "SOS" ? "sos" : signal === "REGROUP" ? "regroup" : "ok");

      toast({
          title: `Beacon Broadcast: ${signal}`,
          description: "Squad has been alerted.",
          variant: signal === "SOS" ? "destructive" : "default"
      });
  };

  const sendSitrep = (e: React.FormEvent) => {
      e.preventDefault();
      if (!sitrepInput.trim()) return;

      socketClient.sendSitrep(sitrepInput);
      setSitrepInput("");
  };

  if (isGroupLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentGroup && !isGroupLoading) {
    return <NoGroupState />;
  }

  if (!commandData) return null;

  const { group, members } = commandData;

  return (
    <div className="flex h-screen bg-background">
      <Sidebar className="hidden md:flex" />
      <main className="flex-1 overflow-auto p-4 md:p-8">
        <header className="md:hidden flex justify-between items-center mb-6">
           <h1 className="text-xl font-bold">Sacred Steps</h1>
           <MobileSidebar />
        </header>
        <div className="max-w-6xl mx-auto space-y-8">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                <h1 className="text-3xl font-bold tracking-tight">Squadron Overwatch</h1>
                <p className="text-muted-foreground mt-1">
                    Real-time tactical coordination for group {group.name}.
                </p>
                </div>

                <div className="flex gap-4 items-center">
                    <Card className="bg-muted/50 border-dashed">
                        <CardContent className="p-3 flex items-center gap-4">
                            <div>
                            <div className="text-xs font-medium text-muted-foreground uppercase">Invite Code</div>
                            <div className="text-xl font-mono font-bold tracking-widest">{group.code}</div>
                            </div>
                            <Button size="icon" variant="ghost" onClick={copyCode} aria-label="Copy invite code">
                            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Controls & SitReps */}
                <div className="lg:col-span-2 space-y-6">
                     {/* Beacon Controls */}
                    <div className="grid grid-cols-3 gap-2">
                        <Button
                            size="lg"
                            variant={personalStatus === "sos" ? "destructive" : "outline"}
                            className="h-20 text-sm md:text-lg border-2 flex flex-col gap-1"
                            onClick={() => broadcastBeacon("SOS")}
                        >
                            <AlertCircle className="h-6 w-6" />
                            SOS
                        </Button>
                        <Button
                            size="lg"
                            variant={personalStatus === "regroup" ? "default" : "outline"}
                            className="h-20 text-sm md:text-lg border-2 flex flex-col gap-1"
                            onClick={() => broadcastBeacon("REGROUP")}
                        >
                            <Users className="h-6 w-6" />
                            REGROUP
                        </Button>
                        <Button
                            size="lg"
                            variant="outline"
                            className="h-20 text-sm md:text-lg border-2 flex flex-col gap-1"
                            onClick={() => broadcastBeacon("MOVING")}
                        >
                            <Activity className="h-6 w-6" />
                            MOVING
                        </Button>
                    </div>

                    {/* SitRep Feed */}
                    <Card className="h-[500px] flex flex-col">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Tactical Feed</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 min-h-0 flex flex-col">
                            <ScrollArea className="flex-1 pr-4">
                                <div className="space-y-4">
                                    {liveSitreps.map((sitrep, i) => {
                                        const sender = members.find(m => m.userId === sitrep.userId);
                                        const isMe = sitrep.userId === user?.id;
                                        return (
                                            <div key={i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs font-bold text-muted-foreground">
                                                        {sender?.user.username || "Unknown"}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground/50">
                                                        {new Date(sitrep.createdAt).toLocaleTimeString()}
                                                    </span>
                                                </div>
                                                <div className={`rounded-lg px-3 py-2 max-w-[80%] text-sm ${
                                                    isMe
                                                    ? 'bg-primary text-primary-foreground'
                                                    : sitrep.type === 'alert'
                                                        ? 'bg-destructive/10 border border-destructive text-destructive'
                                                        : 'bg-muted'
                                                }`}>
                                                    {sitrep.message}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={scrollRef} />
                                </div>
                            </ScrollArea>

                            <form onSubmit={sendSitrep} className="mt-4 flex gap-2">
                                <Input
                                    value={sitrepInput}
                                    onChange={(e) => setSitrepInput(e.target.value)}
                                    placeholder="Enter SitRep..."
                                    className="flex-1"
                                />
                                <Button type="submit" size="icon">
                                    <Send className="h-4 w-4" />
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Squad List */}
                <div className="lg:col-span-1">
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                            <Radio className={`h-5 w-5 ${Object.keys(memberLocations).length > 0 ? 'text-green-500 animate-pulse' : ''}`} />
                            Live Telemetry
                            </CardTitle>
                            <CardDescription>
                                {members.length} operators active.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                            {members.map((member) => {
                                const isOnline = memberStatus[member.userId] === "online" || member.userId === user?.id;
                                const location = memberLocations[member.userId];
                                const beacon = memberBeacons[member.userId];
                                const isSelf = member.userId === user?.id;

                                return (
                                <div key={member.id} className={`flex items-center justify-between p-3 rounded-lg border ${beacon === "SOS" ? 'bg-red-500/10 border-red-500' : 'bg-card'}`}>
                                    <div className="flex items-center space-x-3">
                                        <Avatar className="h-8 w-8 border border-primary/20">
                                            <AvatarFallback>{member.user.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div className="overflow-hidden">
                                            <div className="font-medium text-sm flex items-center gap-1">
                                                {member.user.username}
                                                {isSelf && <span className="text-[10px] bg-primary/10 text-primary px-1 rounded">ME</span>}
                                            </div>
                                            <div className="flex items-center text-[10px] text-muted-foreground mt-0.5">
                                                {location ? (
                                                    <span className="flex items-center text-xs">
                                                        <MapPin className="h-3 w-3 mr-0.5" />
                                                        {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                                                    </span>
                                                ) : (
                                                    <span>No Signal</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center">
                                        {beacon ? (
                                            <Badge variant={beacon === "SOS" ? "destructive" : "secondary"} className="text-[10px] px-1 animate-pulse">
                                                {beacon}
                                            </Badge>
                                        ) : (
                                            <div className={`h-2 w-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-300'}`} />
                                        )}
                                    </div>
                                </div>
                                );
                            })}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
      </main>
    </div>
  );
}

function NoGroupState() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/groups", { name });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups/current"] });
      toast({ title: "Squad Formed", description: "You have established a new pilgrimage group." });
    },
    onError: (e) => {
        toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    }
  });

  const joinMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest("POST", "/api/groups/join", { code });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups/current"] });
      toast({ title: "Joined Squad", description: "You have successfully linked with the group." });
    },
    onError: (e: any) => {
        const message = e.message || "Failed to join group";
        toast({ title: "Connection Failed", description: message, variant: "destructive" });
    }
  });

  const [mode, setMode] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-4">
            Yatra Command
          </h1>
          <p className="text-muted-foreground text-lg">
            Coordinate your pilgrimage. Track your squad. Ensure no one is left behind.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-center mb-6 space-x-4">
                <Button
                    variant={mode === "create" ? "default" : "outline"}
                    onClick={() => setMode("create")}
                >
                    Create Squad
                </Button>
                <Button
                    variant={mode === "join" ? "default" : "outline"}
                    onClick={() => setMode("join")}
                >
                    Join Squad
                </Button>
            </div>

            {mode === "create" ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Squad Name</label>
                  <Input
                    placeholder="e.g. Alpha Team"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <Button
                    className="w-full"
                    onClick={() => createMutation.mutate(name)}
                    disabled={createMutation.isPending || !name}
                >
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Initialize Squad
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                 <div className="space-y-2">
                  <label className="text-sm font-medium">Invite Code</label>
                  <Input
                    placeholder="ENTER CODE"
                    className="uppercase font-mono"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                  />
                </div>
                <Button
                    className="w-full"
                    onClick={() => joinMutation.mutate(code)}
                    disabled={joinMutation.isPending || code.length !== 6}
                >
                  {joinMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Link to Squad
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
