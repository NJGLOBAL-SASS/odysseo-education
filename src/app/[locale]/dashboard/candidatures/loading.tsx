import { Skeleton, SkeletonPageHeader, SkeletonTable } from "@/components/ui/skeleton";

export default function CandidatesLoading() {
  return (
    <div>
      <SkeletonPageHeader />
      <div className="mb-4 flex gap-2">
        <Skeleton className="h-[46px] flex-1 rounded-[10px]" />
        <Skeleton className="h-[46px] w-56 rounded-[10px]" />
      </div>
      <SkeletonTable />
    </div>
  );
}
