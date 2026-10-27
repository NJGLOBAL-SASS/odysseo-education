import { Skeleton, SkeletonPageHeader } from "@/components/ui/skeleton";

export default function TeamLoading() {
  return (
    <div>
      <SkeletonPageHeader />
      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card p-5">
            <Skeleton className="mb-4 h-9 w-9 rounded-[10px]" />
            <Skeleton className="mb-2 h-7 w-12" />
            <Skeleton className="h-3.5 w-28" />
          </div>
        ))}
      </div>
      <div className="mb-4 flex gap-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>
      <div className="card divide-y divide-bord">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-4">
            <Skeleton className="h-10 w-10 flex-shrink-0 rounded-full" />
            <div className="flex-1">
              <Skeleton className="mb-1.5 h-4 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
            <Skeleton className="hidden h-5 w-20 rounded-full lg:block" />
            <Skeleton className="hidden h-5 w-24 rounded-full lg:block" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
