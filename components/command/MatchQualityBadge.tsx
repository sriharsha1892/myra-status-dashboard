'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { Check, Target, Globe, Link2, Search } from 'lucide-react';
import type { EntityMatch } from '@/lib/command/types';

interface MatchQualityBadgeProps {
  match: EntityMatch;
  type: 'org' | 'user';
  showDetails?: boolean;
}

const strategyConfig: Record<EntityMatch['strategy'], { Icon: typeof Check; label: string; color: string }> = {
  exact: {
    Icon: Check,
    label: 'Exact match',
    color: 'text-green-600',
  },
  fuzzy: {
    Icon: Search,
    label: 'Fuzzy match',
    color: 'text-amber-600',
  },
  domain: {
    Icon: Globe,
    label: 'Domain match',
    color: 'text-blue-600',
  },
  alias: {
    Icon: Link2,
    label: 'Known alias',
    color: 'text-purple-600',
  },
};

export const MatchQualityBadge = memo(function MatchQualityBadge({ match, type, showDetails = true }: MatchQualityBadgeProps) {
  const percentage = Math.round(match.confidence * 100);
  const strategy = strategyConfig[match.strategy];
  const Icon = strategy.Icon;

  // Determine color based on confidence
  const getProgressColor = () => {
    if (percentage >= 90) return 'bg-green-500';
    if (percentage >= 70) return 'bg-amber-500';
    return 'bg-orange-500';
  };

  return (
    <div className="flex items-center gap-2">
      {/* Mini progress bar */}
      <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${getProgressColor()} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>

      {/* Percentage */}
      <span className="text-xs font-medium text-gray-600 w-8">
        {percentage}%
      </span>

      {/* Strategy badge */}
      {showDetails && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 ${strategy.color}`}
        >
          <Icon className="w-3 h-3" />
          <span className="text-xs">{strategy.label}</span>
        </motion.div>
      )}
    </div>
  );
});

// Compact version for inline display - memoized
export const MatchQualityInline = memo(function MatchQualityInline({ match }: { match: EntityMatch }) {
  const percentage = Math.round(match.confidence * 100);
  const strategy = strategyConfig[match.strategy];
  const Icon = strategy.Icon;

  return (
    <span className={`inline-flex items-center gap-1 text-xs ${strategy.color}`}>
      <Icon className="w-3 h-3" />
      {percentage}%
    </span>
  );
});
