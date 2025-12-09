'use client';

import { memo, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface ProcessingOverlayProps {
  isVisible: boolean;
  totalCommands: number;
  processedCount: number;
  currentCommand?: string;
}

export const ProcessingOverlay = memo(function ProcessingOverlay({
  isVisible,
  totalCommands,
  processedCount,
  currentCommand,
}: ProcessingOverlayProps) {
  const shouldReduceMotion = useReducedMotion();
  const progress = totalCommands > 0 ? processedCount / totalCommands : 0;
  const circumference = 2 * Math.PI * 45;

  // Memoize particle positions (reduce from 6 to 3 for performance)
  const particles = useMemo(() => [0, 1, 2], []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
        >
          {/* Backdrop with blur - simplified animation for performance */}
          <motion.div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Processing card */}
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="relative bg-white rounded-2xl p-8 shadow-2xl z-10 flex flex-col items-center min-w-[300px]"
          >
            {/* Animated circular progress */}
            <div className="relative w-28 h-28 mb-6">
              <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                <defs>
                  <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                </defs>

                {/* Background circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="6"
                />

                {/* Animated progress circle */}
                <motion.circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="url(#progressGradient)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: circumference * (1 - progress) }}
                  transition={{ duration: 0.5, ease: 'easeInOut' }}
                />
              </svg>

              {/* Center icon - respects reduced motion preference */}
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                animate={shouldReduceMotion ? {} : {
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0],
                }}
                transition={{ duration: 2, repeat: shouldReduceMotion ? 0 : Infinity }}
              >
                <Sparkles className="w-8 h-8 text-violet-600" />
              </motion.div>
            </div>

            {/* Progress text */}
            <motion.div className="text-center">
              <p className="text-lg font-semibold text-gray-900">
                Processing Commands
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {processedCount} of {totalCommands} complete
              </p>
            </motion.div>

            {/* Current command with typewriter effect */}
            <AnimatePresence mode="wait">
              {currentCommand && (
                <motion.p
                  key={currentCommand}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="mt-4 text-sm text-gray-600 font-mono max-w-xs truncate px-4 py-2 bg-gray-50 rounded-lg"
                >
                  &quot;{currentCommand}&quot;
                </motion.p>
              )}
            </AnimatePresence>

            {/* Floating particles - reduced for performance, respects reduced motion */}
            {!shouldReduceMotion && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
                {particles.map((i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 bg-violet-400/30 rounded-full"
                    style={{
                      left: `${25 + i * 25}%`,
                      top: `${35 + (i % 2) * 30}%`,
                    }}
                    animate={{
                      y: [-10, 10, -10],
                      opacity: [0.3, 0.6, 0.3],
                    }}
                    transition={{
                      duration: 2.5,
                      repeat: Infinity,
                      delay: i * 0.4,
                    }}
                  />
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
