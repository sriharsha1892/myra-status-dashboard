/**
 * SmartSuggestions - Context-aware quick action chips
 */

'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  FileText,
  Building2,
  AlertCircle,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import type { CommandAction } from '@/lib/command/types';

interface Suggestion {
  id: string;
  label: string;
  template: string;
  icon: typeof Activity;
  color: string;
}

interface SmartSuggestionsProps {
  recentOrg?: string;
  recentActions: CommandAction[];
  onSelect: (template: string) => void;
}

// Base suggestions always shown
const BASE_SUGGESTIONS: Suggestion[] = [
  {
    id: 'log-activity',
    label: 'Log activity',
    template: '/log query at ',
    icon: Activity,
    color: 'text-violet-600 bg-violet-50 hover:bg-violet-100 border-violet-200',
  },
  {
    id: 'add-note',
    label: 'Add note',
    template: '/note ',
    icon: FileText,
    color: 'text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-200',
  },
  {
    id: 'update-stage',
    label: 'Update stage',
    template: '/stage ',
    icon: Building2,
    color: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border-emerald-200',
  },
  {
    id: 'new-ticket',
    label: 'New ticket',
    template: '/ticket "',
    icon: AlertCircle,
    color: 'text-orange-600 bg-orange-50 hover:bg-orange-100 border-orange-200',
  },
];

// Time-based suggestions
function getTimeBasedSuggestions(): Suggestion[] {
  const hour = new Date().getHours();

  // Morning: check-ins
  if (hour >= 8 && hour < 12) {
    return [
      {
        id: 'morning-checkin',
        label: 'Morning check-in',
        template: '/log check_in at ',
        icon: Calendar,
        color: 'text-amber-600 bg-amber-50 hover:bg-amber-100 border-amber-200',
      },
    ];
  }

  // Afternoon: follow-ups
  if (hour >= 12 && hour < 17) {
    return [
      {
        id: 'followup',
        label: 'Schedule follow-up',
        template: '/followup ',
        icon: Calendar,
        color: 'text-cyan-600 bg-cyan-50 hover:bg-cyan-100 border-cyan-200',
      },
    ];
  }

  // End of day: status updates
  if (hour >= 17 && hour < 20) {
    return [
      {
        id: 'eod-update',
        label: 'EOD update',
        template: '/su ',
        icon: TrendingUp,
        color: 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border-indigo-200',
      },
    ];
  }

  return [];
}

// Recent action-based suggestions
function getRecentActionSuggestions(
  recentActions: CommandAction[],
  recentOrg?: string
): Suggestion[] {
  const suggestions: Suggestion[] = [];

  // If there's a recent org, suggest actions for it
  if (recentOrg) {
    suggestions.push({
      id: 'recent-org-log',
      label: `Log for ${recentOrg}`,
      template: `/log query at "${recentOrg}"`,
      icon: Activity,
      color: 'text-violet-600 bg-violet-50 hover:bg-violet-100 border-violet-200',
    });
  }

  // Suggest complementary actions based on recent ones
  if (recentActions.includes('LOG_ACTIVITY')) {
    suggestions.push({
      id: 'follow-log-note',
      label: 'Add follow-up note',
      template: '/note Follow-up: ',
      icon: FileText,
      color: 'text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-200',
    });
  }

  if (recentActions.includes('UPDATE_STAGE')) {
    suggestions.push({
      id: 'follow-stage-update',
      label: 'Update deal value',
      template: '/deal ',
      icon: TrendingUp,
      color: 'text-green-600 bg-green-50 hover:bg-green-100 border-green-200',
    });
  }

  return suggestions;
}

export function SmartSuggestions({
  recentOrg,
  recentActions,
  onSelect,
}: SmartSuggestionsProps) {
  const suggestions = useMemo(() => {
    const timeBased = getTimeBasedSuggestions();
    const recentBased = getRecentActionSuggestions(recentActions, recentOrg);

    // Combine and dedupe, prioritizing context-aware suggestions
    const contextSuggestions = [...recentBased, ...timeBased];
    const baseSuggestions = BASE_SUGGESTIONS.filter(
      (base) => !contextSuggestions.some((ctx) => ctx.id === base.id)
    );

    // Return max 6 suggestions
    return [...contextSuggestions, ...baseSuggestions].slice(0, 6);
  }, [recentOrg, recentActions]);

  if (suggestions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {suggestions.map((suggestion, index) => {
        const Icon = suggestion.icon;
        return (
          <motion.button
            key={suggestion.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(suggestion.template)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${suggestion.color}`}
          >
            <Icon className="w-3.5 h-3.5" />
            {suggestion.label}
          </motion.button>
        );
      })}
    </div>
  );
}

export default SmartSuggestions;
