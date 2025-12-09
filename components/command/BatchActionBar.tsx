'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, X, RefreshCw, Zap } from 'lucide-react';

interface BatchActionBarProps {
  needsConfirmation: number;
  failed: number;
  onConfirmAll: () => void;
  onSkipFailed: () => void;
  onRetryFailed: () => void;
  isProcessing?: boolean;
}

export function BatchActionBar({
  needsConfirmation,
  failed,
  onConfirmAll,
  onSkipFailed,
  onRetryFailed,
  isProcessing = false,
}: BatchActionBarProps) {
  const hasActions = needsConfirmation > 0 || failed > 0;

  if (!hasActions) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-4"
    >
      <div className="text-sm text-gray-600">
        {needsConfirmation > 0 && (
          <span className="text-amber-600 font-medium">
            {needsConfirmation} pending confirmation
          </span>
        )}
        {needsConfirmation > 0 && failed > 0 && <span className="mx-2">•</span>}
        {failed > 0 && (
          <span className="text-red-600 font-medium">
            {failed} failed
          </span>
        )}
      </div>

      <div className="flex gap-2">
        {needsConfirmation > 0 && (
          <motion.button
            onClick={onConfirmAll}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <CheckCircle2 className="w-4 h-4" />
            Confirm All ({needsConfirmation})
            <kbd className="text-xs bg-green-200 px-1.5 py-0.5 rounded ml-1">⌘A</kbd>
          </motion.button>
        )}

        {failed > 0 && (
          <>
            <motion.button
              onClick={onSkipFailed}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <X className="w-4 h-4" />
              Skip Failed ({failed})
            </motion.button>

            <motion.button
              onClick={onRetryFailed}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 disabled:opacity-50 transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <RefreshCw className="w-4 h-4" />
              Retry Failed
            </motion.button>
          </>
        )}
      </div>
    </motion.div>
  );
}

// Keyboard shortcuts help tooltip
export function KeyboardShortcutsHint() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-4 text-xs text-gray-400 mt-2"
    >
      <span className="flex items-center gap-1">
        <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">⌘↵</kbd>
        Process
      </span>
      <span className="flex items-center gap-1">
        <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">↑↓</kbd>
        Navigate
      </span>
      <span className="flex items-center gap-1">
        <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">⌘Z</kbd>
        Undo
      </span>
      <span className="flex items-center gap-1">
        <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">Esc</kbd>
        Clear
      </span>
    </motion.div>
  );
}
