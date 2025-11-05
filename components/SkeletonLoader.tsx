export function SkeletonCard() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-4 bg-gray-200 rounded w-24"></div>
      </div>
      <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
      <div className="h-3 bg-gray-200 rounded w-32"></div>
    </div>
  );
}

export function SkeletonTable() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="divide-y divide-gray-100">
        {[...Array(5)].map((_, idx) => (
          <div key={idx} className="h-14 px-6 flex items-center gap-6 animate-pulse">
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
              <div className="h-3 bg-gray-100 rounded w-48"></div>
            </div>
            <div className="h-6 bg-gray-200 rounded-full w-20"></div>
            <div className="h-6 bg-gray-200 rounded w-16"></div>
            <div className="h-6 bg-gray-200 rounded-full w-24"></div>
            <div className="h-3 bg-gray-200 rounded w-16"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonHeader() {
  return (
    <div className="h-14 bg-white border-b border-gray-200 px-6 flex items-center justify-between animate-pulse">
      <div className="flex items-center gap-4">
        <div className="h-5 bg-gray-200 rounded w-32"></div>
        <div className="h-4 bg-gray-100 rounded w-16"></div>
      </div>
      <div className="flex items-center gap-3">
        <div className="h-9 bg-gray-200 rounded-lg w-80"></div>
        <div className="h-9 bg-gray-200 rounded-lg w-20"></div>
        <div className="h-9 bg-gray-200 rounded-lg w-32"></div>
      </div>
    </div>
  );
}
