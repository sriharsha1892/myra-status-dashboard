'use client';

import { ReactNode, useEffect, useState } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import type { ResolvedCommand } from '@/lib/command/types';

interface AnimatedCommandCardProps {
  children: ReactNode;
  status: ResolvedCommand['status'];
  index: number;
  isSelected?: boolean;
}

const cardVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.98,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 25,
    },
  },
  exit: {
    opacity: 0,
    x: -100,
    scale: 0.95,
    transition: {
      duration: 0.25,
      ease: 'easeIn',
    },
  },
};

const statusStyles: Record<ResolvedCommand['status'], { border: string; shadow: string; glow?: string }> = {
  pending: {
    border: 'border-gray-200',
    shadow: 'shadow-sm',
  },
  executing: {
    border: 'border-violet-300',
    shadow: 'shadow-md shadow-violet-100',
    glow: 'animate-pulse',
  },
  success: {
    border: 'border-green-300',
    shadow: 'shadow-md shadow-green-100',
  },
  failed: {
    border: 'border-red-300',
    shadow: 'shadow-md shadow-red-100',
  },
  needs_confirmation: {
    border: 'border-amber-300',
    shadow: 'shadow-md shadow-amber-100',
  },
  needs_disambiguation: {
    border: 'border-blue-300',
    shadow: 'shadow-md shadow-blue-100',
  },
  undone: {
    border: 'border-gray-300',
    shadow: 'shadow-sm',
  },
};

export function AnimatedCommandCard({
  children,
  status,
  index,
  isSelected = false,
}: AnimatedCommandCardProps) {
  const [prevStatus, setPrevStatus] = useState(status);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (status !== prevStatus) {
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        setIsTransitioning(false);
        setPrevStatus(status);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [status, prevStatus]);

  const styles = statusStyles[status];

  return (
    <motion.div
      layout
      variants={cardVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ delay: index * 0.05 }}
      style={{ transformOrigin: 'center left' }}
    >
      <motion.div
        className={`
          relative rounded-xl border-2 overflow-hidden bg-white
          ${styles.border} ${styles.shadow}
          ${isSelected ? 'ring-2 ring-violet-500 ring-offset-2' : ''}
          ${status === 'undone' ? 'opacity-60' : ''}
        `}
        animate={{
          scale: isTransitioning && status === 'success' ? [1, 1.02, 1] : 1,
          x: isTransitioning && status === 'failed' ? [0, -4, 4, -4, 0] : 0,
        }}
        transition={{ duration: 0.3 }}
      >
        {/* Success pulse effect */}
        <AnimatePresence>
          {isTransitioning && status === 'success' && (
            <motion.div
              initial={{ opacity: 0.5, scale: 1 }}
              animate={{ opacity: 0, scale: 1.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="absolute inset-0 bg-green-200 rounded-xl pointer-events-none"
            />
          )}
        </AnimatePresence>

        {/* Executing glow effect */}
        {status === 'executing' && (
          <motion.div
            animate={{
              boxShadow: [
                '0 0 0 0 rgba(139, 92, 246, 0.4)',
                '0 0 0 10px rgba(139, 92, 246, 0)',
                '0 0 0 0 rgba(139, 92, 246, 0)',
              ],
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="absolute inset-0 rounded-xl pointer-events-none"
          />
        )}

        {children}
      </motion.div>
    </motion.div>
  );
}

// Wrapper component for AnimatePresence
export function AnimatedCommandList({ children }: { children: ReactNode }) {
  return (
    <AnimatePresence mode="popLayout">
      {children}
    </AnimatePresence>
  );
}
