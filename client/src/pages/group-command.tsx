import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { socketClient } from "@/lib/socket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, MapPin, Radio, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

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

  // Real-time location/status map
  const [memberLocations, setMemberLocations] = useState<Record<number, any>>({});
  const [memberStatus, setMemberStatus] = useState<Record<number, string>>({});

  useEffect(() => {
    if (group && user) {
      socketClient.joinGroup(user.id, group.id);

      const unsubLoc = socketClient.on("location_update", (data) => {
        setMemberLocations((prev) => ({ ...prev, [data.userId]: data.location }));
      });

      const unsubMem = socketClient.on("member_update", (data) => {
        setMemberStatus((prev) => ({ ...prev, [data.userId]: data.status }));
        // Refresh group data on join/leave potentially
        if (data.type === "member_update") {
             queryClient.invalidateQueries({ queryKey: ["/api/groups/current"] });
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
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Yatra Command</h1>
          <p className="text-muted-foreground mt-1">
            Tactical coordination for your pilgrimage squad.
          </p>
        </div>

        <Card className="w-full md:w-auto bg-muted/50 border-dashed">
          <CardContent className="p-4 flex items-center gap-4">
            <div>
              <div className="text-xs font-medium text-muted-foreground uppercase">Invite Code</div>
              <div className="text-2xl font-mono font-bold tracking-widest">{group.code}</div>
            </div>
            <Button size="icon" variant="ghost" onClick={copyCode}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Squad List */}
        <Card className="md:col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Squad Members ({group.members?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {group.members?.map((member) => {
                const isOnline = memberStatus[member.userId] === "online" || member.userId === user?.id; // Self is always online locally
                const location = memberLocations[member.userId];

                return (
                  <div key={member.id} className="flex items-start space-x-4 p-4 rounded-lg border bg-card text-card-foreground shadow-sm">
                    <Avatar>
                        {/* Placeholder initials */}
                      <AvatarFallback>{member.user.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium leading-none">{member.user.username}</p>
                        <Badge variant={isOnline ? "default" : "secondary"} className={isOnline ? "bg-green-500 hover:bg-green-600" : ""}>
                          {isOnline ? "Active" : "Offline"}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
                         <MapPin className="h-3 w-3" />
                         {location
                           ? `Last signal: ${new Date(location.timestamp).toLocaleTimeString()}`
                           : "No signal yet"}
                      </div>
                       {/* In a real map, we'd show distance/bearing here */}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
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
    onError: (e: any) => { // Use 'any' or specific error type if known from apiRequest
        // Extract message safely
        const message = e.message || "Failed to join group";
        toast({ title: "Connection Failed", description: message, variant: "destructive" });
    }
  });

  const [mode, setMode] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-4">
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
