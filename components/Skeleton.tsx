/**
 * Skeleton Loading Components
 * Provides loading placeholders for cards and tables
 */

export function SkeletonCard() {
  return (
    <div className="p-5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md animate-pulse">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="h-5 w-30 bg-white/10 rounded mb-2"></div>
          <div className="h-3.5 w-24 bg-white/8 rounded"></div>
        </div>
        <div className="h-6 w-20 bg-white/10 rounded-full"></div>
      </div>

      {/* Metrics */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="flex justify-between items-center">
          <div className="h-3 w-20 bg-white/8 rounded"></div>
          <div className="h-4 w-12 bg-white/10 rounded"></div>
        </div>
      </div>

      <div className="mt-3">
        <div className="flex justify-between items-center">
          <div className="h-3 w-24 bg-white/8 rounded"></div>
          <div className="h-4 w-8 bg-white/10 rounded"></div>
        </div>
      </div>
    </div>
  );
}

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
}

export function SkeletonTable({ rows = 5, columns = 6 }: SkeletonTableProps) {
  return (
    <div className="animate-pulse">
      {/* Table Header */}
      <div className="flex gap-4 p-4 bg-slate-100 border-b border-slate-200">
        {Array.from({ length: columns }).map((_, i) => (
          <div
            key={`header-${i}`}
            className="h-4 bg-slate-300 rounded"
            style={{ width: i === 0 ? '25%' : '15%' }}
          ></div>
        ))}
      </div>

      {/* Table Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="flex gap-4 p-4 border-b border-slate-100">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div
              key={`col-${colIndex}`}
              className="h-4 bg-slate-200 rounded"
              style={{
                width: colIndex === 0 ? '25%' : '15%',
                opacity: 0.5 + Math.random() * 0.5
              }}
            ></div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonText({ width = '100%', height = '1rem' }: { width?: string; height?: string }) {
  return (
    <div
      className="bg-slate-200 rounded animate-pulse"
      style={{ width, height }}
    ></div>
  );
}

export function SkeletonButton() {
  return (
    <div className="h-10 w-24 bg-slate-200 rounded-lg animate-pulse"></div>
  );
}

export function SkeletonAvatar({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeMap = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12'
  };

  return (
    <div className={`${sizeMap[size]} bg-slate-200 rounded-full animate-pulse`}></div>
  );
}
