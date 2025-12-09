/**
 * SessionHistoryPanel - Today's executed actions with re-run capability
 */

'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Clock,
  RotateCcw,
  Activity,
  FileText,
  Building2,
  AlertCircle,
  TrendingUp,
  Search,
  Trash2,
} from 'lucide-react';
import type { ExtractedAction } from './useConversation';
import type { CommandAction } from '@/lib/command/types';

export interface SessionAction {
  id: string;
  timestamp: Date;
  command: string;
  action: CommandAction;
  summary: string;
  orgName: string | null;
  status: 'executed' | 'undone';
}

interface SessionHistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  sessionActions: SessionAction[];
  onRerun: (command: string) => void;
  onClearHistory: () => void;
}

// Action type icons
const actionIcons: Partial<Record<CommandAction, typeof Activity>> = {
  LOG_ACTIVITY: Activity,
  ADD_NOTE: FileText,
  UPDATE_STAGE: Building2,
  UPDATE_DEAL: TrendingUp,
  CREATE_TICKET: AlertCircle,
};

export function SessionHistoryPanel({
  isOpen,
  onClose,
  sessionActions,
  onRerun,
  onClearHistory,
}: SessionHistoryPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter actions by search
  const filteredActions = useMemo(() => {
    if (!searchQuery.trim()) return sessionActions;
    const query = searchQuery.toLowerCase();
    return sessionActions.filter(
      (a) =>
        a.summary.toLowerCase().includes(query) ||
        a.orgName?.toLowerCase().includes(query) ||
        a.command.toLowerCase().includes(query)
    );
  }, [sessionActions, searchQuery]);

  // Group actions by hour
  const groupedActions = useMemo(() => {
    const groups: Map<string, SessionAction[]> = new Map();
    filteredActions.forEach((action) => {
      const hour = action.timestamp.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: undefined,
        hour12: true,
      });
      if (!groups.has(hour)) {
        groups.set(hour, []);
      }
      groups.get(hour)!.push(action);
    });
    return groups;
  }, [filteredActions]);

  // Calculate stats
  const stats = useMemo(() => {
    const executed = sessionActions.filter((a) => a.status === 'executed');
    const orgsUpdated = new Set(executed.filter((a) => a.orgName).map((a) => a.orgName)).size;
    const actionTypes = executed.reduce((acc, a) => {
      acc[a.action] = (acc[a.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: executed.length,
      orgsUpdated,
      topActions: Object.entries(actionTypes)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3),
    };
  }, [sessionActions]);

  // Format time
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-start justify-center pt-16 bg-black/30"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className="w-full max-w-md mx-4 bg-white rounded-xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-semibold text-gray-900">Today's Activity</span>
              <span className="px-1.5 py-0.5 text-xs font-medium text-violet-700 bg-violet-100 rounded-full">
                {sessionActions.length}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {sessionActions.length > 0 && (
                <button
                  onClick={() => {
                    if (confirm('Clear all session history?')) {
                      onClearHistory();
                    }
                  }}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Clear history"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          {sessionActions.length > 0 && (
            <div className="px-4 py-3 bg-gradient-to-r from-violet-50 to-indigo-50 border-b border-gray-100">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-xl font-bold text-violet-700">{stats.total}</span>
                    <span className="text-gray-500 ml-1">actions</span>
                  </div>
                  <div className="h-4 w-px bg-gray-300" />
                  <div>
                    <span className="font-semibold text-gray-700">{stats.orgsUpdated}</span>
                    <span className="text-gray-500 ml-1">orgs</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {stats.topActions.map(([action, count]) => {
                    const Icon = actionIcons[action as CommandAction] || Activity;
                    return (
                      <span
                        key={action}
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-xs text-gray-600 bg-white/80 rounded-full"
                        title={`${action}: ${count}`}
                      >
                        <Icon className="w-3 h-3" />
                        {count}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Search */}
          {sessionActions.length > 5 && (
            <div className="px-4 py-2 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search actions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Actions List */}
          <div className="max-h-[400px] overflow-y-auto">
            {sessionActions.length === 0 ? (
              <div className="py-12 text-center">
                <Clock className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="text-sm text-gray-500">No actions yet today</p>
                <p className="text-xs text-gray-400 mt-1">
                  Your executed commands will appear here
                </p>
              </div>
            ) : filteredActions.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-gray-500">No matching actions</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {Array.from(groupedActions.entries()).map(([hour, actions]) => (
                  <div key={hour}>
                    <div className="px-4 py-1.5 bg-gray-50 sticky top-0">
                      <span className="text-xs font-medium text-gray-500">{hour}</span>
                    </div>
                    {actions.map((action) => {
                      const Icon = actionIcons[action.action] || Activity;
                      return (
                        <motion.div
                          key={action.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={`flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors group ${
                            action.status === 'undone' ? 'opacity-50' : ''
                          }`}
                        >
                          <div
                            className={`p-1.5 rounded-lg ${
                              action.status === 'undone'
                                ? 'bg-gray-100 text-gray-400'
                                : 'bg-violet-100 text-violet-600'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-sm font-medium truncate ${
                                  action.status === 'undone'
                                    ? 'text-gray-400 line-through'
                                    : 'text-gray-900'
                                }`}
                              >
                                {action.summary}
                              </span>
                              {action.status === 'undone' && (
                                <span className="text-[10px] text-gray-400 uppercase">
                                  undone
                                </span>
                              )}
                            </div>
                            {action.orgName && (
                              <span className="text-xs text-gray-500">{action.orgName}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">{formatTime(action.timestamp)}</span>
                            {action.status === 'executed' && (
                              <button
                                onClick={() => onRerun(action.command)}
                                className="p-1 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                                title="Re-run this command"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {sessionActions.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
              <p className="text-[10px] text-center text-gray-400">
                Session history clears at midnight
              </p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default SessionHistoryPanel;
