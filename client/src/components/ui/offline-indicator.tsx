import { useOnlineStatus } from "@/hooks/use-online-status";
import { useSocketStatus } from "@/lib/socket";
import { offlineQueue, type QueueItem } from "@/lib/offline-queue";
import { WifiOff, Loader2, AlertTriangle, UploadCloud, Trash2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { syncManager } from "@/lib/sync-manager";
import { useToast } from "@/hooks/use-toast";

function useOfflineQueue() {
  const [items, setItems] = useState<QueueItem[]>(offlineQueue.getItems());

  useEffect(() => {
    // Initial fetch
    setItems(offlineQueue.getItems());

    return offlineQueue.subscribe(() => {
      setItems(offlineQueue.getItems());
    });
  }, []);

  return items;
}

function getReadableType(type: string): string {
  switch (type) {
    case 'visit': return 'Shrine Check-in';
    case 'location_update': return 'Location Trace';
    case 'beacon_signal': return 'Beacon Signal';
    case 'sitrep': return 'SITREP';
    default: return type.replace('_', ' ');
  }
}

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  const socketStatus = useSocketStatus();
  const queueItems = useOfflineQueue();
  const queueLength = queueItems.length;
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const prevStatus = useRef(socketStatus);

  useEffect(() => {
    if (prevStatus.current !== "connected" && socketStatus === "connected") {
      toast({
        title: "Connection Restored",
        description: "Syncing data with command...",
        duration: 3000,
      });
    }
    prevStatus.current = socketStatus;
  }, [socketStatus, toast]);

  // If everything is normal and nothing is pending, hide completely
  if (isOnline && socketStatus === "connected" && queueLength === 0) {
    return null;
  }

  const handleSync = async () => {
    setIsSyncing(true);
    toast({ title: "Sync Initiated", description: "Force syncing pending data to command." });
    try {
      // Force sync attempt even if browser reports offline
      await syncManager.processQueue(true);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClear = () => {
    if (confirm("Purge all pending data? This cannot be undone.")) {
      offlineQueue.clear();
      toast({ title: "Queue Purged", description: "All pending operations have been discarded.", variant: "destructive" });
    }
  };

  let icon = <WifiOff className="h-4 w-4" />;
  let title = "You are currently offline";
  let variantClass = "bg-destructive text-destructive-foreground";

  if (isOnline) {
    if (socketStatus === "connecting") {
      icon = <Loader2 className="h-4 w-4 animate-spin" />;
      title = "Connecting to command...";
      variantClass = "bg-yellow-500 text-white";
    } else if (socketStatus === "disconnected") {
      icon = <AlertTriangle className="h-4 w-4" />;
      title = "Connection lost";
      variantClass = "bg-orange-500 text-white";
    } else if (socketStatus === "connected") {
      // Must have items pending if we are here
      icon = <UploadCloud className="h-4 w-4 animate-pulse" />;
      title = `Syncing data (${queueLength} remaining)...`;
      variantClass = "bg-primary text-primary-foreground";
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div
          className={cn(
            "fixed bottom-4 left-4 z-50 flex cursor-pointer flex-col gap-1 rounded-md px-4 py-2 shadow-lg animate-in slide-in-from-bottom-5 transition-colors hover:opacity-90",
            variantClass
          )}
          role="alert"
        >
          <div className="flex items-center gap-2">
              {icon}
              <span className="text-sm font-medium">{title}</span>
          </div>
          {queueLength > 0 && (
              <div className="flex items-center gap-2 text-xs opacity-90">
                  <UploadCloud className="h-3 w-3" />
                  <span>{queueLength} pending upload{queueLength !== 1 ? 's' : ''}</span>
              </div>
          )}
        </div>
      </PopoverTrigger>
      {queueLength > 0 && (
        <PopoverContent className="w-80 p-0" side="top" align="start">
          <div className="border-b px-4 py-2 font-medium bg-muted/50">
            Pending Operations
          </div>
          <div className="max-h-[300px] overflow-auto p-2 space-y-2">
            {queueItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-md border p-2 text-sm bg-background">
                 <div className="grid gap-1">
                    <span className="font-medium">{getReadableType(item.type)}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(item.createdAt, "HH:mm:ss")}
                    </span>
                 </div>
                 <div className="flex items-center gap-2">
                   <div className="h-2 w-2 rounded-full bg-yellow-500" title="Pending" />
                   <Button
                     variant="ghost"
                     size="icon"
                     className="h-6 w-6 text-muted-foreground hover:text-destructive"
                     onClick={() => offlineQueue.remove(item.id)}
                     aria-label={`Delete ${getReadableType(item.type)}`}
                   >
                     <Trash2 className="h-3 w-3" />
                   </Button>
                 </div>
              </div>
            ))}
          </div>
          <div className="p-2 border-t bg-muted/20 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-2"
              onClick={handleSync}
              disabled={isSyncing}
              aria-label="Force synchronization now"
            >
              <RefreshCw className={cn("h-3 w-3", isSyncing && "animate-spin")} />
              Sync Now
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="px-3"
              onClick={handleClear}
              aria-label="Clear all pending items"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </PopoverContent>
      )}
    </Popover>
  );
}
