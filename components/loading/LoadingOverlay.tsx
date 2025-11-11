'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useLoadingContext } from '@/lib/loading';

interface LoadingOverlayProps {
  /**
   * Optional custom message to display
   * If not provided, uses the message from LoadingContext
   */
  message?: string;

  /**
   * Optional className for customization
   */
  className?: string;
}

/**
 * Full-screen loading overlay with animated spinner and rotating messages
 * Used for page-level loading states (navigation, initial data fetch, etc.)
 *
 * @example
 * ```tsx
 * const { isLoading, message } = useLoading('page', 'reports');
 *
 * if (isLoading) {
 *   return <LoadingOverlay />;
 * }
 * ```
 */
export function LoadingOverlay({ message: customMessage, className = '' }: LoadingOverlayProps) {
  const { currentMessage } = useLoadingContext();
  const displayMessage = customMessage || currentMessage || 'Loading...';

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 via-accent-50/10 to-success-50/10 ${className}`}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.3 }}
        className="glass-card p-8 max-w-md"
      >
        <div className="flex flex-col items-center gap-4">
          {/* Animated spinner */}
          <div className="w-12 h-12 border-4 border-accent-500 border-t-transparent rounded-full animate-spin" />

          {/* Message with fade transition */}
          <AnimatePresence mode="wait">
            <motion.div
              key={displayMessage}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="text-accent-500 text-lg font-medium text-center px-4"
            >
              {displayMessage}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
