import { Switch, Route, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Suspense, lazy, useEffect } from "react";
import { ShellSkeleton } from "@/components/layout/shell-skeleton";

// Lazy load pages
const AuthPage = lazy(() => import("@/pages/auth-page"));
const HomePage = lazy(() => import("@/pages/home-page"));
const DashboardPage = lazy(() => import("@/pages/dashboard-page"));
const PathfinderPage = lazy(() => import("@/pages/pathfinder-page"));
const GroupCommandPage = lazy(() => import("@/pages/group-command"));
const MissionDebriefPage = lazy(() => import("@/pages/mission-debrief"));
const NotFound = lazy(() => import("@/pages/not-found"));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ProtectedRoute({ component: Component, ...rest }: any) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/auth");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading || !user) {
    return <ShellSkeleton />;
  }

  return (
    <Suspense fallback={<ShellSkeleton />}>
      <Component {...rest} />
    </Suspense>
  );
}

export default function Router() {
  return (
    <Suspense fallback={<ShellSkeleton />}>
      <Switch>
        <Route path="/auth" component={AuthPage} />

        <Route path="/" component={() => {
            const { user, isLoading } = useAuth();
            const [, setLocation] = useLocation();

            useEffect(() => {
              if (!isLoading && user) {
                setLocation("/dashboard");
              }
            }, [user, isLoading, setLocation]);

            if (isLoading || user) return <ShellSkeleton />;

            return <HomePage />;
        }} />

        {/* Protected Routes */}
        <ProtectedRoute path="/dashboard" component={DashboardPage} />
        <ProtectedRoute path="/pathfinder" component={PathfinderPage} />
        <ProtectedRoute path="/group-command" component={GroupCommandPage} />
        <ProtectedRoute path="/debrief" component={MissionDebriefPage} />

        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}
