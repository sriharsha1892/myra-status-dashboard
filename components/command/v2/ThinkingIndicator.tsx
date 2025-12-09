/**
 * ThinkingIndicator - AI "typing" animation with bouncing dots
 */

'use client';

import { motion } from 'framer-motion';

const dotVariants = {
  initial: { y: 0 },
  animate: {
    y: [0, -6, 0],
    transition: {
      duration: 0.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

const containerVariants = {
  initial: { opacity: 0, scale: 0.8 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.2,
      staggerChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    transition: { duration: 0.15 },
  },
};

interface ThinkingIndicatorProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function ThinkingIndicator({ message, size = 'md' }: ThinkingIndicatorProps) {
  const dotSize = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  }[size];

  const gap = {
    sm: 'gap-1',
    md: 'gap-1.5',
    lg: 'gap-2',
  }[size];

  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex items-center gap-2"
    >
      <div className={`flex items-center ${gap}`}>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            variants={dotVariants}
            animate="animate"
            initial="initial"
            transition={{
              delay: i * 0.15,
            }}
            className={`${dotSize} rounded-full bg-violet-500`}
          />
        ))}
      </div>
      {message && (
        <span className="text-sm text-gray-500 animate-pulse">{message}</span>
      )}
    </motion.div>
  );
}

// Inline version for use in bubbles
export function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          animate={{
            y: [0, -3, 0],
          }}
          transition={{
            duration: 0.4,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.1,
          }}
          className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block"
        />
      ))}
    </span>
  );
}

export default ThinkingIndicator;
