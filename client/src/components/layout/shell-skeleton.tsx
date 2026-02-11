import { Skeleton } from "@/components/ui/skeleton";

export function ShellSkeleton() {
  return (
    <div className="flex h-screen bg-stone-50 overflow-hidden">
      {/* Sidebar Skeleton */}
      <div className="w-64 border-r border-stone-200 bg-white/50 hidden md:flex flex-col h-full">
        <div className="p-6">
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="flex-1 px-4 py-2 space-y-4">
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
        <div className="p-4 border-t border-stone-200">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Skeleton */}
      <main className="flex-1 overflow-auto">
        <div className="p-8 space-y-8 max-w-5xl mx-auto">
          {/* Header Area */}
          <div className="space-y-4">
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-48 w-full rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
