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

export function SkeletonCard() {
  const [quote, setQuote] = useState(loadingQuotes[0]);

  useEffect(() => {
    const interval = setInterval(() => {
      setQuote(loadingQuotes[Math.floor(Math.random() * loadingQuotes.length)]);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative rounded-2xl overflow-hidden backdrop-blur-sm border border-gray-200/50 shadow-lg bg-white/80 p-6 min-h-[320px]">
      {/* Shimmer effect */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-blue-50/50 to-transparent" />

      {/* Icon placeholder */}
      <div className="flex items-start gap-3.5 mb-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-100 via-blue-50 to-gray-100 animate-pulse flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-blue-400/50 animate-pulse" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="h-6 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-pulse" style={{ width: '75%' }} />
          <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-pulse" style={{ width: '50%' }} />
        </div>
      </div>

      {/* Content placeholders */}
      <div className="space-y-3 mb-6">
        <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-pulse" />
        <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-pulse" style={{ width: '90%' }} />
        <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-pulse" style={{ width: '65%' }} />
      </div>

      {/* Stats placeholders */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="h-16 bg-gradient-to-r from-gray-100 via-blue-50 to-gray-100 rounded-lg animate-pulse" />
        <div className="h-16 bg-gradient-to-r from-gray-100 via-blue-50 to-gray-100 rounded-lg animate-pulse" />
      </div>

      {/* Button placeholder */}
      <div className="pt-4 border-t border-gray-200">
        <div className="h-10 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded-xl animate-pulse" />
      </div>

      {/* Loading quote at bottom */}
      <div className="absolute bottom-3 left-6 right-6">
        <p className="text-xs text-blue-600/70 italic animate-pulse transition-opacity duration-500">
          {quote}
        </p>
      </div>
    </div>
  );
}
