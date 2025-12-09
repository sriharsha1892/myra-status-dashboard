/**
 * ActionClarificationCard - UI for action-level clarification questions
 *
 * Displays when the AI detects ambiguity about the intended action
 * and needs user input to refine the command before execution.
 */

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { HelpCircle, ChevronRight, MessageSquare } from 'lucide-react';
import type { ClarificationQuestion, ClarificationOption } from '@/lib/command/clarificationEngine';

interface ActionClarificationCardProps {
  questions: ClarificationQuestion[];
  onAnswer: (answers: Record<string, string | ClarificationOption>) => void;
  onSkip?: () => void;
}

export function ActionClarificationCard({
  questions,
  onAnswer,
  onSkip,
}: ActionClarificationCardProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | ClarificationOption>>({});
  const [freeTextValues, setFreeTextValues] = useState<Record<string, string>>({});

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  const handleOptionSelect = (option: ClarificationOption) => {
    const newAnswers = { ...answers, [currentQuestion.id]: option };
    setAnswers(newAnswers);

    // Include free text if provided
    const freeText = freeTextValues[currentQuestion.id];
    if (freeText && currentQuestion.freeTextField) {
      newAnswers[`${currentQuestion.id}_freetext`] = freeText;
    }

    if (isLastQuestion) {
      onAnswer(newAnswers);
    } else {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handleFreeTextSubmit = () => {
    const freeText = freeTextValues[currentQuestion.id];
    if (!freeText?.trim()) return;

    const newAnswers = { ...answers, [currentQuestion.id]: freeText };
    setAnswers(newAnswers);

    if (isLastQuestion) {
      onAnswer(newAnswers);
    } else {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  if (!currentQuestion) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      className="rounded-2xl border border-amber-200 bg-amber-50 shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-amber-200 bg-amber-100/50">
        <div className="w-8 h-8 rounded-lg bg-amber-200 flex items-center justify-center">
          <HelpCircle className="w-4 h-4 text-amber-700" />
        </div>
        <div className="flex-1">
          <span className="text-sm font-semibold text-amber-800">Need a bit more info</span>
          {questions.length > 1 && (
            <span className="block text-xs text-amber-600 mt-0.5">
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
          )}
        </div>
        {onSkip && (
          <button
            onClick={onSkip}
            className="text-xs text-amber-600 hover:text-amber-800 transition-colors"
          >
            Skip
          </button>
        )}
      </div>

      {/* Question */}
      <div className="p-4">
        <p className="text-sm font-medium text-gray-900 mb-4">
          {currentQuestion.question}
        </p>

        {/* Options */}
        <div className="space-y-2">
          {currentQuestion.options.map((option) => (
            <motion.button
              key={option.id}
              whileHover={{ scale: 1.01, x: 2 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => handleOptionSelect(option)}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-200
                hover:border-accent-300 hover:bg-accent-50 hover:shadow-sm
                transition-all duration-200 text-left group"
            >
              <div className="w-5 h-5 rounded-full border-2 border-gray-300 group-hover:border-accent-500
                flex items-center justify-center transition-colors">
                <div className="w-2 h-2 rounded-full bg-transparent group-hover:bg-accent-500 transition-colors" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-gray-900 block">
                  {option.label}
                </span>
                {option.description && (
                  <span className="text-xs text-gray-500 block mt-0.5">
                    {option.description}
                  </span>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-accent-500 transition-colors" />
            </motion.button>
          ))}
        </div>

        {/* Free text input */}
        {currentQuestion.allowFreeText && (
          <div className="mt-4 pt-4 border-t border-amber-200">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500">Or type your own:</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={freeTextValues[currentQuestion.id] || ''}
                onChange={(e) =>
                  setFreeTextValues({
                    ...freeTextValues,
                    [currentQuestion.id]: e.target.value,
                  })
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleFreeTextSubmit();
                  }
                }}
                placeholder={currentQuestion.freeTextPlaceholder || 'Type here...'}
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200
                  focus:border-accent-400 focus:ring-2 focus:ring-accent-100
                  transition-all duration-200 outline-none"
              />
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleFreeTextSubmit}
                disabled={!freeTextValues[currentQuestion.id]?.trim()}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-accent-600 text-white
                  hover:bg-accent-500 disabled:bg-gray-200 disabled:text-gray-400
                  transition-all duration-200"
              >
                Continue
              </motion.button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default ActionClarificationCard;
