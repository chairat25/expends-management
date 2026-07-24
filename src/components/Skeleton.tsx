import clsx from "clsx";

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("skeleton", className)} />;
}

export function AdminSkeletonLoading() {
  return (
    <div className="space-y-4 pop-in">
      {/* Top Banner Skeleton */}
      <div className="card p-4 space-y-2">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-3 w-80" />
      </div>

      {/* Tabs Skeleton */}
      <div className="flex rounded-xl bg-surface-2 p-1 gap-2">
        <Skeleton className="h-9 flex-1 rounded-lg" />
        <Skeleton className="h-9 flex-1 rounded-lg" />
        <Skeleton className="h-9 flex-1 rounded-lg" />
      </div>

      {/* Main Content Area Skeleton */}
      <div className="card space-y-4 p-5">
        <div className="flex items-center justify-between border-b border-border/80 pb-3">
          <div className="flex items-center gap-2">
            <Skeleton className="size-6 rounded-full" />
            <Skeleton className="h-5 w-40" />
          </div>
          <Skeleton className="h-7 w-24 rounded-full" />
        </div>

        {/* Cards Grid Skeleton */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-2xl border border-border p-4 bg-surface-2/40"
            >
              <Skeleton className="size-10 rounded-2xl shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>

        {/* Detailed Item List Skeleton */}
        <div className="space-y-2 pt-3">
          <Skeleton className="h-4 w-36" />
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-xl border border-border p-3"
              >
                <div className="flex items-center gap-2">
                  <Skeleton className="size-5 rounded-md" />
                  <Skeleton className="h-4 w-28" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
