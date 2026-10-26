import { cn } from "@/lib/utils";

/** Bloc gris animé affiché à la place d'un contenu en cours de chargement. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden="true" />;
}

export function SkeletonStatGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card p-5">
          <Skeleton className="mb-4 h-9 w-9 rounded-[10px]" />
          <Skeleton className="mb-2 h-7 w-20" />
          <Skeleton className="h-4 w-32" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 8, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="card overflow-hidden">
      <div className="flex gap-4 border-b border-bord px-4 py-3.5">
        {Array.from({ length: cols }, (_, i) => (
          <Skeleton key={i} className="h-3.5 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex items-center gap-4 border-b border-bord px-4 py-4 last:border-0">
          {Array.from({ length: cols }, (_, c) => (
            <Skeleton key={c} className={cn("h-4 flex-1", c === 0 && "max-w-[90px]")} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonPageHeader() {
  return (
    <div className="mb-6 flex items-end justify-between gap-3">
      <div>
        <Skeleton className="mb-2 h-4 w-24" />
        <Skeleton className="h-8 w-56" />
      </div>
      <Skeleton className="h-10 w-40 rounded-brand" />
    </div>
  );
}
