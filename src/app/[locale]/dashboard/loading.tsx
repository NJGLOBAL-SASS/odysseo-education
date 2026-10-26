import { Skeleton, SkeletonPageHeader, SkeletonStatGrid } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <SkeletonPageHeader />
      <SkeletonStatGrid />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="card p-5 xl:col-span-2">
          <Skeleton className="mb-5 h-4 w-40" />
          <div className="flex h-[180px] items-end gap-1">
            {Array.from({ length: 30 }, (_, i) => (
              <Skeleton key={i} className="flex-1 rounded-b-none" />
            ))}
          </div>
        </div>
        <div className="card p-5">
          <Skeleton className="mb-5 h-4 w-28" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card space-y-4 p-5">
            <Skeleton className="h-4 w-24" />
            {[0, 1, 2, 3].map((j) => (
              <div key={j}>
                <Skeleton className="mb-1.5 h-3.5 w-2/3" />
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
