import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { socketClient } from "@/lib/socket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, MapPin, Radio, Copy, Check, AlertCircle, HeartPulse, Activity, Target, MessageSquare, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Sidebar } from "@/components/layout/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shrine } from "@shared/schema";

type GroupMember = {
  id: number;
  userId: number;
  user: {
    username: string;
  };
  joinedAt: string;
  lastStatus: string;
  lastLocation: any;
};

type Group = {
  id: number;
  name: string;
  code: string;
  creatorId: number;
  members: GroupMember[];
  activeObjective: string | null;
};

type SitRep = {
  id: number;
  content: string;
  type: string;
  createdAt: string;
  user: {
    username: string;
  };
};

export default function GroupCommand() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch current group
  const { data: group, isLoading } = useQuery<Group | null>({
    queryKey: ["/api/groups/current"],
  });

  const groupId = group?.id;

  // Fetch SitReps
  const { data: sitreps, isLoading: loadingSitreps } = useQuery<SitRep[]>({
    queryKey: [`/api/groups/${groupId}/sitreps`],
    enabled: !!groupId,
    refetchInterval: 5000, // Polling fallback
  });

  // Fetch Shrines for objective setting
  const { data: shrines } = useQuery<Shrine[]>({
    queryKey: ["/api/shrines"],
    enabled: !!groupId,
  });

  // Real-time states
  const [memberLocations, setMemberLocations] = useState<Record<number, any>>({});
  const [memberStatus, setMemberStatus] = useState<Record<number, string>>({});
  const [memberBeacons, setMemberBeacons] = useState<Record<number, string>>({}); // SOS, REGROUP, etc.
  const [personalStatus, setPersonalStatus] = useState<"ok" | "sos" | "regroup">("ok");

  // Initialize from persisted data
  useEffect(() => {
    if (group) {
        const initialStatus: Record<number, string> = {};
        const initialLocs: Record<number, any> = {};
        group.members.forEach(m => {
            initialStatus[m.userId] = m.lastStatus || "ok";
            if (m.lastLocation) initialLocs[m.userId] = m.lastLocation;
        });
        setMemberStatus(prev => ({...initialStatus, ...prev})); // Merge to keep live updates
        setMemberLocations(prev => ({...initialLocs, ...prev}));
    }
  }, [group]);

  useEffect(() => {
    if (group && user) {
      socketClient.joinGroup(user.id, group.id);

      const unsubLoc = socketClient.on("location_update", (data) => {
        setMemberLocations((prev) => ({ ...prev, [data.userId]: data.location }));
      });

      const unsubMem = socketClient.on("member_update", (data) => {
        // Optimistically update status
        setMemberStatus((prev) => ({ ...prev, [data.userId]: data.status }));
        // Invalidate to refresh persistent state
        queryClient.invalidateQueries({ queryKey: ["/api/groups/current"] });
      });

      const unsubBeacon = socketClient.on("beacon_signal", (data) => {
        setMemberBeacons((prev) => ({ ...prev, [data.userId]: data.signal }));
        // Also update status
        const status = data.signal === "SOS" ? "sos" : data.signal === "REGROUP" ? "regroup" : "ok";
        setMemberStatus((prev) => ({ ...prev, [data.userId]: status }));

        if (data.signal === "SOS") {
             const member = group.members.find(m => m.userId === data.userId);
             toast({
                 title: "EMERGENCY BEACON",
                 description: `${member?.user.username || "A member"} has signaled SOS!`,
                 variant: "destructive",
                 duration: 10000
             });
        }
      });

      const unsubSitRep = socketClient.on("new_sitrep", (data) => {
          // Add new sitrep to list
          queryClient.setQueryData<SitRep[]>([`/api/groups/${group.id}/sitreps`], (old) => {
              if (!old) return [data.sitrep];
              // Prevent duplicates if possible, though ID check handles it usually
              if (old.find(s => s.id === data.sitrep.id)) return old;
              return [data.sitrep, ...old];
          });
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
        unsubSitRep();
        clearInterval(interval);
      };
    }
  }, [group, user, queryClient]);

  const copyCode = () => {
    if (group?.code) {
      navigator.clipboard.writeText(group.code);
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

  const sitrepMutation = useMutation({
      mutationFn: async (content: string) => {
          if (!group) return;
          const res = await apiRequest("POST", `/api/groups/${group.id}/sitreps`, { content, type: "INFO" });
          return res.json();
      },
      onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}/sitreps`] });
      }
  });

  const objectiveMutation = useMutation({
      mutationFn: async (shrineId: string) => {
          if (!group) return;
          const res = await apiRequest("PATCH", `/api/groups/${group.id}/objective`, { shrineId });
          return res.json();
      },
      onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/groups/current"] });
          toast({ title: "Objective Updated", description: "All squad members notified." });
      }
  });

  const [sitrepInput, setSitrepInput] = useState("");

  const sendSitRep = (e: React.FormEvent) => {
      e.preventDefault();
      if (!sitrepInput.trim()) return;
      sitrepMutation.mutate(sitrepInput);
      setSitrepInput("");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!group) {
    return <NoGroupState />;
  }

  const activeShrine = shrines?.find(s => s.id === group.activeObjective);
  const isLeader = group.creatorId === user?.id;

  return (
    <div className="flex h-screen bg-background">
      <Sidebar className="hidden md:flex" />
      <main className="flex-1 overflow-auto p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-8">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Tactical Command Center</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-muted-foreground">{group.name}</Badge>
                        <span className="text-muted-foreground text-sm">Operation Active</span>
                    </div>
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

            {/* Tactical Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Column: Objectives & Beacons */}
                <div className="lg:col-span-2 space-y-8">

                    {/* Mission Objective */}
                    <Card className="border-l-4 border-l-primary">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Target className="h-5 w-5" />
                                Mission Objective
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col md:flex-row gap-6 items-center">
                                <div className="flex-1">
                                    {activeShrine ? (
                                        <div className="flex items-center gap-4">
                                            <div className="text-4xl">{activeShrine.emoji}</div>
                                            <div>
                                                <h3 className="text-xl font-bold">{activeShrine.name}</h3>
                                                <p className="text-sm text-muted-foreground">
                                                    Direction: {activeShrine.direction} • Element: {activeShrine.element}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-muted-foreground italic">No active objective set.</div>
                                    )}
                                </div>
                                {isLeader && shrines && (
                                    <div className="w-full md:w-64">
                                        <Select onValueChange={(val) => objectiveMutation.mutate(val)}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Set New Objective" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {shrines.map(s => (
                                                    <SelectItem key={s.id} value={s.id}>
                                                        {s.emoji} {s.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                     {/* Beacon Controls */}
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Button
                            size="lg"
                            variant={personalStatus === "sos" ? "destructive" : "outline"}
                            className="h-24 text-lg border-2 flex flex-col gap-2"
                            onClick={() => broadcastBeacon("SOS")}
                        >
                            <AlertCircle className="h-8 w-8" />
                            <span>SOS</span>
                        </Button>
                        <Button
                            size="lg"
                            variant={personalStatus === "regroup" ? "default" : "outline"}
                            className="h-24 text-lg border-2 flex flex-col gap-2"
                            onClick={() => broadcastBeacon("REGROUP")}
                        >
                            <Users className="h-8 w-8" />
                            <span>REGROUP</span>
                        </Button>
                        <Button
                            size="lg"
                            variant="outline"
                            className="h-24 text-lg border-2 flex flex-col gap-2"
                            onClick={() => broadcastBeacon("MOVING")}
                        >
                            <Activity className="h-8 w-8" />
                            <span>MOVING</span>
                        </Button>
                    </div>

                    {/* Squad Telemetry */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Radio className={`h-5 w-5 ${Object.keys(memberLocations).length > 0 ? 'text-green-500 animate-pulse' : ''}`} />
                                Live Telemetry
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                            {group.members?.map((member) => {
                                const status = memberStatus[member.userId] || "ok";
                                const location = memberLocations[member.userId];
                                const isSelf = member.userId === user?.id;

                                let statusColor = "bg-card";
                                if (status === "sos") statusColor = "bg-red-500/10 border-red-500";
                                if (status === "regroup") statusColor = "bg-blue-500/10 border-blue-500";

                                return (
                                <div key={member.id} className={`flex items-center justify-between p-4 rounded-lg border ${statusColor}`}>
                                    <div className="flex items-center space-x-4">
                                        <Avatar className="h-10 w-10 border-2 border-primary/20">
                                            <AvatarFallback>{member.user.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <div className="font-semibold flex items-center gap-2">
                                                {member.user.username}
                                                {isSelf && <Badge variant="outline" className="text-xs">YOU</Badge>}
                                            </div>
                                            <div className="flex items-center text-xs text-muted-foreground mt-1">
                                                {status !== "ok" && (
                                                    <Badge variant={status === "sos" ? "destructive" : "secondary"} className="mr-2 uppercase">
                                                        {status}
                                                    </Badge>
                                                )}
                                                {location && (
                                                    <span className="flex items-center">
                                                        <MapPin className="h-3 w-3 mr-1" />
                                                        Lat: {location.lat.toFixed(4)}, Lng: {location.lng.toFixed(4)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {status === "ok" && (
                                            <HeartPulse className="h-4 w-4 text-green-500/50" />
                                        )}
                                    </div>
                                </div>
                                );
                            })}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: SitRep Log */}
                <div className="lg:col-span-1 h-full">
                    <Card className="h-[calc(100vh-12rem)] flex flex-col">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <MessageSquare className="h-5 w-5" />
                                Mission Log
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col min-h-0">
                            <ScrollArea className="flex-1 pr-4 mb-4" ref={scrollRef}>
                                <div className="space-y-4">
                                    {sitreps?.length === 0 && (
                                        <div className="text-center text-sm text-muted-foreground py-8">
                                            No recent reports.
                                        </div>
                                    )}
                                    {/* Reverse order for display if we want newest at bottom, but typically logs are newest at top or bottom?
                                        Usually chat is bottom-up. Our query returns newest first. Let's reverse for display.
                                    */}
                                    {[...(sitreps || [])].reverse().map((sitrep) => (
                                        <div key={sitrep.id} className="flex flex-col gap-1">
                                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                <span className="font-bold text-foreground">{sitrep.user.username}</span>
                                                <span>{format(new Date(sitrep.createdAt), "HH:mm")}</span>
                                            </div>
                                            <div className={`p-2 rounded-md text-sm ${
                                                sitrep.type === "WARNING" ? "bg-red-500/20 text-red-700 dark:text-red-300" :
                                                sitrep.type === "SOS" ? "bg-red-600 text-white animate-pulse" :
                                                "bg-muted"
                                            }`}>
                                                {sitrep.content}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>

                            <form onSubmit={sendSitRep} className="flex gap-2 mt-auto">
                                <Input
                                    placeholder="Enter SitRep..."
                                    value={sitrepInput}
                                    onChange={e => setSitrepInput(e.target.value)}
                                />
                                <Button type="submit" size="icon" disabled={!sitrepInput.trim() || sitrepMutation.isPending}>
                                    <Send className="h-4 w-4" />
                                </Button>
                            </form>
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
