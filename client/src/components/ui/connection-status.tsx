import { useSocketStatus } from "@/lib/socket";
import { cn } from "@/lib/utils";

export function ConnectionStatus({ className }: { className?: string }) {
  const status = useSocketStatus();

  const config = {
    connected: { color: "bg-green-500", label: "Live System", pulse: false },
    connecting: { color: "bg-yellow-500", label: "Connecting...", pulse: true },
    disconnected: { color: "bg-red-500", label: "Offline", pulse: false },
  };

  const { color, label, pulse } = config[status];

  return (
    <div className={cn("flex items-center gap-2 text-xs font-medium px-4 py-2", className)} role="status" aria-live="polite">
      <span className={cn("h-2 w-2 rounded-full", color, pulse && "animate-pulse")} />
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}
