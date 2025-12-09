'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Undo2 } from 'lucide-react';

interface UndoCountdownProps {
  secondsRemaining: number;
  totalSeconds?: number;
  onUndo: () => void;
}

export function UndoCountdown({
  secondsRemaining,
  totalSeconds = 5,
  onUndo,
}: UndoCountdownProps) {
  const progress = secondsRemaining / totalSeconds;
  const circumference = 2 * Math.PI * 12;

  // Progressive color based on urgency
  const { color, bgColor, urgencyLevel } = useMemo(() => {
    if (progress > 0.6) return {
      color: '#22c55e',
      bgColor: 'bg-green-100 hover:bg-green-200',
      urgencyLevel: 'calm' as const,
    };
    if (progress > 0.4) return {
      color: '#eab308',
      bgColor: 'bg-yellow-100 hover:bg-yellow-200',
      urgencyLevel: 'warning' as const,
    };
    if (progress > 0.2) return {
      color: '#f97316',
      bgColor: 'bg-orange-100 hover:bg-orange-200',
      urgencyLevel: 'urgent' as const,
    };
    return {
      color: '#ef4444',
      bgColor: 'bg-red-100 hover:bg-red-200',
      urgencyLevel: 'critical' as const,
    };
  }, [progress]);

  // Animation variants for different urgency levels
  const buttonAnimations = {
    calm: {},
    warning: {
      scale: [1, 1.02, 1],
      transition: { duration: 0.5, repeat: Infinity },
    },
    urgent: {
      scale: [1, 1.03, 1],
      transition: { duration: 0.3, repeat: Infinity },
    },
    critical: {
      x: [0, -2, 2, -2, 0],
      scale: [1, 1.03, 1],
      transition: {
        x: { duration: 0.2, repeat: Infinity },
        scale: { duration: 0.2, repeat: Infinity },
      },
    },
  };

  return (
    <motion.button
      onClick={(e) => {
        e.stopPropagation();
        onUndo();
      }}
      className={`flex items-center gap-2 px-3 py-1.5 ${bgColor} rounded-lg transition-colors`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      animate={buttonAnimations[urgencyLevel]}
      initial={{ opacity: 0, x: 20 }}
    >
      {/* SVG circular countdown */}
      <div className="relative w-7 h-7">
        <svg
          className="-rotate-90"
          width="28"
          height="28"
          viewBox="0 0 28 28"
        >
          {/* Background circle */}
          <circle
            cx="14"
            cy="14"
            r="12"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="2"
          />

          {/* Progress circle */}
          <motion.circle
            cx="14"
            cy="14"
            r="12"
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: 0 }}
            animate={{ strokeDashoffset: circumference * (1 - progress) }}
            transition={{ duration: 0.3, ease: 'linear' }}
          />
        </svg>

        {/* Center icon */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={urgencyLevel === 'critical' ? {
            scale: [1, 1.2, 1],
            opacity: [1, 0.8, 1],
          } : {}}
          transition={{ duration: 0.3, repeat: Infinity }}
        >
          <Undo2
            className="w-3 h-3"
            style={{ color }}
          />
        </motion.div>
      </div>

      {/* Text */}
      <span
        className="text-sm font-medium"
        style={{ color }}
      >
        Undo ({secondsRemaining}s)
      </span>
    </motion.button>
  );
}

// Compact inline version
export function UndoCountdownInline({
  secondsRemaining,
  onUndo,
}: {
  secondsRemaining: number;
  onUndo: () => void;
}) {
  const isUrgent = secondsRemaining <= 2;

  return (
    <motion.button
      onClick={(e) => {
        e.stopPropagation();
        onUndo();
      }}
      className={`text-xs px-2 py-1 rounded ${
        isUrgent
          ? 'bg-red-100 text-red-700 hover:bg-red-200'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
      animate={isUrgent ? { scale: [1, 1.05, 1] } : {}}
      transition={{ duration: 0.3, repeat: isUrgent ? Infinity : 0 }}
      whileTap={{ scale: 0.95 }}
    >
      <Undo2 className="w-3 h-3 inline mr-1" />
      {secondsRemaining}s
    </motion.button>
  );
}
