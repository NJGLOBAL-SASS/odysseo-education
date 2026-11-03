import { Skeleton, SkeletonPageHeader } from "@/components/ui/skeleton";

export default function DataLoading() {
  return (
    <div>
      <SkeletonPageHeader />
      <div className="mb-6 flex gap-2">
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-8 w-28 rounded-full" />
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-36 rounded-brand" />
        ))}
      </div>
    </div>
  );
}
