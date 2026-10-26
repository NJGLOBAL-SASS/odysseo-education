import { Skeleton } from "@/components/ui/skeleton";

export default function CandidateDetailLoading() {
  return (
    <div>
      <Skeleton className="mb-4 h-4 w-32" />
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Skeleton className="mb-2 h-4 w-24" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-10 w-72 rounded-[10px]" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="grid gap-6 md:grid-cols-2 lg:col-span-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="card space-y-3 p-5">
              <Skeleton className="mb-2 h-4 w-28" />
              {[0, 1, 2, 3, 4].map((j) => (
                <div key={j} className="flex justify-between gap-4">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-3.5 w-32" />
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="card space-y-3 p-5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    </div>
  );
}
