'use client';

/**
 * EnrichmentQuestion - Single question row with inline expansion
 * Linear-style list item with smooth state transitions
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, SkipForward, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EnrichmentChoiceChips } from './EnrichmentChoiceChips';
import { questionVariants, checkmarkVariants, hoverRevealVariants } from './animations';
import type { QuestionWithContext } from '@/lib/enrichment/types';

interface EnrichmentQuestionProps {
  question: QuestionWithContext;
  index: number;
  isFocused: boolean;
  isCompleted: boolean;
  selectedChoiceIndex: number;
  onFocus: () => void;
  onChoiceSelect: (index: number) => void;
  onConfirm: () => void;
  onSkip: () => void;
  disabled?: boolean;
}

export function EnrichmentQuestion({
  question,
  index,
  isFocused,
  isCompleted,
  selectedChoiceIndex,
  onFocus,
  onChoiceSelect,
  onConfirm,
  onSkip,
  disabled = false,
}: EnrichmentQuestionProps) {
  const [isHovered, setIsHovered] = useState(false);
  const showActions = (isHovered || isFocused) && !isCompleted && !disabled;
  const showChips = isFocused && !isCompleted && question.options;

  // Auto-select AI suggestion if available and no selection yet
  useEffect(() => {
    if (isFocused && selectedChoiceIndex < 0 && question.aiSuggestion && question.options) {
      const suggestedIndex = question.options.findIndex(
        (opt) => opt.value === question.aiSuggestion?.value
      );
      if (suggestedIndex >= 0 && question.aiSuggestion.confidence >= 0.6) {
        onChoiceSelect(suggestedIndex);
      }
    }
  }, [isFocused, selectedChoiceIndex, question.aiSuggestion, question.options, onChoiceSelect]);

  return (
    <motion.div
      variants={questionVariants}
      animate={isCompleted ? 'completed' : isFocused ? 'focused' : 'idle'}
      onClick={!isCompleted && !disabled ? onFocus : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'flex items-center gap-3 px-4 py-3 transition-colors border-b border-neutral-100 last:border-b-0',
        !isCompleted && !disabled && 'cursor-pointer',
        isFocused && !isCompleted && 'ring-1 ring-inset ring-neutral-200'
      )}
      role="option"
      aria-selected={isFocused}
      tabIndex={isFocused ? 0 : -1}
    >
      {/* Status/Checkmark Indicator */}
      <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
        {isCompleted ? (
          <motion.svg
            viewBox="0 0 20 20"
            className="w-5 h-5 text-emerald-500"
            initial="hidden"
            animate="visible"
          >
            <motion.path
              d="M6 10l3 3 5-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              variants={checkmarkVariants}
            />
          </motion.svg>
        ) : (
          <span
            className={cn(
              'text-xs font-medium tabular-nums',
              isFocused ? 'text-neutral-700' : 'text-neutral-400'
            )}
          >
            {index + 1}
          </span>
        )}
      </div>

      {/* Question Label & Entity Count */}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'text-sm truncate',
              isCompleted ? 'text-emerald-700' : 'text-neutral-900',
              isFocused && !isCompleted && 'font-medium'
            )}
          >
            {question.label}
          </span>
          <span className="flex-shrink-0 text-[10px] text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded">
            {question.entities.length}{' '}
            {question.entityType === 'organization' ? 'org' : 'contact'}
            {question.entities.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* AI Suggestion Banner - shown when focused and high confidence suggestion exists */}
        <AnimatePresence>
          {isFocused && !isCompleted && question.aiSuggestion && question.aiSuggestion.confidence >= 0.6 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-2 py-1"
            >
              <div className="flex items-center gap-1.5 px-2 py-1 bg-violet-50 border border-violet-200 rounded-md">
                <Sparkles className="w-3 h-3 text-violet-600" />
                <span className="text-xs text-violet-700">
                  AI suggests: <strong>{question.options?.find(o => o.value === question.aiSuggestion?.value)?.label || question.aiSuggestion.value}</strong>
                </span>
                <span className="text-[10px] text-violet-500">
                  ({Math.round(question.aiSuggestion.confidence * 100)}%)
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const suggestedIndex = question.options?.findIndex(o => o.value === question.aiSuggestion?.value) ?? -1;
                  if (suggestedIndex >= 0) {
                    onChoiceSelect(suggestedIndex);
                    // Small delay then confirm
                    setTimeout(() => onConfirm(), 100);
                  }
                }}
                className="px-2 py-0.5 text-[10px] font-medium text-violet-700 bg-violet-100 hover:bg-violet-200 rounded transition-colors"
              >
                Accept
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Choice Chips (visible when focused) */}
      <AnimatePresence>
        {showChips && question.options && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.15 }}
          >
            <EnrichmentChoiceChips
              options={question.options}
              selectedIndex={selectedChoiceIndex}
              onSelect={onChoiceSelect}
              aiSuggestion={question.aiSuggestion}
              disabled={disabled}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hover/Focus Actions */}
      <AnimatePresence>
        {showActions && (
          <motion.div
            variants={hoverRevealVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="flex items-center gap-1 flex-shrink-0"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSkip();
              }}
              className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded transition-colors"
              title="Skip (s)"
              disabled={disabled}
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onConfirm();
              }}
              disabled={selectedChoiceIndex < 0 || disabled}
              className={cn(
                'p-1.5 rounded transition-colors',
                selectedChoiceIndex >= 0
                  ? 'text-blue-600 hover:bg-blue-50'
                  : 'text-neutral-300 cursor-not-allowed'
              )}
              title="Confirm (Enter)"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default EnrichmentQuestion;
