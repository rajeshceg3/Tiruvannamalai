import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { telemetry } from "@/lib/logger";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  hasReported: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    hasReported: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, hasReported: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReport = () => {
    if (this.state.error) {
      telemetry.error("User Reported Error", {
        message: this.state.error.message,
        stack: this.state.error.stack,
        url: window.location.href,
      });
      this.setState({ hasReported: true });
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="max-w-md w-full border-destructive/50 shadow-lg">
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4 mx-auto">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <CardTitle className="text-xl text-center">System Malfunction</CardTitle>
              <CardDescription className="text-center">
                Critical error intercepted. Mission parameters compromised.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted p-3 rounded-md text-xs font-mono break-all text-muted-foreground border">
                {this.state.error?.message || "Unknown error"}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={this.handleReport}
                  className="flex-1"
                  disabled={this.state.hasReported}
                >
                  <Bug className="w-4 h-4 mr-2" />
                  {this.state.hasReported ? "Report Sent" : "Report Issue"}
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  className="flex-1"
                >
                  Reload Application
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
