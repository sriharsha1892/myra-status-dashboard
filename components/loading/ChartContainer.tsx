'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { LoadingSubContext } from '@/lib/loading/types';
import { getLoadingMessage } from '@/lib/loading/loadingMessages';

interface ChartContainerProps {
  children: ReactNode;
  loading?: boolean;
  chartType?: LoadingSubContext;
  className?: string;
}

/**
 * Wrapper component for charts that handles loading state
 * Shows a unified loading message instead of individual chart spinners
 *
 * @example
 * ```tsx
 * <ChartContainer loading={!data} chartType="barChart">
 *   <BarChart data={data} />
 * </ChartContainer>
 * ```
 */
export function ChartContainer({
  children,
  loading = false,
  chartType = 'default',
  className = '',
}: ChartContainerProps) {
  if (loading) {
    const message = getLoadingMessage('chart', chartType);

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`flex items-center justify-center py-16 ${className}`}
      >
        <div className="flex flex-col items-center gap-3">
          {/* Smaller spinner for inline loading */}
          <div className="w-8 h-8 border-4 border-accent-500 border-t-transparent rounded-full animate-spin" />

          {/* Loading message */}
          <p className="text-sm text-gray-500 text-center max-w-md">
            {message}
          </p>
        </div>
      </motion.div>
    );
  }

  return <>{children}</>;
}
