import { useOnlineStatus } from "@/hooks/use-online-status";
import { WifiOff } from "lucide-react";

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-md bg-destructive px-4 py-2 text-destructive-foreground shadow-lg animate-in slide-in-from-bottom-5" role="alert">
      <WifiOff className="h-4 w-4" />
      <span className="text-sm font-medium">You are currently offline</span>
    </div>
  );
}
