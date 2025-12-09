/**
 * SmartSuggestionsV2 - AI-powered context-aware quick action chips
 * Uses Groq for intelligent predictions based on session context
 */

'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  FileText,
  Building2,
  AlertCircle,
  Calendar,
  TrendingUp,
  Phone,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import type { CommandAction } from '@/lib/command/types';

interface Suggestion {
  id: string;
  label: string;
  template: string;
  confidence: number;
  reasoning: string;
  icon: 'activity' | 'note' | 'stage' | 'deal' | 'ticket' | 'followup' | 'call';
}

interface SmartSuggestionsV2Props {
  recentOrgs: string[];
  recentActions: CommandAction[];
  lastActionTime?: Date;
  focusedOrgId?: string | null;
  onSelect: (template: string) => void;
}

// Icon mapping
const iconMap = {
  activity: Activity,
  note: FileText,
  stage: Building2,
  deal: TrendingUp,
  ticket: AlertCircle,
  followup: Calendar,
  call: Phone,
};

// Color mapping based on confidence
const getConfidenceColor = (confidence: number) => {
  if (confidence >= 0.8) return 'text-violet-600 bg-violet-50 hover:bg-violet-100 border-violet-200';
  if (confidence >= 0.6) return 'text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-200';
  return 'text-gray-600 bg-gray-50 hover:bg-gray-100 border-gray-200';
};

export function SmartSuggestionsV2({
  recentOrgs,
  recentActions,
  lastActionTime,
  focusedOrgId,
  onSelect,
}: SmartSuggestionsV2Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAIPowered, setIsAIPowered] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);

  // Debounce context changes - only fetch if context changed significantly
  const contextHash = useMemo(() => {
    return JSON.stringify({
      orgs: recentOrgs.slice(0, 3),
      actions: recentActions.slice(0, 3),
      orgId: focusedOrgId,
    });
  }, [recentOrgs, recentActions, focusedOrgId]);

  // Fetch suggestions from API
  const fetchSuggestions = async () => {
    // Throttle requests - minimum 30s between fetches
    if (Date.now() - lastFetchTime < 30000) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/command/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionContext: {
            recentOrgs,
            recentActions,
            lastActionTime: lastActionTime?.toISOString() || null,
          },
          currentOrgId: focusedOrgId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
        setIsAIPowered(data.source === 'ai');
        setLastFetchTime(Date.now());
      }
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
      // Keep existing suggestions on error
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch suggestions when context changes
  useEffect(() => {
    // Initial fetch
    fetchSuggestions();
  }, [contextHash]); // eslint-disable-line react-hooks/exhaustive-deps

  // Manual refresh
  const handleRefresh = () => {
    setLastFetchTime(0); // Reset throttle
    fetchSuggestions();
  };

  if (suggestions.length === 0 && !isLoading) {
    return null;
  }

  return (
    <div className="space-y-1.5">
      {/* Header with AI indicator */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          {isAIPowered && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1 text-[10px] text-violet-600 font-medium"
            >
              <Sparkles className="w-3 h-3" />
              <span>AI suggestions</span>
            </motion.div>
          )}
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors disabled:opacity-50"
          title="Refresh suggestions"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Suggestions */}
      <div className="flex flex-wrap gap-2">
        <AnimatePresence mode="popLayout">
          {isLoading && suggestions.length === 0 ? (
            // Loading skeletons
            <>
              {[1, 2, 3].map((i) => (
                <div
                  key={`skeleton-${i}`}
                  className="h-7 w-24 bg-gray-100 rounded-full animate-pulse"
                />
              ))}
            </>
          ) : (
            suggestions.map((suggestion, index) => {
              const Icon = iconMap[suggestion.icon] || Activity;
              const colorClass = getConfidenceColor(suggestion.confidence);

              return (
                <motion.button
                  key={suggestion.id}
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSelect(suggestion.template)}
                  className={`group relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${colorClass}`}
                  title={suggestion.reasoning}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{suggestion.label}</span>

                  {/* Confidence indicator */}
                  {suggestion.confidence >= 0.8 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                  )}

                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    {suggestion.reasoning}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                  </div>
                </motion.button>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default SmartSuggestionsV2;
