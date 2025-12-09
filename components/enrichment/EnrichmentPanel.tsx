'use client';

/**
 * EnrichmentPanel - Main enrichment UI container
 * Linear/Asana hybrid: List view with smooth transitions
 */

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { EnrichmentProgressRing } from './EnrichmentProgressRing';
import { EnrichmentQuestion } from './EnrichmentQuestion';
import { useKeyboardNav } from './useKeyboardNav';
import { listContainerVariants, listItemVariants } from './animations';
import type { QuestionWithContext } from '@/lib/enrichment/types';

interface EnrichmentPanelProps {
  questions: QuestionWithContext[];
  completenessScore: number;
  sessionId: string;
  onAnswer: (questionId: string, entityIds: string[], value: string, applyToAll: boolean) => Promise<void>;
  onSkip: (questionId: string, entityIds: string[]) => Promise<void>;
  onComplete: () => void;
  isLoading?: boolean;
}

export function EnrichmentPanel({
  questions,
  completenessScore: initialScore,
  sessionId,
  onAnswer,
  onSkip,
  onComplete,
  isLoading = false,
}: EnrichmentPanelProps) {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [selectedChoiceIndex, setSelectedChoiceIndex] = useState(-1);
  const [completedQuestions, setCompletedQuestions] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [completenessScore, setCompletenessScore] = useState(initialScore);
  const [previousScore, setPreviousScore] = useState<number | undefined>(undefined);

  const currentQuestion = questions[focusedIndex];
  const choiceCount = currentQuestion?.options?.length || 0;
  const remainingQuestions = questions.filter((q) => !completedQuestions.has(q.id));
  const answeredCount = completedQuestions.size;

  // Handle confirm action
  const handleConfirm = useCallback(async () => {
    if (!currentQuestion || selectedChoiceIndex < 0) return;
    const option = currentQuestion.options?.[selectedChoiceIndex];
    if (!option) return;

    setSubmitting(true);
    try {
      const entityIds = currentQuestion.entities.map((e) => e.id);
      await onAnswer(currentQuestion.id, entityIds, option.value, true);

      // Mark as completed
      setCompletedQuestions((prev) => new Set(prev).add(currentQuestion.id));
      setSelectedChoiceIndex(-1);

      // Update score with animation
      const scoreIncrease = Math.min(
        100 - completenessScore,
        Math.round(currentQuestion.weight * (entityIds.length / currentQuestion.entities.length))
      );
      setPreviousScore(completenessScore);
      setCompletenessScore((prev) => Math.min(100, prev + scoreIncrease));

      // Move to next incomplete question
      const nextIndex = questions.findIndex(
        (q, i) => i > focusedIndex && !completedQuestions.has(q.id) && q.id !== currentQuestion.id
      );
      if (nextIndex !== -1) {
        setFocusedIndex(nextIndex);
      } else if (remainingQuestions.length <= 1) {
        // All done
        onComplete();
      }
    } finally {
      setSubmitting(false);
    }
  }, [
    currentQuestion,
    selectedChoiceIndex,
    focusedIndex,
    questions,
    completedQuestions,
    remainingQuestions.length,
    completenessScore,
    onAnswer,
    onComplete,
  ]);

  // Handle skip action
  const handleSkip = useCallback(async () => {
    if (!currentQuestion) return;

    setSubmitting(true);
    try {
      const entityIds = currentQuestion.entities.map((e) => e.id);
      await onSkip(currentQuestion.id, entityIds);

      setCompletedQuestions((prev) => new Set(prev).add(currentQuestion.id));
      setSelectedChoiceIndex(-1);

      // Move to next question
      const nextIndex = questions.findIndex(
        (q, i) => i > focusedIndex && !completedQuestions.has(q.id) && q.id !== currentQuestion.id
      );
      if (nextIndex !== -1) {
        setFocusedIndex(nextIndex);
      } else if (remainingQuestions.length <= 1) {
        onComplete();
      }
    } finally {
      setSubmitting(false);
    }
  }, [currentQuestion, focusedIndex, questions, completedQuestions, remainingQuestions.length, onSkip, onComplete]);

  // Keyboard navigation
  useKeyboardNav({
    questionCount: questions.length,
    currentIndex: focusedIndex,
    choiceCount,
    selectedChoiceIndex,
    isEnabled: !submitting && !isLoading,
    onNavigate: (index) => {
      // Only navigate to incomplete questions
      if (!completedQuestions.has(questions[index]?.id)) {
        setFocusedIndex(index);
        setSelectedChoiceIndex(-1);
      }
    },
    onChoiceSelect: setSelectedChoiceIndex,
    onConfirm: handleConfirm,
    onSkip: handleSkip,
  });

  // Focus first incomplete question on mount
  useEffect(() => {
    const firstIncomplete = questions.findIndex((q) => !completedQuestions.has(q.id));
    if (firstIncomplete >= 0 && firstIncomplete !== focusedIndex) {
      setFocusedIndex(firstIncomplete);
    }
  }, []);

  if (questions.length === 0) {
    return null;
  }

  const allComplete = remainingQuestions.length === 0;

  return (
    <div className="border-t border-neutral-200 bg-white">
      {/* Header with Progress Ring */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 bg-neutral-50">
        <div className="flex items-center gap-3">
          <EnrichmentProgressRing
            score={completenessScore}
            previousScore={previousScore}
            answeredCount={answeredCount}
            totalCount={questions.length}
          />
          <div>
            <p className="text-sm font-medium text-neutral-900">Complete Your Data</p>
            <p className="text-xs text-neutral-500">
              {allComplete
                ? 'All questions answered!'
                : `${remainingQuestions.length} question${remainingQuestions.length !== 1 ? 's' : ''} remaining`}
            </p>
          </div>
        </div>

        {/* Keyboard hints */}
        <div className="hidden sm:flex items-center gap-3 text-[10px] text-neutral-400">
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-neutral-100 border border-neutral-200 rounded font-mono">↑↓</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-neutral-100 border border-neutral-200 rounded font-mono">1-4</kbd>
            select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-neutral-100 border border-neutral-200 rounded font-mono">↵</kbd>
            confirm
          </span>
        </div>
      </div>

      {/* Question List */}
      <motion.div
        role="listbox"
        aria-label="Enrichment questions"
        variants={listContainerVariants}
        initial="hidden"
        animate="visible"
        className="divide-y divide-neutral-100"
      >
        <AnimatePresence mode="sync">
          {questions.map((question, index) => (
            <motion.div key={question.id} variants={listItemVariants} layout>
              <EnrichmentQuestion
                question={question}
                index={index}
                isFocused={focusedIndex === index}
                isCompleted={completedQuestions.has(question.id)}
                selectedChoiceIndex={focusedIndex === index ? selectedChoiceIndex : -1}
                onFocus={() => {
                  if (!completedQuestions.has(question.id)) {
                    setFocusedIndex(index);
                    setSelectedChoiceIndex(-1);
                  }
                }}
                onChoiceSelect={setSelectedChoiceIndex}
                onConfirm={handleConfirm}
                onSkip={handleSkip}
                disabled={submitting || isLoading}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Completion Message */}
      <AnimatePresence>
        {allComplete && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-3 text-center bg-emerald-50 border-t border-emerald-100"
          >
            <p className="text-sm font-medium text-emerald-700">
              All enrichment questions completed!
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default EnrichmentPanel;
