import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { socketClient } from "@/lib/socket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Users, Radio, Copy, Check, AlertCircle, Activity, Send, Flag, Target, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { GroupMap, MapWaypoint } from "@/components/groups/group-map";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { MissionFailed } from "@/components/ui/mission-failed";

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
  lastWaypointId?: number;
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
  waypoints: MapWaypoint[];
};

export default function GroupCommand() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  // 1. Fetch Basic Group Info first to get ID
  const {
    data: currentGroup,
    isLoading: isGroupLoading,
    isError: isGroupError,
    error: groupError,
    refetch: refetchGroup
  } = useQuery<Group | null>({
    queryKey: ["/api/groups/current"],
  });

  // 2. Fetch Full Command Center Data
  const {
    data: commandData,
    isLoading,
    isError: isCommandError,
    error: commandError,
    refetch: refetchCommand
  } = useQuery<CommandCenterData>({
    queryKey: [`/api/groups/${currentGroup?.id}/command-center`],
    enabled: !!currentGroup?.id,
  });

  // Real-time states
  const [memberLocations, setMemberLocations] = useState<Record<number, { lat: number; lng: number }>>({});
  const [memberStatus, setMemberStatus] = useState<Record<number, string>>({});
  const [memberBeacons, setMemberBeacons] = useState<Record<number, string>>({});
  const [liveSitreps, setLiveSitreps] = useState<SitRep[]>([]);
  const [personalStatus, setPersonalStatus] = useState<"ok" | "sos" | "regroup">("ok");
  const [sitrepInput, setSitrepInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Waypoint State
  const [waypointMode, setWaypointMode] = useState<string | null>(null); // 'RALLY', 'HAZARD', 'OBJECTIVE'
  const [pendingWaypoint, setPendingWaypoint] = useState<{lat: number, lng: number} | null>(null);
  const [newWaypointName, setNewWaypointName] = useState("");

  // Initialize state from persistent data when loaded
  useEffect(() => {
    if (commandData) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const locs: Record<number, any> = {};
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

  const createWaypointMutation = useMutation({
      mutationFn: async (data: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
          const res = await apiRequest("POST", `/api/groups/${currentGroup!.id}/waypoints`, data);
          return res.json();
      },
      onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: [`/api/groups/${currentGroup!.id}/command-center`] });
          setPendingWaypoint(null);
          setWaypointMode(null);
          setNewWaypointName("");
          toast({ title: "Waypoint Established", description: "Tactical marker added to map." });
      },
      onError: () => {
          toast({ title: "Error", description: "Failed to create waypoint", variant: "destructive" });
      }
  });

  const handleMapClick = (lat: number, lng: number) => {
      if (waypointMode) {
          setPendingWaypoint({ lat, lng });
      }
  };

  const confirmWaypoint = () => {
      if (!pendingWaypoint || !waypointMode || !newWaypointName) return;
      createWaypointMutation.mutate({
          name: newWaypointName,
          latitude: pendingWaypoint.lat,
          longitude: pendingWaypoint.lng,
          type: waypointMode,
          radius: 50 // Default
      });
  };

  if (isGroupError || isCommandError) {
    return (
      <div className="flex h-screen bg-background items-center justify-center">
         <MissionFailed
           onRetry={() => { refetchGroup(); refetchCommand(); }}
           error={groupError || commandError}
         />
      </div>
    );
  }

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

  const { group, members, waypoints } = commandData;

  // Transform members for the map
  const mapMembers = members.map(m => ({
      userId: m.userId,
      username: m.user.username,
      location: memberLocations[m.userId] || m.lastLocation,
      status: memberBeacons[m.userId] || m.lastStatus || 'OK',
      isSelf: m.userId === user?.id
  }));

  const isCreator = group.creatorId === user?.id;

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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[800px] lg:h-[600px]">
                {/* Left Column: Map & Controls */}
                <div className="lg:col-span-2 flex flex-col gap-4 h-full">
                     {/* Beacon Controls */}
                    <div className="grid grid-cols-3 gap-2 flex-none">
                        <Button
                            size="lg"
                            variant={personalStatus === "sos" ? "destructive" : "outline"}
                            className="h-16 text-sm md:text-lg border-2 flex flex-col gap-1"
                            onClick={() => broadcastBeacon("SOS")}
                        >
                            <AlertCircle className="h-5 w-5" />
                            SOS
                        </Button>
                        <Button
                            size="lg"
                            variant={personalStatus === "regroup" ? "default" : "outline"}
                            className="h-16 text-sm md:text-lg border-2 flex flex-col gap-1"
                            onClick={() => broadcastBeacon("REGROUP")}
                        >
                            <Users className="h-5 w-5" />
                            REGROUP
                        </Button>
                        <Button
                            size="lg"
                            variant="outline"
                            className="h-16 text-sm md:text-lg border-2 flex flex-col gap-1"
                            onClick={() => broadcastBeacon("MOVING")}
                        >
                            <Activity className="h-5 w-5" />
                            MOVING
                        </Button>
                    </div>

                    {isCreator && (
                        <div className="flex gap-2 items-center overflow-x-auto pb-2">
                             <span className="text-xs font-bold text-muted-foreground uppercase whitespace-nowrap">Tactical:</span>
                             <Button
                                variant={waypointMode === "RALLY" ? "default" : "secondary"}
                                size="sm"
                                className="h-8"
                                onClick={() => setWaypointMode(waypointMode === "RALLY" ? null : "RALLY")}
                             >
                                <Flag className="w-3 h-3 mr-1" /> Rally
                             </Button>
                             <Button
                                variant={waypointMode === "OBJECTIVE" ? "default" : "secondary"}
                                size="sm"
                                className="h-8"
                                onClick={() => setWaypointMode(waypointMode === "OBJECTIVE" ? null : "OBJECTIVE")}
                             >
                                <Target className="w-3 h-3 mr-1" /> Objective
                             </Button>
                             <Button
                                variant={waypointMode === "HAZARD" ? "default" : "secondary"}
                                size="sm"
                                className="h-8"
                                onClick={() => setWaypointMode(waypointMode === "HAZARD" ? null : "HAZARD")}
                             >
                                <AlertTriangle className="w-3 h-3 mr-1" /> Hazard
                             </Button>
                             {waypointMode && (
                                 <span className="text-xs text-primary animate-pulse ml-2">Click Map to Place</span>
                             )}
                        </div>
                    )}

                    {/* LIVE MAP */}
                    <Card className="flex-1 min-h-0 border-2 relative">
                        <CardContent className="p-0 h-full relative">
                             <div className="absolute top-2 right-2 z-10 bg-background/80 backdrop-blur px-2 py-1 rounded text-xs font-mono border">
                                {Object.keys(memberLocations).length} SIGNAL(S) ACTIVE
                             </div>
                             <GroupMap
                                members={mapMembers}
                                waypoints={waypoints}
                                onMapClick={handleMapClick}
                             />
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: SitRep Feed & Squad List */}
                <div className="lg:col-span-1 flex flex-col gap-4 h-full">
                    {/* Squad Status */}
                    <Card className="flex-none">
                         <CardHeader className="py-3 px-4">
                            <CardTitle className="flex items-center gap-2 text-sm">
                            <Radio className={`h-4 w-4 ${Object.keys(memberLocations).length > 0 ? 'text-green-500 animate-pulse' : ''}`} />
                            Squad Status
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="py-2 px-4 max-h-[200px] overflow-y-auto">
                             <div className="space-y-2">
                            {members.map((member) => {
                                const isOnline = memberStatus[member.userId] === "online" || member.userId === user?.id;
                                const beacon = memberBeacons[member.userId];
                                return (
                                <div key={member.id} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className={`h-2 w-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-300'}`} />
                                        <span>{member.user.username}</span>
                                    </div>
                                    {beacon && (
                                        <Badge variant={beacon === "SOS" ? "destructive" : "outline"} className="text-[10px] h-5">
                                            {beacon}
                                        </Badge>
                                    )}
                                </div>
                                );
                            })}
                            </div>
                        </CardContent>
                    </Card>

                    {/* SitRep Feed */}
                    <Card className="flex-1 flex flex-col min-h-0">
                        <CardHeader className="py-3 px-4">
                            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Tactical Feed</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 min-h-0 flex flex-col p-3">
                            <ScrollArea className="flex-1 pr-4">
                                <div className="space-y-4" role="log" aria-live="polite" aria-relevant="additions">
                                    {liveSitreps.map((sitrep, i) => {
                                        const sender = members.find(m => m.userId === sitrep.userId);
                                        const isMe = sitrep.userId === user?.id;
                                        return (
                                            <div key={i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[10px] font-bold text-muted-foreground">
                                                        {sender?.user.username || "Unknown"}
                                                    </span>
                                                    <span className="text-[9px] text-muted-foreground/50">
                                                        {new Date(sitrep.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                    </span>
                                                </div>
                                                <div className={`rounded-lg px-3 py-2 max-w-[90%] text-xs ${
                                                    isMe
                                                    ? 'bg-primary text-primary-foreground'
                                                    : sitrep.type === 'alert'
                                                        ? 'bg-destructive/10 border border-destructive text-destructive'
                                                        : sitrep.type === 'status'
                                                          ? 'bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-400'
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

                            <form onSubmit={sendSitrep} className="mt-3 flex gap-2">
                                <Input
                                    value={sitrepInput}
                                    onChange={(e) => setSitrepInput(e.target.value)}
                                    placeholder="Message..."
                                    className="flex-1 h-8 text-xs"
                                />
                                <Button type="submit" size="icon" className="h-8 w-8">
                                    <Send className="h-3 w-3" />
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Waypoint Creation Dialog */}
            <Dialog open={!!pendingWaypoint} onOpenChange={(open) => !open && setPendingWaypoint(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Tactical Waypoint</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Waypoint Name</Label>
                            <Input
                                placeholder="e.g. Rally Point Alpha"
                                value={newWaypointName}
                                onChange={(e) => setNewWaypointName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                             <Label>Type</Label>
                             <div className="font-mono text-sm border p-2 rounded bg-muted uppercase">
                                {waypointMode}
                             </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                            Coordinates: {pendingWaypoint?.lat.toFixed(6)}, {pendingWaypoint?.lng.toFixed(6)}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPendingWaypoint(null)}>Cancel</Button>
                        <Button onClick={confirmWaypoint} disabled={createWaypointMutation.isPending || !newWaypointName}>
                            {createWaypointMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Establish Waypoint
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
