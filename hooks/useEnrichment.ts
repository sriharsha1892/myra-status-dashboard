'use client';

/**
 * useEnrichment - Hook for managing enrichment flow state
 */

import { useState, useCallback } from 'react';
import type { QuestionWithContext, AnalyzeResponse, EntityType, UserRole } from '@/lib/enrichment/types';

interface UseEnrichmentOptions {
  entityIds: string[];
  entityType: EntityType;
  userRole?: UserRole;
  onComplete?: () => void;
}

interface UseEnrichmentReturn {
  questions: QuestionWithContext[];
  completenessScore: number;
  sessionId: string;
  isLoading: boolean;
  error: string | null;
  isEnrichmentAvailable: boolean;
  fetchQuestions: () => Promise<void>;
  submitAnswer: (questionId: string, entityIds: string[], value: string, applyToAll: boolean) => Promise<void>;
  skipQuestion: (questionId: string, entityIds: string[]) => Promise<void>;
  completeSession: () => Promise<void>;
}

export function useEnrichment({
  entityIds,
  entityType,
  userRole = 'admin',
  onComplete,
}: UseEnrichmentOptions): UseEnrichmentReturn {
  const [questions, setQuestions] = useState<QuestionWithContext[]>([]);
  const [completenessScore, setCompletenessScore] = useState(0);
  const [sessionId, setSessionId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEnrichmentAvailable = entityIds.length > 0;

  const fetchQuestions = useCallback(async () => {
    if (!isEnrichmentAvailable) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/enrichment/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityIds,
          entityType,
          userRole,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze entities');
      }

      const data: AnalyzeResponse = await response.json();
      setQuestions(data.questions);
      setCompletenessScore(data.completenessScore);
      setSessionId(data.sessionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [entityIds, entityType, userRole, isEnrichmentAvailable]);

  const submitAnswer = useCallback(async (
    questionId: string,
    answerEntityIds: string[],
    value: string,
    applyToAll: boolean
  ) => {
    try {
      const response = await fetch('/api/enrichment/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          questionId,
          entityIds: answerEntityIds,
          value,
          source: 'manual',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit answer');
      }

      const data = await response.json();
      if (data.newCompletenessScore !== undefined) {
        setCompletenessScore(data.newCompletenessScore);
      }
    } catch (err) {
      console.error('Answer submission error:', err);
      throw err;
    }
  }, [sessionId]);

  const skipQuestion = useCallback(async (
    questionId: string,
    skipEntityIds: string[]
  ) => {
    try {
      await fetch('/api/enrichment/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'skip',
          sessionId,
          questionId,
          entityIds: skipEntityIds,
          entityType,
        }),
      });
    } catch (err) {
      console.error('Skip error:', err);
    }
  }, [sessionId, entityType]);

  const completeSession = useCallback(async () => {
    try {
      await fetch('/api/enrichment/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete',
          sessionId,
          completenessAfter: completenessScore,
        }),
      });
      onComplete?.();
    } catch (err) {
      console.error('Complete session error:', err);
    }
  }, [sessionId, completenessScore, onComplete]);

  return {
    questions,
    completenessScore,
    sessionId,
    isLoading,
    error,
    isEnrichmentAvailable,
    fetchQuestions,
    submitAnswer,
    skipQuestion,
    completeSession,
  };
}

export default useEnrichment;
