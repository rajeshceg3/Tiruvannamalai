import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MissionFailedProps {
  onRetry: () => void;
  error?: Error | null;
  className?: string;
  title?: string;
}

export function MissionFailed({
  onRetry,
  error,
  className,
  title = "DATA RETRIEVAL FAILED"
}: MissionFailedProps) {
  return (
    <div className={cn("flex items-center justify-center min-h-[50vh] p-4", className)}>
      <Card className="max-w-md w-full border-destructive/50 bg-destructive/5 shadow-lg animate-in fade-in-0 zoom-in-95 duration-300">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit mb-2">
            <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden="true" />
          </div>
          <CardTitle className="text-xl font-bold tracking-tight text-destructive">
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-2">
          <p className="text-muted-foreground">
            Tactical data link could not be established.
          </p>
          {error && (
            <div className="bg-background/50 p-2 rounded text-xs font-mono text-destructive/80 mt-2 break-all border border-destructive/20">
              ERR: {error.message}
            </div>
          )}
        </CardContent>
        <CardFooter className="justify-center pt-2">
          <Button
            onClick={onRetry}
            variant="destructive"
            className="w-full sm:w-auto font-semibold gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            RE-ESTABLISH LINK
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
