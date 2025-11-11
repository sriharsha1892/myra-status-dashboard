'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface LiquidProgressBarProps {
  progress: number;
  color?: string;
  height?: number;
  showShimmer?: boolean;
}

export function LiquidProgressBar({
  progress,
  color = '#3b82f6',
  height = 8,
  showShimmer = true,
}: LiquidProgressBarProps) {
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    // Animate from current to new progress
    const timer = setTimeout(() => {
      setDisplayProgress(progress);
    }, 50);

    return () => clearTimeout(timer);
  }, [progress]);

  return (
    <div
      className="relative w-full bg-gray-200 rounded-full overflow-hidden"
      style={{ height }}
    >
      {/* Liquid fill */}
      <motion.div
        className="absolute top-0 left-0 h-full rounded-full"
        style={{
          background: `linear-gradient(90deg, ${color}, ${color}dd)`,
        }}
        initial={{ width: '0%' }}
        animate={{ width: `${displayProgress}%` }}
        transition={{
          type: 'spring',
          stiffness: 100,
          damping: 20,
          duration: 0.8,
        }}
      />

      {/* Shimmer effect */}
      {showShimmer && displayProgress > 0 && (
        <motion.div
          className="absolute top-0 left-0 h-full w-32"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
          }}
          animate={{
            x: ['-100%', '400%'],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'linear',
            repeatDelay: 0.5,
          }}
        />
      )}

      {/* Bubble effect at completion */}
      {progress === 100 && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.5, 0] }}
          transition={{ duration: 0.6 }}
        >
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: color }}
          />
        </motion.div>
      )}
    </div>
  );
}
