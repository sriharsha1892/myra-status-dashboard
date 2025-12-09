'use client';

/**
 * EnrichmentProgressRing - Circular SVG progress indicator
 * Asana-style completion ring with animated fill
 */

import { useEffect, useState } from 'react';
import { motion, animate } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { COMPLETENESS_UNLOCK_THRESHOLD } from '@/lib/enrichment';

interface EnrichmentProgressRingProps {
  score: number;
  previousScore?: number;
  answeredCount: number;
  totalCount: number;
  className?: string;
}

const RADIUS = 36;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function EnrichmentProgressRing({
  score,
  previousScore,
  answeredCount,
  totalCount,
  className,
}: EnrichmentProgressRingProps) {
  const isUnlocked = score >= COMPLETENESS_UNLOCK_THRESHOLD;
  const [displayScore, setDisplayScore] = useState(previousScore ?? score);

  // Animate score number changes
  useEffect(() => {
    if (previousScore === undefined) {
      setDisplayScore(score);
      return;
    }

    const controls = animate(previousScore, score, {
      duration: 0.4,
      ease: 'easeOut',
      onUpdate: (value) => setDisplayScore(Math.round(value)),
    });

    return () => controls.stop();
  }, [score, previousScore]);

  const strokeOffset = CIRCUMFERENCE * (1 - score / 100);

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      {/* SVG Ring */}
      <svg
        width="88"
        height="88"
        viewBox="0 0 88 88"
        className="transform -rotate-90"
      >
        {/* Background track */}
        <circle
          cx="44"
          cy="44"
          r={RADIUS}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="5"
        />

        {/* Threshold marker (subtle dashed line at 80%) */}
        {!isUnlocked && (
          <circle
            cx="44"
            cy="44"
            r={RADIUS}
            fill="none"
            stroke="#d1d5db"
            strokeWidth="1"
            strokeDasharray="2 4"
            strokeDashoffset={CIRCUMFERENCE * 0.2}
            opacity={0.5}
          />
        )}

        {/* Progress arc */}
        <motion.circle
          cx="44"
          cy="44"
          r={RADIUS}
          fill="none"
          stroke={isUnlocked ? '#10b981' : '#6366f1'}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          initial={{ strokeDashoffset: CIRCUMFERENCE }}
          animate={{ strokeDashoffset: strokeOffset }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="flex items-center gap-1">
          <span
            className={cn(
              'text-lg font-semibold tabular-nums',
              isUnlocked ? 'text-emerald-600' : 'text-neutral-700'
            )}
          >
            {displayScore}%
          </span>
          {isUnlocked && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25, delay: 0.2 }}
            >
              <Check className="w-4 h-4 text-emerald-600" />
            </motion.div>
          )}
        </div>
        <span className="text-xs text-neutral-500">
          {answeredCount} of {totalCount}
        </span>
      </div>
    </div>
  );
}

export default EnrichmentProgressRing;
