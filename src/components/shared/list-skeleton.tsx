import { Skeleton } from "@/components/ui/skeleton";

export function ListPageSkeleton({
  filters = 1,
  rows = 6,
}: {
  filters?: number;
  rows?: number;
}) {
  return (
    <div className="mx-auto w-full max-w-350 space-y-4 px-6 py-8 sm:px-8">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-9 w-28" />
      </div>
      {filters > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          {Array.from({ length: filters }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-full max-w-64" />
          ))}
        </div>
      )}
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    </div>
  );
}
