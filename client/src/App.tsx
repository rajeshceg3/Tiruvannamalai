import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import Router from "@/Router";
import { ErrorBoundary } from "@/components/error-boundary";
import { telemetry } from "@/lib/logger";
import { useEffect } from "react";

function App() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      telemetry.error("Uncaught Exception", {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      telemetry.error("Unhandled Rejection", {
        reason: String(event.reason)
      });
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Router />
          <Toaster />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
