export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-neutral-200 rounded ${className}`} />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <Skeleton className="w-5 h-5" />
      </div>
      <div>
        <Skeleton className="h-10 w-20 mb-2" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="h-12 px-6 text-left">
              <Skeleton className="h-3 w-20" />
            </th>
            <th className="h-12 px-6 text-left">
              <Skeleton className="h-3 w-24" />
            </th>
            <th className="h-12 px-6 text-left">
              <Skeleton className="h-3 w-16" />
            </th>
            <th className="h-12 px-6 text-left">
              <Skeleton className="h-3 w-16" />
            </th>
            <th className="h-12 px-6 text-left">
              <Skeleton className="h-3 w-20" />
            </th>
            <th className="h-12 px-6 text-left">
              <Skeleton className="h-3 w-16" />
            </th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i} className="border-t border-slate-100">
              <td className="py-4 px-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-3 w-48" />
              </td>
              <td className="py-4 px-6">
                <Skeleton className="h-4 w-32" />
              </td>
              <td className="py-4 px-6">
                <Skeleton className="h-6 w-20 rounded-full" />
              </td>
              <td className="py-4 px-6">
                <Skeleton className="h-6 w-20 rounded-full" />
              </td>
              <td className="py-4 px-6">
                <Skeleton className="h-6 w-24 rounded-full" />
              </td>
              <td className="py-4 px-6">
                <Skeleton className="h-4 w-16" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
