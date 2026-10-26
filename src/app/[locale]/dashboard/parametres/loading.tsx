import { Skeleton, SkeletonPageHeader } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="max-w-3xl">
      <SkeletonPageHeader />
      {[0, 1, 2].map((i) => (
        <div key={i} className="card mb-4 space-y-3 p-5">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3.5 w-3/4" />
          <Skeleton className="h-10 w-44 rounded-[10px]" />
        </div>
      ))}
    </div>
  );
}
