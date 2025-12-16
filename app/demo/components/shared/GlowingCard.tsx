'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface GlowingCardProps {
  children: ReactNode;
  glowColor?: string;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

export default function GlowingCard({
  children,
  glowColor = 'violet',
  selected = false,
  onClick,
  className = '',
  disabled = false,
}: GlowingCardProps) {
  const glowColors: Record<string, string> = {
    violet: 'shadow-violet-500/30',
    red: 'shadow-red-500/30',
    green: 'shadow-emerald-500/30',
    amber: 'shadow-amber-500/30',
    blue: 'shadow-blue-500/30',
  };

  const borderColors: Record<string, string> = {
    violet: 'border-violet-500/50',
    red: 'border-red-500/50',
    green: 'border-emerald-500/50',
    amber: 'border-amber-500/50',
    blue: 'border-blue-500/50',
  };

  return (
    <motion.div
      className={cn(
        'relative rounded-2xl border backdrop-blur-xl',
        'transition-all duration-300',
        'bg-white/[0.03]',
        selected
          ? `${borderColors[glowColor]} shadow-2xl ${glowColors[glowColor]}`
          : 'border-white/10 hover:border-white/20',
        onClick && !disabled && 'cursor-pointer',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      onClick={disabled ? undefined : onClick}
      whileHover={
        onClick && !disabled
          ? {
              scale: 1.02,
              transition: { duration: 0.2 },
            }
          : undefined
      }
      whileTap={
        onClick && !disabled
          ? {
              scale: 0.98,
              transition: { duration: 0.1 },
            }
          : undefined
      }
    >
      {/* Glow effect when selected */}
      {selected && (
        <motion.div
          className={cn(
            'absolute -inset-px rounded-2xl opacity-50',
            `bg-gradient-to-br from-${glowColor}-500/20 to-transparent`
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ duration: 0.3 }}
        />
      )}

      {/* Content */}
      <div className="relative z-10">{children}</div>

      {/* Selection indicator */}
      {selected && (
        <motion.div
          className={cn(
            'absolute top-3 right-3 w-6 h-6 rounded-full',
            'flex items-center justify-center',
            `bg-${glowColor}-500`
          )}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        >
          <svg
            className="w-4 h-4 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </motion.div>
      )}
    </motion.div>
  );
}

// Variant for workflow stage cards
interface WorkflowStageCardProps {
  children: ReactNode;
  status?: 'neutral' | 'pain' | 'solution';
  delay?: number;
  className?: string;
}

export function WorkflowStageCard({
  children,
  status = 'neutral',
  delay = 0,
  className = '',
}: WorkflowStageCardProps) {
  const statusStyles = {
    neutral: {
      bg: 'bg-white/[0.05]',
      border: 'border-white/20',
      glow: '',
    },
    pain: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/40',
      glow: 'shadow-lg shadow-red-500/20',
    },
    solution: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/40',
      glow: 'shadow-lg shadow-emerald-500/20',
    },
  };

  const styles = statusStyles[status];

  return (
    <motion.div
      className={cn(
        'relative rounded-xl border backdrop-blur-sm p-4',
        styles.bg,
        styles.border,
        styles.glow,
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      {children}
    </motion.div>
  );
}
