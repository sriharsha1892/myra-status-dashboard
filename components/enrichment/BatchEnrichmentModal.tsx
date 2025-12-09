'use client';

/**
 * BatchEnrichmentModal - Modal wrapper for batch enrichment workflow
 *
 * Opens when user selects organizations and clicks "Enrich Data" button.
 * Uses useEnrichment hook to fetch questions and renders BatchEnrichmentPanel.
 */

import { useState, useEffect, useCallback } from 'react';
import { X, Loader2, CheckCircle, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { BatchEnrichmentPanel } from './BatchEnrichmentPanel';
import { useEnrichment } from '@/hooks/useEnrichment';
import { EnrichmentProgressRing } from './EnrichmentProgressRing';

interface BatchEnrichmentModalProps {
  orgIds: string[];
  orgNames: Map<string, string>;
  onClose: () => void;
  onComplete: () => void;
}

export function BatchEnrichmentModal({
  orgIds,
  orgNames,
  onClose,
  onComplete,
}: BatchEnrichmentModalProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [completedQuestions, setCompletedQuestions] = useState<Set<string>>(new Set());

  const {
    questions,
    completenessScore,
    sessionId,
    isLoading,
    error,
    fetchQuestions,
    submitAnswer,
    skipQuestion,
    completeSession,
  } = useEnrichment({
    entityIds: orgIds,
    entityType: 'organization',
    userRole: 'admin',
    onComplete,
  });

  // Fetch questions when modal opens
  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  // Get entity names for display
  const getEntityWithNames = useCallback(() => {
    if (!questions[currentQuestionIndex]) return [];
    return questions[currentQuestionIndex].entities.map((entity) => ({
      ...entity,
      name: orgNames.get(entity.id) || entity.name || entity.id,
    }));
  }, [questions, currentQuestionIndex, orgNames]);

  // Handle answer submission
  const handleAnswer = useCallback(async (entityIds: string[], value: string) => {
    await submitAnswer(
      questions[currentQuestionIndex].id,
      entityIds,
      value,
      false
    );
  }, [submitAnswer, questions, currentQuestionIndex]);

  // Handle skip
  const handleSkip = useCallback(async (entityIds: string[]) => {
    await skipQuestion(questions[currentQuestionIndex].id, entityIds);
  }, [skipQuestion, questions, currentQuestionIndex]);

  // Mark question as completed and move to next
  const handleQuestionComplete = useCallback(() => {
    const questionId = questions[currentQuestionIndex]?.id;
    if (questionId) {
      setCompletedQuestions((prev) => new Set(prev).add(questionId));
    }

    // Move to next unanswered question
    const nextIndex = questions.findIndex(
      (q, i) => i > currentQuestionIndex && !completedQuestions.has(q.id)
    );

    if (nextIndex >= 0) {
      setCurrentQuestionIndex(nextIndex);
    } else if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  }, [questions, currentQuestionIndex, completedQuestions]);

  // Handle finish
  const handleFinish = async () => {
    await completeSession();
  };

  // Current question with updated entity names
  const currentQuestion = questions[currentQuestionIndex]
    ? {
        ...questions[currentQuestionIndex],
        entities: getEntityWithNames(),
      }
    : null;

  const remainingQuestions = questions.filter((q) => !completedQuestions.has(q.id)).length;
  const progress = questions.length > 0
    ? Math.round(((questions.length - remainingQuestions) / questions.length) * 100)
    : 0;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-violet-50 to-purple-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-100 rounded-lg">
              <Sparkles className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Complete Organization Data</h2>
              <p className="text-sm text-gray-600">
                {orgIds.length} organization{orgIds.length !== 1 ? 's' : ''} selected
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-violet-600 animate-spin mb-4" />
              <p className="text-gray-600">Analyzing data completeness...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="p-4 bg-red-50 text-red-700 rounded-lg text-center">
                <p className="font-medium">Failed to load questions</p>
                <p className="text-sm mt-1">{error}</p>
                <button
                  onClick={() => fetchQuestions()}
                  className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {!isLoading && !error && questions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="p-4 bg-emerald-50 rounded-full mb-4">
                <CheckCircle className="w-12 h-12 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">All Data Complete!</h3>
              <p className="text-gray-600 text-center max-w-md">
                The selected organizations have all their key data fields filled in.
              </p>
              <button
                onClick={onClose}
                className="mt-6 px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700"
              >
                Done
              </button>
            </div>
          )}

          {!isLoading && !error && questions.length > 0 && currentQuestion && (
            <div className="space-y-4">
              {/* Question Navigation */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                    disabled={currentQuestionIndex === 0}
                    className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-sm text-gray-600">
                    Question {currentQuestionIndex + 1} of {questions.length}
                  </span>
                  <button
                    onClick={() => setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))}
                    disabled={currentQuestionIndex === questions.length - 1}
                    className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                {/* Question Pills */}
                <div className="flex items-center gap-1">
                  {questions.map((q, idx) => (
                    <button
                      key={q.id}
                      onClick={() => setCurrentQuestionIndex(idx)}
                      className={`w-2.5 h-2.5 rounded-full transition-colors ${
                        completedQuestions.has(q.id)
                          ? 'bg-emerald-500'
                          : idx === currentQuestionIndex
                            ? 'bg-violet-500'
                            : 'bg-gray-300'
                      }`}
                      title={q.label}
                    />
                  ))}
                </div>
              </div>

              {/* Batch Panel */}
              <BatchEnrichmentPanel
                question={currentQuestion}
                sessionId={sessionId}
                onAnswer={async (entityIds, value) => {
                  await handleAnswer(entityIds, value);
                  handleQuestionComplete();
                }}
                onSkip={async (entityIds) => {
                  await handleSkip(entityIds);
                  handleQuestionComplete();
                }}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        {!isLoading && !error && questions.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center gap-4">
              <EnrichmentProgressRing progress={progress} size={40} strokeWidth={4} />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {completedQuestions.size} of {questions.length} questions answered
                </p>
                <p className="text-xs text-gray-500">
                  Completeness: {completenessScore}%
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleFinish}
                className="px-6 py-2 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 transition-colors"
              >
                Finish Enrichment
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default BatchEnrichmentModal;
