import { Switch, Route, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Suspense, lazy } from "react";
import { ShellSkeleton } from "@/components/layout/shell-skeleton";

// Lazy load pages
const AuthPage = lazy(() => import("@/pages/auth-page"));
const HomePage = lazy(() => import("@/pages/home-page"));
const DashboardPage = lazy(() => import("@/pages/dashboard-page"));
const PathfinderPage = lazy(() => import("@/pages/pathfinder-page"));
const GroupCommandPage = lazy(() => import("@/pages/group-command"));
const MissionDebriefPage = lazy(() => import("@/pages/mission-debrief"));
const NotFound = lazy(() => import("@/pages/not-found"));

function ProtectedRoute({ component: Component, ...rest }: any) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return <ShellSkeleton />;
  }

  if (!user) {
    setLocation("/auth");
    return null;
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

        <Route path="/" component={(props: any) => {
            const { user, isLoading } = useAuth();
            const [, setLocation] = useLocation();

            if (isLoading) return <ShellSkeleton />;

            if (user) {
                setLocation("/dashboard");
                return null;
            }
            return <HomePage {...props} />;
        }} />

        {/* Protected Routes */}
        <ProtectedRoute path="/dashboard" component={DashboardPage} />
        <ProtectedRoute path="/pathfinder" component={PathfinderPage} />
        <ProtectedRoute path="/group-command" component={GroupCommandPage} />
        <ProtectedRoute path="/journey" component={DashboardPage} />
        <ProtectedRoute path="/debrief" component={MissionDebriefPage} />

        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}
