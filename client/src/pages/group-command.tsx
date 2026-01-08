import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { socketClient } from "@/lib/socket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, MapPin, Radio, Copy, Check, AlertCircle, HeartPulse, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar } from "@/components/layout/sidebar";

type GroupMember = {
  id: number;
  userId: number;
  user: {
    username: string;
  };
  joinedAt: string;
};

type Group = {
  id: number;
  name: string;
  code: string;
  creatorId: number;
  members: GroupMember[];
};

export default function GroupCommand() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  // Fetch current group
  const { data: group, isLoading } = useQuery<Group | null>({
    queryKey: ["/api/groups/current"],
  });

  // Real-time states
  const [memberLocations, setMemberLocations] = useState<Record<number, any>>({});
  const [memberStatus, setMemberStatus] = useState<Record<number, string>>({});
  const [memberBeacons, setMemberBeacons] = useState<Record<number, string>>({}); // SOS, REGROUP, etc.
  const [personalStatus, setPersonalStatus] = useState<"ok" | "sos" | "regroup">("ok");

  useEffect(() => {
    if (group && user) {
      socketClient.joinGroup(user.id, group.id);

      const unsubLoc = socketClient.on("location_update", (data) => {
        setMemberLocations((prev) => ({ ...prev, [data.userId]: data.location }));
      });

      const unsubMem = socketClient.on("member_update", (data) => {
        setMemberStatus((prev) => ({ ...prev, [data.userId]: data.status }));
        if (data.type === "member_update") {
             queryClient.invalidateQueries({ queryKey: ["/api/groups/current"] });
        }
      });

      const unsubBeacon = socketClient.on("beacon_signal", (data) => {
        setMemberBeacons((prev) => ({ ...prev, [data.userId]: data.signal }));

        // Alert logic if SOS
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
      // Send via socket
      // We need to implement this method in socketClient first, or use raw send if possible.
      // But assuming we can:
      socketClient.sendBeacon(signal);
      setPersonalStatus(signal === "SOS" ? "sos" : signal === "REGROUP" ? "regroup" : "ok");

      toast({
          title: `Beacon Broadcast: ${signal}`,
          description: "Squad has been alerted.",
          variant: signal === "SOS" ? "destructive" : "default"
      });
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

  return (
    <div className="flex h-screen bg-background">
      <Sidebar className="hidden md:flex" />
      <main className="flex-1 overflow-auto p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-8">
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
                            <Button size="icon" variant="ghost" onClick={copyCode}>
                            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Beacon Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                    size="lg"
                    variant={personalStatus === "sos" ? "destructive" : "outline"}
                    className="h-24 text-lg border-2"
                    onClick={() => broadcastBeacon("SOS")}
                >
                    <AlertCircle className="mr-2 h-6 w-6" />
                    SOS / EMERGENCY
                </Button>
                <Button
                    size="lg"
                    variant={personalStatus === "regroup" ? "default" : "outline"}
                    className="h-24 text-lg border-2"
                    onClick={() => broadcastBeacon("REGROUP")}
                >
                    <Users className="mr-2 h-6 w-6" />
                    REQUEST REGROUP
                </Button>
                <Button
                    size="lg"
                    variant="outline"
                    className="h-24 text-lg border-2"
                    onClick={() => broadcastBeacon("MOVING")}
                >
                    <Activity className="mr-2 h-6 w-6" />
                    MOVING / ACTIVE
                </Button>
            </div>

            {/* Squad List */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                    <Radio className={`h-5 w-5 ${Object.keys(memberLocations).length > 0 ? 'text-green-500 animate-pulse' : ''}`} />
                    Live Telemetry
                    </CardTitle>
                    <CardDescription>
                        Real-time status of all {group.members.length} operators.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                    {group.members?.map((member) => {
                        const isOnline = memberStatus[member.userId] === "online" || member.userId === user?.id;
                        const location = memberLocations[member.userId];
                        const beacon = memberBeacons[member.userId];
                        const isSelf = member.userId === user?.id;

                        return (
                        <div key={member.id} className={`flex items-center justify-between p-4 rounded-lg border ${beacon === "SOS" ? 'bg-red-500/10 border-red-500' : 'bg-card'}`}>
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
                                        <Badge variant={isOnline ? "secondary" : "outline"} className={`mr-2 ${isOnline ? 'text-green-600 bg-green-50' : ''}`}>
                                            {isOnline ? "ONLINE" : "OFFLINE"}
                                        </Badge>
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
                                {beacon && (
                                    <Badge variant={beacon === "SOS" ? "destructive" : "secondary"} className="animate-pulse">
                                        {beacon}
                                    </Badge>
                                )}
                                {!beacon && isOnline && (
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
