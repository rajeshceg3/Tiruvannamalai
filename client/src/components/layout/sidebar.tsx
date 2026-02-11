import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Home, Compass, LogOut, BookOpen, Users } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { ConnectionStatus } from "@/components/ui/connection-status";

type SidebarProps = React.HTMLAttributes<HTMLDivElement>;

export function Sidebar({ className, ...props }: SidebarProps) {
  const [location] = useLocation();
  const { logoutMutation } = useAuth();

  const navItems = [
    { href: "/dashboard", icon: Home, label: "Dashboard" },
    { href: "/pathfinder", icon: Compass, label: "Pathfinder" },
    { href: "/group-command", icon: Users, label: "Yatra Command" },
    { href: "/debrief", icon: BookOpen, label: "Debrief" },
  ];

  return (
    <div className={cn("pb-12 w-64 border-r bg-sidebar text-sidebar-foreground", className)} {...props}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight flex items-center gap-2">
            Sacred Steps <span role="img" aria-label="Sacred Om Symbol">🕉️</span>
          </h2>
          <div className="space-y-1">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={location === item.href ? "secondary" : "ghost"}
                  className="w-full justify-start"
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-auto px-3 py-2">
         <ConnectionStatus className="mb-4" />
         <Button
           variant="ghost"
           className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-100"
           onClick={() => logoutMutation.mutate()}
         >
           <LogOut className="mr-2 h-4 w-4" />
           Logout
         </Button>
      </div>
    </div>
  );
}
