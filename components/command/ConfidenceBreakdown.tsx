'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Sparkles, AlertCircle, HelpCircle, Brain, Building2, User } from 'lucide-react';
import type { ConfidenceBreakdown as ConfidenceBreakdownType, ConfidenceTier } from '@/lib/command/types';

interface ConfidenceBreakdownProps {
  breakdown: ConfidenceBreakdownType;
  tier: ConfidenceTier;
  orgName?: string | null;
  resolvedOrgName?: string | null;
  userName?: string | null;
  resolvedUserName?: string | null;
  action?: string;
  defaultExpanded?: boolean;
}

const tierConfig = {
  high: {
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-300',
    progressColor: 'bg-green-500',
    Icon: Sparkles,
    label: 'Auto-executed',
  },
  medium: {
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
    borderColor: 'border-amber-300',
    progressColor: 'bg-amber-500',
    Icon: AlertCircle,
    label: 'Review needed',
  },
  low: {
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-300',
    progressColor: 'bg-orange-500',
    Icon: HelpCircle,
    label: 'Low confidence',
  },
};

function ProgressBar({ value, color, label }: { value: number; color: string; label: string }) {
  const percentage = Math.round(value * 100);

  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${color} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
      <span className="text-xs text-gray-600 w-10">{percentage}%</span>
    </div>
  );
}

export function ConfidenceBreakdown({
  breakdown,
  tier,
  orgName,
  resolvedOrgName,
  userName,
  resolvedUserName,
  action,
  defaultExpanded = false,
}: ConfidenceBreakdownProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const config = tierConfig[tier];
  const Icon = config.Icon;
  const percentage = Math.round(breakdown.combined * 100);

  return (
    <div className={`rounded-lg border ${config.borderColor} ${config.bgColor} overflow-hidden`}>
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-white/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <motion.div
            animate={tier === 'high' ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 0.5, repeat: tier === 'high' ? 2 : 0 }}
          >
            <Icon className={`w-4 h-4 ${config.color}`} />
          </motion.div>
          <span className={`text-sm font-medium ${config.color}`}>
            {percentage}% confident
          </span>
          <span className="text-xs text-gray-500">
            ({config.label})
          </span>
        </div>

        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </motion.div>
      </button>

      {/* Expanded details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-3 border-t border-gray-200/50">
              {/* Parse Quality */}
              <div className="pt-3">
                <div className="flex items-center gap-2 mb-1">
                  <Brain className="w-3.5 h-3.5 text-violet-600" />
                  <span className="text-xs font-medium text-gray-700">Parse Quality</span>
                  <span className="text-xs text-gray-400">({Math.round(breakdown.weights.parse * 100)}% weight)</span>
                </div>
                <ProgressBar
                  value={breakdown.parse}
                  color="bg-violet-500"
                  label="Parse"
                />
                {action && (
                  <p className="text-xs text-gray-500 mt-1 ml-5">
                    Detected: <span className="font-mono text-violet-600">{action}</span>
                  </p>
                )}
              </div>

              {/* Org Match */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="w-3.5 h-3.5 text-purple-600" />
                  <span className="text-xs font-medium text-gray-700">Organization Match</span>
                  <span className="text-xs text-gray-400">({Math.round(breakdown.weights.org * 100)}% weight)</span>
                </div>
                <ProgressBar
                  value={breakdown.org}
                  color="bg-purple-500"
                  label="Org"
                />
                {(orgName || resolvedOrgName) && (
                  <p className="text-xs text-gray-500 mt-1 ml-5">
                    {orgName && resolvedOrgName && orgName !== resolvedOrgName ? (
                      <>
                        &quot;{orgName}&quot; → <span className="font-medium text-purple-600">{resolvedOrgName}</span>
                      </>
                    ) : (
                      <span className="font-medium text-purple-600">{resolvedOrgName || orgName || 'Not found'}</span>
                    )}
                  </p>
                )}
              </div>

              {/* User Match */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-xs font-medium text-gray-700">User Match</span>
                  <span className="text-xs text-gray-400">({Math.round(breakdown.weights.user * 100)}% weight)</span>
                </div>
                <ProgressBar
                  value={breakdown.user}
                  color="bg-blue-500"
                  label="User"
                />
                {(userName || resolvedUserName) && (
                  <p className="text-xs text-gray-500 mt-1 ml-5">
                    {userName && resolvedUserName && userName !== resolvedUserName ? (
                      <>
                        &quot;{userName}&quot; → <span className="font-medium text-blue-600">{resolvedUserName}</span>
                      </>
                    ) : (
                      <span className="font-medium text-blue-600">{resolvedUserName || userName || 'Not specified'}</span>
                    )}
                  </p>
                )}
                {!userName && !resolvedUserName && (
                  <p className="text-xs text-gray-400 mt-1 ml-5">No user specified (100% default)</p>
                )}
              </div>

              {/* Formula explanation */}
              <div className="pt-2 border-t border-gray-200/50">
                <p className="text-xs text-gray-400">
                  Combined = {Math.round(breakdown.parse * 100)}% × 0.4 + {Math.round(breakdown.org * 100)}% × 0.4 + {Math.round(breakdown.user * 100)}% × 0.2
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
