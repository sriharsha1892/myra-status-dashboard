/**
 * Skeleton Loading Components
 *
 * Consolidated, accessible skeleton loaders for various UI patterns.
 * Features:
 * - WCAG AA compliant colors
 * - ARIA live regions for screen readers
 * - Smooth animations
 * - Consistent styling
 */

import { Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';

const loadingQuotes = [
  "Building momentum...",
  "Shipping fast...",
  "Scaling up...",
  "0 to 1 in progress...",
  "Growth mode activated...",
  "Execution in motion...",
];

/**
 * Base Skeleton Component
 * Simple animated placeholder bar
 */
export function Skeleton({ className = '', ariaLabel }: { className?: string; ariaLabel?: string }) {
  return (
    <div
      className={`animate-pulse bg-neutral-200 rounded ${className}`}
      role="status"
      aria-label={ariaLabel || "Loading"}
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

/**
 * Enhanced Skeleton Card with Shimmer Effect
 * For dashboard cards and summary views
 */
export function SkeletonCard() {
  const [quote, setQuote] = useState(loadingQuotes[0]);

  useEffect(() => {
    const interval = setInterval(() => {
      setQuote(loadingQuotes[Math.floor(Math.random() * loadingQuotes.length)]);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="relative rounded-2xl overflow-hidden backdrop-blur-sm border border-neutral-200 shadow-lg bg-white/80 p-6 min-h-[320px]"
      role="status"
      aria-live="polite"
      aria-label="Loading card content"
    >
      {/* Shimmer effect */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-blue-50/50 to-transparent" />

      {/* Icon placeholder */}
      <div className="flex items-start gap-3.5 mb-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neutral-100 via-blue-50 to-neutral-100 animate-pulse flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-blue-400/50 animate-pulse" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="h-6 bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 rounded animate-pulse" style={{ width: '75%' }} />
          <div className="h-4 bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 rounded animate-pulse" style={{ width: '50%' }} />
        </div>
      </div>

      {/* Content placeholders */}
      <div className="space-y-3 mb-6">
        <div className="h-4 bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 rounded animate-pulse" />
        <div className="h-4 bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 rounded animate-pulse" style={{ width: '90%' }} />
        <div className="h-4 bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 rounded animate-pulse" style={{ width: '65%' }} />
      </div>

      {/* Stats placeholders */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="h-16 bg-gradient-to-r from-neutral-100 via-blue-50 to-neutral-100 rounded-lg animate-pulse" />
        <div className="h-16 bg-gradient-to-r from-neutral-100 via-blue-50 to-neutral-100 rounded-lg animate-pulse" />
      </div>

      {/* Button placeholder */}
      <div className="pt-4 border-t border-neutral-200">
        <div className="h-10 bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 rounded-xl animate-pulse" />
      </div>

      {/* Loading quote */}
      <div className="absolute bottom-3 left-6 right-6">
        <p className="text-xs text-blue-600/70 italic animate-pulse transition-opacity duration-500">
          {quote}
        </p>
      </div>
    </div>
  );
}

/**
 * Simple Skeleton Card
 * Lightweight version without shimmer
 */
export function SkeletonCardSimple() {
  return (
    <div
      className="bg-white border border-neutral-200 rounded-lg p-5"
      role="status"
      aria-label="Loading card"
    >
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="h-8 w-16 mb-2" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

/**
 * Skeleton Table
 * For data tables with customizable rows
 */
export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div
      className="bg-white border border-neutral-200 rounded-lg overflow-hidden"
      role="status"
      aria-live="polite"
      aria-label={`Loading table with ${rows} rows`}
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-100">
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
              <tr key={i} className="border-t border-neutral-100">
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
    </div>
  );
}

/**
 * Skeleton Header
 * For page headers with search and actions
 */
export function SkeletonHeader() {
  return (
    <div
      className="h-14 bg-white border-b border-neutral-200 px-6 flex items-center justify-between"
      role="status"
      aria-label="Loading header"
    >
      <div className="flex items-center gap-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-80 rounded-lg" />
        <Skeleton className="h-9 w-20 rounded-lg" />
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
    </div>
  );
}

/**
 * Skeleton Form
 * For loading form pages
 */
export function SkeletonForm({ fields = 6 }: { fields?: number }) {
  return (
    <div
      className="bg-white rounded-xl p-6 shadow-sm space-y-6"
      role="status"
      aria-live="polite"
      aria-label={`Loading form with ${fields} fields`}
    >
      {/* Form header */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Form fields */}
      <div className="space-y-5">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full rounded-lg" />
            {i % 3 === 0 && <Skeleton className="h-3 w-64" />}
          </div>
        ))}
      </div>

      {/* Form actions */}
      <div className="flex items-center gap-3 pt-4 border-t border-neutral-200">
        <Skeleton className="h-10 w-24 rounded-lg" />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
    </div>
  );
}

/**
 * Skeleton Detail Page
 * For entity detail pages with sections
 */
export function SkeletonDetail() {
  return (
    <div
      className="space-y-6"
      role="status"
      aria-live="polite"
      aria-label="Loading detail page"
    >
      {/* Header section */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-24 rounded-lg" />
            <Skeleton className="h-9 w-24 rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-neutral-200">
          <div className="space-y-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-24" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-32" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
        </div>
      </div>

      {/* Content sections */}
      <div className="bg-white rounded-xl p-6 shadow-sm space-y-4">
        <Skeleton className="h-6 w-32" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm space-y-4">
        <Skeleton className="h-6 w-40" />
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-36" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-28" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton Modal
 * For loading modal/dialog content
 */
export function SkeletonModal() {
  return (
    <div
      className="space-y-6 p-6"
      role="status"
      aria-live="polite"
      aria-label="Loading modal content"
    >
      {/* Modal header */}
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Modal content */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </div>

      {/* Modal actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
        <Skeleton className="h-10 w-20 rounded-lg" />
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>
    </div>
  );
}

/**
 * Skeleton List
 * For simple list views
 */
export function SkeletonList({ items = 5 }: { items?: number }) {
  return (
    <div
      className="bg-white rounded-xl shadow-sm divide-y divide-neutral-100"
      role="status"
      aria-live="polite"
      aria-label={`Loading list with ${items} items`}
    >
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="p-4 flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-64" />
          </div>
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton Stats Grid
 * For dashboard stats/metrics
 */
export function SkeletonStats({ columns = 4 }: { columns?: number }) {
  return (
    <div
      className={`grid grid-cols-${columns} gap-4`}
      role="status"
      aria-label="Loading statistics"
    >
      {Array.from({ length: columns }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-5 rounded" />
          </div>
          <Skeleton className="h-8 w-20 mb-1" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton Trial Card
 * Matches the TrialCard component layout for smooth loading transitions
 */
export function SkeletonTrialCard() {
  return (
    <div
      className="relative rounded-2xl overflow-hidden backdrop-blur-sm border border-gray-200/50 shadow-lg bg-gradient-to-br from-gray-50/80 via-white to-gray-50/80 min-h-[320px] flex flex-col"
      role="status"
      aria-label="Loading trial card"
    >
      {/* Shimmer effect */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/50 to-transparent" />

      {/* Selection Checkbox placeholder */}
      <div className="absolute top-4 right-4">
        <Skeleton className="h-4 w-4 rounded" />
      </div>

      {/* Card Body */}
      <div className="p-6 space-y-4 flex-1">
        {/* Header: Avatar + Name + Domain */}
        <div className="flex items-start gap-3.5">
          <Skeleton className="w-12 h-12 rounded-xl flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-3/4" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-10 rounded-full" />
            </div>
          </div>
        </div>

        {/* Status Row */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-4 w-20" />
        </div>

        {/* Days Left */}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
          <Skeleton className="h-2 w-2 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>

        {/* Progress Bar */}
        <div className="pt-3">
          <Skeleton className="h-2 w-full rounded-full" />
          <div className="flex justify-between mt-1">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>

        {/* Account Manager */}
        <div className="flex items-center gap-2.5 pt-3 border-t border-gray-100">
          <Skeleton className="w-6 h-6 rounded-full flex-shrink-0" />
          <div className="space-y-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-2 w-20" />
          </div>
        </div>
      </div>

      {/* Card Footer */}
      <div className="px-6 pb-5 pt-3 bg-white/50 border-t border-gray-100/60">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="flex-1 h-9 rounded-lg" />
          <Skeleton className="w-24 h-9 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

/**
 * Grid of skeleton trial cards
 */
export function SkeletonTrialGrid({ count = 6 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      role="status"
      aria-live="polite"
      aria-label={`Loading ${count} trial cards`}
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonTrialCard key={i} />
      ))}
    </div>
  );
}

/**
 * Inline Spinner
 * Small spinner for inline loading states
 */
export function Spinner({ size = 'sm', className = '' }: { size?: 'xs' | 'sm' | 'md' | 'lg'; className?: string }) {
  const sizeClasses = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <svg
      className={`animate-spin ${sizeClasses[size]} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      role="status"
      aria-label="Loading"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

/**
 * Loading Button
 * Button with built-in loading state
 */
export function LoadingButton({
  loading,
  disabled,
  children,
  loadingText,
  className = '',
  ...props
}: {
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  loadingText?: string;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      disabled={loading || disabled}
      className={`relative inline-flex items-center justify-center gap-2 transition-all ${
        loading ? 'cursor-wait' : ''
      } ${className}`}
      {...props}
    >
      {loading && <Spinner size="sm" className="absolute left-1/2 -translate-x-1/2" />}
      <span className={loading ? 'opacity-0' : ''}>{children}</span>
      {loading && loadingText && (
        <span className="absolute inset-0 flex items-center justify-center text-sm">
          {loadingText}
        </span>
      )}
    </button>
  );
}

/**
 * Loading Overlay
 * Full-area loading overlay for sections
 */
export function LoadingOverlay({ message = 'Loading...' }: { message?: string }) {
  return (
    <div
      className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" className="text-blue-600" />
        <p className="text-sm font-medium text-gray-600">{message}</p>
      </div>
    </div>
  );
}

/**
 * Pulse Dot
 * Animated dot for indicating live/active states
 */
export function PulseDot({ color = 'blue' }: { color?: 'blue' | 'green' | 'red' | 'yellow' }) {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
  };

  return (
    <span className="relative flex h-2 w-2">
      <span
        className={`animate-ping absolute inline-flex h-full w-full rounded-full ${colorClasses[color]} opacity-75`}
      />
      <span className={`relative inline-flex rounded-full h-2 w-2 ${colorClasses[color]}`} />
    </span>
  );
}
