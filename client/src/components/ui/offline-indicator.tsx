import { useOnlineStatus } from "@/hooks/use-online-status";
import { useSocketStatus } from "@/lib/socket";
import { offlineQueue } from "@/lib/offline-queue";
import { WifiOff, Loader2, AlertTriangle, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

function useOfflineQueueLength() {
  const [length, setLength] = useState(offlineQueue.length);

  useEffect(() => {
    return offlineQueue.subscribe(() => {
      setLength(offlineQueue.length);
    });
  }, []);

  return length;
}

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  const socketStatus = useSocketStatus();
  const queueLength = useOfflineQueueLength();

  if (!isOnline) {
    return (
      <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-1 rounded-md bg-destructive px-4 py-2 text-destructive-foreground shadow-lg animate-in slide-in-from-bottom-5" role="alert">
        <div className="flex items-center gap-2">
            <WifiOff className="h-4 w-4" />
            <span className="text-sm font-medium">You are currently offline</span>
        </div>
        {queueLength > 0 && (
            <div className="flex items-center gap-2 text-xs opacity-90">
                <UploadCloud className="h-3 w-3" />
                <span>{queueLength} pending upload{queueLength !== 1 ? 's' : ''}</span>
            </div>
        )}
      </div>
    );
  }

  if (socketStatus !== "connected") {
     return (
      <div className={cn(
        "fixed bottom-4 left-4 z-50 flex flex-col gap-1 rounded-md px-4 py-2 shadow-lg animate-in slide-in-from-bottom-5 transition-colors",
        socketStatus === "connecting" ? "bg-yellow-500 text-white" : "bg-orange-500 text-white"
      )} role="status">
        <div className="flex items-center gap-2">
            {socketStatus === "connecting" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
            <AlertTriangle className="h-4 w-4" />
            )}
            <span className="text-sm font-medium">
                {socketStatus === "connecting" ? "Connecting to server..." : "Server connection lost"}
            </span>
        </div>
        {queueLength > 0 && (
            <div className="flex items-center gap-2 text-xs opacity-90">
                <UploadCloud className="h-3 w-3" />
                <span>{queueLength} pending upload{queueLength !== 1 ? 's' : ''}</span>
            </div>
        )}
      </div>
    );
  }

  // Also show if connected but still flushing?
  // Maybe too noisy. The queue flushes fast.
  // But if it gets stuck, might be good.
  // For now, only show when offline/disconnected as per requirement.

  return null;
}
