/**
 * UndoRail - Persistent undo bar with countdown timers
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Undo2, X } from 'lucide-react';
import type { ExtractedAction } from './useConversation';

interface UndoableAction {
  id: string;
  summary: string;
  expiresAt: Date;
  onUndo: () => void;
}

interface UndoRailProps {
  undoableActions: UndoableAction[];
  onDismiss?: (actionId: string) => void;
}

// Calculate remaining seconds
function getRemainingSeconds(expiresAt: Date): number {
  return Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 1000));
}

// Single undo button with countdown
function UndoButton({
  action,
  onDismiss,
}: {
  action: UndoableAction;
  onDismiss?: () => void;
}) {
  const [remaining, setRemaining] = useState(() => getRemainingSeconds(action.expiresAt));
  const totalSeconds = 10; // Default undo window

  // Update countdown every second
  useEffect(() => {
    const interval = setInterval(() => {
      const newRemaining = getRemainingSeconds(action.expiresAt);
      setRemaining(newRemaining);
      if (newRemaining <= 0) {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [action.expiresAt]);

  // Calculate progress for circular indicator
  const progress = remaining / totalSeconds;
  const circumference = 2 * Math.PI * 12; // radius = 12
  const strokeDashoffset = circumference * (1 - progress);

  // Urgency styling
  const isUrgent = remaining <= 3;

  if (remaining <= 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -20, scale: 0.9 }}
      className={`flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border shadow-md transition-colors ${
        isUrgent
          ? 'bg-amber-50 border-amber-300'
          : 'bg-white border-gray-200'
      }`}
    >
      {/* Circular countdown */}
      <div className="relative w-7 h-7 flex items-center justify-center">
        <svg className="w-7 h-7 -rotate-90" viewBox="0 0 28 28">
          {/* Background circle */}
          <circle
            cx="14"
            cy="14"
            r="12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-gray-200"
          />
          {/* Progress circle */}
          <circle
            cx="14"
            cy="14"
            r="12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={`transition-all duration-100 ${
              isUrgent ? 'text-amber-500' : 'text-accent-500'
            }`}
          />
        </svg>
        <span className={`absolute text-xs font-bold ${isUrgent ? 'text-amber-600' : 'text-gray-700'}`}>
          {remaining}
        </span>
      </div>

      {/* Undo button */}
      <button
        onClick={action.onUndo}
        className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
          isUrgent
            ? 'text-amber-700 hover:text-amber-800'
            : 'text-gray-700 hover:text-gray-900'
        }`}
      >
        <Undo2 className="w-3.5 h-3.5" />
        <span className="truncate max-w-[120px]">{action.summary}</span>
      </button>

      {/* Dismiss button */}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="p-0.5 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </motion.div>
  );
}

export function UndoRail({ undoableActions, onDismiss }: UndoRailProps) {
  // Filter out expired actions
  const activeActions = undoableActions.filter(
    (a) => getRemainingSeconds(a.expiresAt) > 0
  );

  if (activeActions.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none"
    >
      <div className="max-w-5xl mx-auto px-4 pb-4">
        <div className="flex items-center justify-center gap-2 overflow-x-auto pointer-events-auto py-2">
          <AnimatePresence mode="popLayout">
            {activeActions.map((action) => (
              <UndoButton
                key={action.id}
                action={action}
                onDismiss={onDismiss ? () => onDismiss(action.id) : undefined}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

// Inline version for use within components
export function InlineUndoButton({
  remaining,
  totalSeconds = 10,
  onUndo,
  summary,
}: {
  remaining: number;
  totalSeconds?: number;
  onUndo: () => void;
  summary: string;
}) {
  const progress = remaining / totalSeconds;
  const circumference = 2 * Math.PI * 8;
  const strokeDashoffset = circumference * (1 - progress);
  const isUrgent = remaining <= 3;

  if (remaining <= 0) return null;

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      onClick={onUndo}
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
        isUrgent
          ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        <svg className="w-4 h-4 -rotate-90" viewBox="0 0 20 20">
          <circle
            cx="10"
            cy="10"
            r="8"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-gray-300"
          />
          <circle
            cx="10"
            cy="10"
            r="8"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={isUrgent ? 'text-amber-500' : 'text-violet-500'}
          />
        </svg>
      </div>
      <Undo2 className="w-3 h-3" />
      <span>{remaining}s</span>
    </motion.button>
  );
}

export default UndoRail;
