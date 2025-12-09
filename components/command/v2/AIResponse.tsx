/**
 * AIResponse - AI response with extracted actions and batch controls
 *
 * Features:
 * - Tiered display: auto-executed → needs review → needs clarification
 * - Reasoning panel showing AI's understanding
 * - Progressive disclosure based on confidence
 */

'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Sparkles, CheckCircle, AlertCircle, HelpCircle } from 'lucide-react';
import type { ExtractedAction } from './useConversation';
import { ActionPreview } from './ActionPreview';
import { ActionClarificationCard } from './ActionClarificationCard';
import { ReasoningPanel } from './ReasoningPanel';
import { getSuggestions, type FollowUpSuggestion } from '@/lib/command/suggestionEngine';
import type { ClarificationOption } from '@/lib/command/clarificationEngine';

interface AIResponseProps {
  actions: ExtractedAction[];
  onConfirm: (actionId: string) => void;
  onReject: (actionId: string) => void;
  onConfirmAll: () => void;
  onRejectAll: () => void;
  onUndo?: (actionId: string) => void;
  onChangeAction?: (actionId: string, newActionType: string) => void;
  onAnswerClarification?: (actionId: string, answers: Record<string, string | ClarificationOption>) => void;
  onSuggestionSelect?: (prefillCommand: string) => void;
  originalText?: string; // Original user input for reasoning display
}

// Confidence thresholds for tiering
const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.90,    // Auto-execute
  MEDIUM: 0.70,  // Needs review
  // Below MEDIUM = needs clarification
};

export function AIResponse({
  actions,
  onConfirm,
  onReject,
  onConfirmAll,
  onRejectAll,
  onUndo,
  onChangeAction,
  onAnswerClarification,
  onSuggestionSelect,
  originalText,
}: AIResponseProps) {
  // Group actions by confidence tier
  const tieredActions = useMemo(() => {
    const autoExecuted = actions.filter((a) => a.status === 'executed');
    const needsReview = actions.filter(
      (a) => a.status === 'pending' && a.confidence >= CONFIDENCE_THRESHOLDS.MEDIUM && !a.clarificationQuestions?.length
    );
    // Actions needing clarification: either has clarification questions or low confidence
    const needsClarification = actions.filter(
      (a) => (a.status === 'pending' && a.confidence < CONFIDENCE_THRESHOLDS.MEDIUM) ||
             a.status === 'needs_clarification' ||
             (a.status === 'pending' && a.clarificationQuestions?.length)
    );
    const rejected = actions.filter((a) => a.status === 'rejected');
    const undone = actions.filter((a) => a.status === 'undone');

    return { autoExecuted, needsReview, needsClarification, rejected, undone };
  }, [actions]);

  const pendingActions = actions.filter((a) => a.status === 'pending');
  const hasPendingActions = pendingActions.length > 0;
  const allExecuted = tieredActions.autoExecuted.length === actions.length;
  const allRejected = tieredActions.rejected.length === actions.length;

  // Get follow-up suggestions for executed actions
  const suggestions = useMemo(() => {
    if (tieredActions.autoExecuted.length === 0) return [];

    const executedAction = tieredActions.autoExecuted[0];
    return getSuggestions({
      action: executedAction.action,
      orgName: executedAction.resolvedCommand?.entities.org?.name,
      userName: executedAction.resolvedCommand?.entities.user?.name,
      fields: executedAction.resolvedCommand?.parsed.fields,
    });
  }, [tieredActions.autoExecuted]);

  // Get first action for reasoning display
  const firstAction = actions[0];
  const reasoning = firstAction?.resolvedCommand?.parsed?.reasoning;

  // Calculate summary stats
  const totalConfidence = actions.reduce((sum, a) => sum + a.confidence, 0) / actions.length;
  const avgConfidencePercent = Math.round(totalConfidence * 100);

  if (actions.length === 0) {
    return (
      <div className="text-sm text-gray-500 italic py-2">
        No actions detected. Try being more specific.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header - prominent with icon container */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-50 to-accent-100
            flex items-center justify-center border border-accent-200 shadow-sm">
            <Sparkles className="w-4 h-4 text-accent-500" />
          </div>
          <div>
            <span className="text-base font-medium text-gray-900">
              {actions.length} action{actions.length !== 1 ? 's' : ''} detected
            </span>
            <span className="block text-xs text-gray-500 mt-0.5">
              {avgConfidencePercent}% average confidence
            </span>
          </div>
        </div>

        {/* Status summary */}
        {!hasPendingActions && (
          <div className="flex items-center gap-2">
            {allExecuted && (
              <span className="inline-flex items-center gap-1.5 text-xs text-green-700 bg-green-50
                px-3 py-1.5 rounded-lg border border-green-200">
                <Check className="w-3.5 h-3.5" />
                All completed
              </span>
            )}
            {allRejected && (
              <span className="inline-flex items-center gap-1.5 text-xs text-gray-700 bg-gray-100
                px-3 py-1.5 rounded-lg border border-gray-200">
                <X className="w-3.5 h-3.5" />
                All skipped
              </span>
            )}
          </div>
        )}
      </div>

      {/* Reasoning Panel - show AI's understanding */}
      {reasoning && (
        <ReasoningPanel
          reasoning={reasoning}
          originalText={originalText}
          defaultExpanded={false}
        />
      )}

      {/* TIER 1: Auto-executed (high confidence) */}
      {tieredActions.autoExecuted.length > 0 && (
        <TierSection
          title="Done"
          subtitle="auto-executed"
          icon={<CheckCircle className="w-4 h-4 text-green-500" />}
          count={tieredActions.autoExecuted.length}
          variant="success"
        >
          <AnimatePresence mode="popLayout">
            {tieredActions.autoExecuted.map((action) => (
              <ActionPreview
                key={action.id}
                action={action}
                onConfirm={() => onConfirm(action.id)}
                onReject={() => onReject(action.id)}
                onUndo={onUndo ? () => onUndo(action.id) : undefined}
                onChangeAction={onChangeAction ? (newType) => onChangeAction(action.id, newType) : undefined}
              />
            ))}
          </AnimatePresence>
        </TierSection>
      )}

      {/* TIER 2: Needs Review (medium confidence) */}
      {tieredActions.needsReview.length > 0 && (
        <TierSection
          title="Needs Review"
          subtitle="please confirm"
          icon={<AlertCircle className="w-4 h-4 text-amber-500" />}
          count={tieredActions.needsReview.length}
          variant="warning"
        >
          <AnimatePresence mode="popLayout">
            {tieredActions.needsReview.map((action) => (
              <ActionPreview
                key={action.id}
                action={action}
                onConfirm={() => onConfirm(action.id)}
                onReject={() => onReject(action.id)}
                onUndo={onUndo ? () => onUndo(action.id) : undefined}
                onChangeAction={onChangeAction ? (newType) => onChangeAction(action.id, newType) : undefined}
              />
            ))}
          </AnimatePresence>
        </TierSection>
      )}

      {/* TIER 3: Needs Clarification (low confidence or has questions) */}
      {tieredActions.needsClarification.length > 0 && (
        <TierSection
          title="Needs Clarification"
          subtitle="I'm not sure about these"
          icon={<HelpCircle className="w-4 h-4 text-red-500" />}
          count={tieredActions.needsClarification.length}
          variant="error"
        >
          <AnimatePresence mode="popLayout">
            {tieredActions.needsClarification.map((action) => (
              action.clarificationQuestions?.length && onAnswerClarification ? (
                <ActionClarificationCard
                  key={action.id}
                  questions={action.clarificationQuestions}
                  onAnswer={(answers) => onAnswerClarification(action.id, answers)}
                  onSkip={() => onReject(action.id)}
                />
              ) : (
                <ActionPreview
                  key={action.id}
                  action={action}
                  onConfirm={() => onConfirm(action.id)}
                  onReject={() => onReject(action.id)}
                  onUndo={onUndo ? () => onUndo(action.id) : undefined}
                  onChangeAction={onChangeAction ? (newType) => onChangeAction(action.id, newType) : undefined}
                  showDetails={true}
                />
              )
            ))}
          </AnimatePresence>
        </TierSection>
      )}

      {/* Rejected/Undone actions (collapsed) */}
      {(tieredActions.rejected.length > 0 || tieredActions.undone.length > 0) && (
        <div className="opacity-60">
          <AnimatePresence mode="popLayout">
            {[...tieredActions.rejected, ...tieredActions.undone].map((action) => (
              <ActionPreview
                key={action.id}
                action={action}
                onConfirm={() => onConfirm(action.id)}
                onReject={() => onReject(action.id)}
                onUndo={onUndo ? () => onUndo(action.id) : undefined}
                onChangeAction={onChangeAction ? (newType) => onChangeAction(action.id, newType) : undefined}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Batch actions */}
      {hasPendingActions && pendingActions.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 pt-4 border-t border-gray-200"
        >
          <motion.button
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={onConfirmAll}
            className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white text-sm font-semibold
              rounded-xl shadow-sm hover:bg-green-500 hover:shadow-md
              transition-all duration-200"
          >
            <Check className="w-4 h-4" />
            Confirm All ({pendingActions.length})
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onRejectAll}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium
              rounded-xl border border-gray-200 hover:bg-gray-200 hover:text-gray-900
              transition-all duration-200"
          >
            <X className="w-4 h-4" />
            Reject All
          </motion.button>
        </motion.div>
      )}

      {/* Single pending action - show inline buttons */}
      {hasPendingActions && pendingActions.length === 1 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 pt-4 border-t border-gray-200"
        >
          <motion.button
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onConfirm(pendingActions[0].id)}
            className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white text-sm font-semibold
              rounded-xl shadow-sm hover:bg-green-500 hover:shadow-md
              transition-all duration-200"
          >
            <Check className="w-4 h-4" />
            Confirm
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onReject(pendingActions[0].id)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium
              rounded-xl border border-gray-200 hover:bg-gray-200 hover:text-gray-900
              transition-all duration-200"
          >
            <X className="w-4 h-4" />
            Skip
          </motion.button>
        </motion.div>
      )}

      {/* Follow-up suggestions */}
      {suggestions.length > 0 && !hasPendingActions && onSuggestionSelect && (
        <FollowUpSuggestions
          suggestions={suggestions}
          onSelect={onSuggestionSelect}
        />
      )}
    </div>
  );
}

/**
 * TierSection - Visual grouping for action tiers
 */
interface TierSectionProps {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  count: number;
  variant: 'success' | 'warning' | 'error';
  children: React.ReactNode;
}

function TierSection({ title, subtitle, icon, count, variant, children }: TierSectionProps) {
  const styles = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      headerBorder: 'border-green-200',
      title: 'text-green-700',
      iconBg: 'bg-green-100',
      countBg: 'bg-green-100 text-green-700 border border-green-200',
    },
    warning: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      headerBorder: 'border-amber-200',
      title: 'text-amber-700',
      iconBg: 'bg-amber-100',
      countBg: 'bg-amber-100 text-amber-700 border border-amber-200',
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      headerBorder: 'border-red-200',
      title: 'text-red-700',
      iconBg: 'bg-red-100',
      countBg: 'bg-red-100 text-red-700 border border-red-200',
    },
  };

  const style = styles[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      className={`rounded-2xl ${style.bg} border ${style.border} overflow-hidden shadow-sm`}
    >
      {/* Section header with distinct styling */}
      <div className={`flex items-center gap-3 px-4 py-3 border-b ${style.headerBorder}`}>
        <div className={`w-8 h-8 rounded-lg ${style.iconBg} flex items-center justify-center`}>
          {icon}
        </div>
        <div className="flex-1">
          <span className={`text-base font-semibold ${style.title}`}>{title}</span>
          {subtitle && (
            <span className="block text-xs text-gray-500 mt-0.5">{subtitle}</span>
          )}
        </div>
        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${style.countBg}`}>
          {count}
        </span>
      </div>

      {/* Actions with proper spacing */}
      <div className="p-4 space-y-3">
        {children}
      </div>
    </motion.div>
  );
}

/**
 * FollowUpSuggestions - Quick action suggestions after execution
 */
interface FollowUpSuggestionsProps {
  suggestions: FollowUpSuggestion[];
  onSelect: (prefillCommand: string) => void;
}

function FollowUpSuggestions({ suggestions, onSelect }: FollowUpSuggestionsProps) {
  if (suggestions.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="pt-4 border-t border-gray-200"
    >
      <p className="text-xs text-gray-500 mb-3">Would you also like to:</p>
      <div className="flex flex-wrap gap-2.5">
        {suggestions.map((suggestion) => (
          <motion.button
            key={suggestion.id}
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(suggestion.prefillCommand)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-accent-50 text-accent-700
              rounded-xl border border-accent-200 shadow-sm
              hover:bg-accent-100 hover:shadow-md hover:border-accent-300
              transition-all duration-200"
            title={suggestion.description}
          >
            <span>{suggestion.label}</span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

// Compact summary for completed AI responses
export function AIResponseSummary({ actions }: { actions: ExtractedAction[] }) {
  const executed = actions.filter((a) => a.status === 'executed').length;
  const rejected = actions.filter((a) => a.status === 'rejected').length;
  const undone = actions.filter((a) => a.status === 'undone').length;

  return (
    <div className="flex items-center gap-3 text-xs">
      {executed > 0 && (
        <span className="inline-flex items-center gap-1 text-green-600">
          <Check className="w-3 h-3" />
          {executed} executed
        </span>
      )}
      {rejected > 0 && (
        <span className="inline-flex items-center gap-1 text-gray-500">
          <X className="w-3 h-3" />
          {rejected} skipped
        </span>
      )}
      {undone > 0 && (
        <span className="inline-flex items-center gap-1 text-amber-600">
          {undone} undone
        </span>
      )}
    </div>
  );
}

export default AIResponse;
