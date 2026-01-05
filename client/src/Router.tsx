import { Switch, Route, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

// Pages
import HomePage from "@/pages/home-page";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page";
import PathfinderPage from "@/pages/pathfinder-page";
import DebriefPage from "@/pages/debrief-page";

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
      {/*
          If user is logged in, / should probably redirect to /dashboard
          But for now let's keep HomePage as landing
      */}
      <Route path="/" component={(props: any) => {
          const { user } = useAuth();
          const [, setLocation] = useLocation();
          if (user) {
              setLocation("/dashboard");
              return null;
          }
          return <HomePage {...props} />;
      }} />

      {/* Protected Routes */}
      <ProtectedRoute path="/dashboard" component={DashboardPage} />
      <ProtectedRoute path="/pathfinder" component={PathfinderPage} />
      <ProtectedRoute path="/debrief" component={DebriefPage} />

      {/* Route /journey can point to Dashboard or a new map view, for now reuse Dashboard logic or similar */}
      <ProtectedRoute path="/journey" component={DashboardPage} />

      <Route component={NotFound} />
    </Switch>
  );
}
