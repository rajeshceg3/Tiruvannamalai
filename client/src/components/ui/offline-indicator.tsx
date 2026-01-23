import { useOnlineStatus } from "@/hooks/use-online-status";
import { useSocketStatus } from "@/lib/socket";
import { WifiOff, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  const socketStatus = useSocketStatus();

  if (!isOnline) {
    return (
      <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-md bg-destructive px-4 py-2 text-destructive-foreground shadow-lg animate-in slide-in-from-bottom-5" role="alert">
        <WifiOff className="h-4 w-4" />
        <span className="text-sm font-medium">You are currently offline</span>
      </div>
    );
  }

  if (socketStatus !== "connected") {
     return (
      <div className={cn(
        "fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-md px-4 py-2 shadow-lg animate-in slide-in-from-bottom-5 transition-colors",
        socketStatus === "connecting" ? "bg-yellow-500 text-white" : "bg-orange-500 text-white"
      )} role="status">
        {socketStatus === "connecting" ? (
           <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
           <AlertTriangle className="h-4 w-4" />
        )}
        <span className="text-sm font-medium">
            {socketStatus === "connecting" ? "Connecting to server..." : "Server connection lost"}
        </span>
      </div>
    );
  }

  return null;
}
