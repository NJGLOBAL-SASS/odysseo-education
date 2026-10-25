import { Skeleton, SkeletonPageHeader } from "@/components/ui/skeleton";

export default function TeamLoading() {
  return (
    <div className="max-w-4xl">
      <SkeletonPageHeader />
      <div className="card divide-y divide-bord">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1">
              <Skeleton className="mb-1.5 h-4 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
