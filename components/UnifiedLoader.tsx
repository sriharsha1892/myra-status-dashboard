'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface UnifiedLoaderProps {
  /**
   * Loading size variant
   * - 'fullscreen': Full page overlay with quotes
   * - 'page': Full page section (for within page containers)
   * - 'inline': Inline spinner with message (for components)
   * - 'small': Small spinner only (for buttons/small areas)
   */
  variant?: 'fullscreen' | 'page' | 'inline' | 'small';

  /**
   * Custom message to display (overrides quote rotation)
   */
  message?: string;

  /**
   * Show inspirational quotes (only for fullscreen/page variants)
   */
  showQuotes?: boolean;

  /**
   * Custom className for additional styling
   */
  className?: string;

  /**
   * Spinner color theme
   */
  color?: 'blue' | 'accent' | 'success' | 'warning' | 'error';
}

/**
 * Unified loading component with consistent design across the application
 * Supports multiple variants from full-screen to inline loading states
 *
 * @example
 * ```tsx
 * // Full-screen with quotes
 * <UnifiedLoader variant="fullscreen" showQuotes />
 *
 * // Page section loading
 * <UnifiedLoader variant="page" message="Loading dashboard..." />
 *
 * // Inline component loading
 * <UnifiedLoader variant="inline" message="Fetching data..." />
 *
 * // Small button spinner
 * <UnifiedLoader variant="small" color="accent" />
 * ```
 */
export default function UnifiedLoader({
  variant = 'inline',
  message,
  showQuotes = true,
  className = '',
  color = 'blue',
}: UnifiedLoaderProps) {
  const [quoteIndex, setQuoteIndex] = useState(0);

  const quotes = [
    { text: "Stay hungry, stay foolish.", author: "Steve Jobs" },
    { text: "Seek wealth, not money or status.", author: "Naval Ravikant" },
    { text: "The future is going to be weird.", author: "Elon Musk" },
    { text: "Build something 100 people love, not something 1 million people kind of like.", author: "Peter Thiel" },
    { text: "Move fast with stable infrastructure.", author: "Steve Jobs" },
    { text: "Compound your advantages.", author: "Naval Ravikant" },
    { text: "Patience is not passivity.", author: "Naval Ravikant" },
    { text: "Play long-term games with long-term people.", author: "Naval Ravikant" },
    { text: "Specific knowledge is knowledge that cannot be trained.", author: "Naval Ravikant" },
    { text: "Code and media are permissionless leverage.", author: "Naval Ravikant" },
  ];

  // Rotate quotes every 3 seconds
  useEffect(() => {
    if (!showQuotes || variant === 'small' || message) return;

    const interval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % quotes.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [showQuotes, variant, message, quotes.length]);

  const colorMap = {
    blue: {
      spinner: 'border-blue-600',
      spinnerTop: 'border-t-transparent',
      text: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    accent: {
      spinner: 'border-accent-600',
      spinnerTop: 'border-t-transparent',
      text: 'text-accent-600',
      bg: 'bg-accent-50',
    },
    success: {
      spinner: 'border-emerald-600',
      spinnerTop: 'border-t-transparent',
      text: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    warning: {
      spinner: 'border-amber-600',
      spinnerTop: 'border-t-transparent',
      text: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    error: {
      spinner: 'border-red-600',
      spinnerTop: 'border-t-transparent',
      text: 'text-red-600',
      bg: 'bg-red-50',
    },
  };

  const colors = colorMap[color];

  // Small spinner variant
  if (variant === 'small') {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className={`w-4 h-4 border-2 ${colors.spinner} ${colors.spinnerTop} rounded-full animate-spin`} />
      </div>
    );
  }

  // Inline variant
  if (variant === 'inline') {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <div className="flex flex-col items-center gap-3">
          <div className={`w-8 h-8 border-3 ${colors.spinner} ${colors.spinnerTop} rounded-full animate-spin`} />
          {message && (
            <p className={`text-sm ${colors.text} font-medium`}>
              {message}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Page variant
  if (variant === 'page') {
    const currentQuote = quotes[quoteIndex];
    const displayText = message || (showQuotes ? currentQuote.text : 'Loading...');

    return (
      <div className={`flex items-center justify-center py-16 ${className}`}>
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <div className={`w-12 h-12 border-2 ${colors.spinner} ${colors.spinnerTop} rounded-full animate-spin`} />
          <AnimatePresence mode="wait">
            <motion.div
              key={message || quoteIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-2"
            >
              <p className="text-sm text-neutral-600 tracking-tight">{displayText}</p>
              {!message && showQuotes && (
                <p className="text-xs text-neutral-500">— {currentQuote.author}</p>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // Fullscreen variant
  const currentQuote = quotes[quoteIndex];
  const displayText = message || (showQuotes ? currentQuote.text : 'Loading...');

  return (
    <div className={`min-h-screen bg-neutral-50 flex items-center justify-center ${className}`}>
      <div className="flex flex-col items-center gap-4 max-w-md text-center px-6">
        <div className={`w-12 h-12 border-2 ${colors.spinner} ${colors.spinnerTop} rounded-full animate-spin`} />

        <AnimatePresence mode="wait">
          <motion.div
            key={message || quoteIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="space-y-3"
          >
            <p className="text-sm text-neutral-600 tracking-tight">
              {!message && showQuotes ? 'Loading...' : null}
            </p>
            <div className="px-6 py-3 bg-white rounded-lg border border-neutral-200">
              <p className="text-xs text-neutral-900 font-medium mb-1">"{displayText}"</p>
              {!message && showQuotes && (
                <p className="text-[10px] text-neutral-500">— {currentQuote.author}</p>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
