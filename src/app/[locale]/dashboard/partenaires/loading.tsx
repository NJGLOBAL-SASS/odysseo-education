import { SkeletonPageHeader, SkeletonTable } from "@/components/ui/skeleton";

export default function ListLoading() {
  return (
    <div>
      <SkeletonPageHeader />
      <SkeletonTable cols={5} />
    </div>
  );
}
