/**
 * RoadmapSkeleton Component
 * Loading placeholder with shimmer effect
 */

export function CardSkeleton() {
  return (
    <div className="rounded-lg border-2 border-gray-200 p-4 bg-white animate-pulse">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="h-5 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-12"></div>
        </div>

        {/* Metadata */}
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>

        {/* Description */}
        <div className="space-y-2">
          <div className="h-3 bg-gray-200 rounded w-full"></div>
          <div className="h-3 bg-gray-200 rounded w-5/6"></div>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-gray-200 rounded w-full"></div>

        {/* Indicators */}
        <div className="flex gap-2">
          <div className="h-6 bg-gray-200 rounded w-16"></div>
          <div className="h-6 bg-gray-200 rounded w-16"></div>
          <div className="h-6 bg-gray-200 rounded w-16"></div>
        </div>
      </div>
    </div>
  );
}

export function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function KanbanSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {['Planned', 'In Progress', 'Completed', 'Cancelled'].map((status) => (
        <div key={status} className="space-y-3">
          <div className="h-8 bg-gray-200 rounded animate-pulse w-32"></div>
          <div className="space-y-3">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </div>
      ))}
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col items-center justify-center px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 animate-pulse"
        >
          <div className="h-8 w-12 bg-gray-200 rounded"></div>
          <div className="h-3 w-16 bg-gray-200 rounded mt-1"></div>
        </div>
      ))}
    </div>
  );
}
