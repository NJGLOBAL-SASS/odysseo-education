import { Skeleton, SkeletonPageHeader } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div>
      <SkeletonPageHeader />
      <div className="lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-8 xl:grid-cols-[220px_minmax(0,1fr)] 2xl:grid-cols-[240px_minmax(0,1100px)]">
        <div className="hidden space-y-1.5 lg:block">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-10 w-full rounded-[10px]" />
          ))}
        </div>
        <div>
          {[0, 1, 2].map((i) => (
            <div key={i} className="card mb-4 space-y-3 p-5">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-10 w-44 rounded-[10px]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
