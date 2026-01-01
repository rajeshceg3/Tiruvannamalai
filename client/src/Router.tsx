import { Switch, Route, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

// Pages (I'll need to create Dashboard and update others)
import HomePage from "@/pages/home-page";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page";

function ProtectedRoute({ component: Component, ...rest }: any) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    setLocation("/auth");
    return null;
  }

  return <Component {...rest} />;
}

export default function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      {/* Protect the home page or make it public?
          Let's make Home public but with "Login" button,
          and Dashboard protected.
      */}
      <Route path="/" component={HomePage} />

      {/* New Protected Routes */}
      <ProtectedRoute path="/dashboard" component={DashboardPage} />

      <Route component={NotFound} />
    </Switch>
  );
}
