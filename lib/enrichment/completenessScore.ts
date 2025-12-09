/**
 * Progressive Data Enrichment - Completeness Score Calculator
 */

import { ENRICHMENT_QUESTIONS, getTotalWeight } from './questions';
import type { CompletenessResult, FieldCompleteness } from './types';

// Threshold for unlocking insights
export const COMPLETENESS_UNLOCK_THRESHOLD = 80;

interface EntityData {
  id: string;
  [key: string]: unknown;
}

/**
 * Calculate completeness score for organizations
 */
export function calculateOrgCompleteness(orgs: EntityData[]): CompletenessResult {
  const orgQuestions = ENRICHMENT_QUESTIONS.filter(q => q.entityType === 'organization');
  const totalWeight = getTotalWeight('organization');

  const fieldBreakdown: FieldCompleteness[] = [];
  let weightedScore = 0;
  const missingCritical: string[] = [];

  for (const question of orgQuestions) {
    const filled = orgs.filter(org => {
      const value = org[question.targetField];
      return value !== null && value !== undefined && value !== '';
    }).length;

    const completionRate = orgs.length > 0 ? filled / orgs.length : 0;
    const weightedContribution = completionRate * question.weight;
    weightedScore += weightedContribution;

    fieldBreakdown.push({
      field: question.targetField,
      filled,
      total: orgs.length,
      weight: question.weight,
    });

    // Track missing critical fields
    if (question.priority === 'critical' && completionRate < 1) {
      missingCritical.push(question.label);
    }
  }

  const score = totalWeight > 0 ? Math.round((weightedScore / totalWeight) * 100) : 0;

  return {
    score: Math.min(100, Math.max(0, score)),
    fieldBreakdown,
    missingCritical,
  };
}

/**
 * Calculate completeness score for users/contacts
 */
export function calculateUserCompleteness(users: EntityData[]): CompletenessResult {
  const userQuestions = ENRICHMENT_QUESTIONS.filter(q => q.entityType === 'user');
  const totalWeight = getTotalWeight('user');

  const fieldBreakdown: FieldCompleteness[] = [];
  let weightedScore = 0;
  const missingCritical: string[] = [];

  for (const question of userQuestions) {
    const filled = users.filter(user => {
      const value = user[question.targetField];
      return value !== null && value !== undefined && value !== '';
    }).length;

    const completionRate = users.length > 0 ? filled / users.length : 0;
    const weightedContribution = completionRate * question.weight;
    weightedScore += weightedContribution;

    fieldBreakdown.push({
      field: question.targetField,
      filled,
      total: users.length,
      weight: question.weight,
    });

    if (question.priority === 'critical' && completionRate < 1) {
      missingCritical.push(question.label);
    }
  }

  const score = totalWeight > 0 ? Math.round((weightedScore / totalWeight) * 100) : 0;

  return {
    score: Math.min(100, Math.max(0, score)),
    fieldBreakdown,
    missingCritical,
  };
}

/**
 * Calculate combined completeness for both orgs and users
 */
export function calculateCombinedCompleteness(
  orgs: EntityData[],
  users: EntityData[]
): CompletenessResult {
  const orgResult = calculateOrgCompleteness(orgs);
  const userResult = calculateUserCompleteness(users);

  // Weight orgs more heavily if they exist
  const orgWeight = orgs.length > 0 ? 60 : 0;
  const userWeight = users.length > 0 ? 40 : 0;
  const totalWeight = orgWeight + userWeight;

  if (totalWeight === 0) {
    return {
      score: 0,
      fieldBreakdown: [],
      missingCritical: [],
    };
  }

  const combinedScore = Math.round(
    (orgResult.score * orgWeight + userResult.score * userWeight) / totalWeight
  );

  return {
    score: combinedScore,
    fieldBreakdown: [...orgResult.fieldBreakdown, ...userResult.fieldBreakdown],
    missingCritical: [...orgResult.missingCritical, ...userResult.missingCritical],
  };
}

/**
 * Check if completeness meets unlock threshold
 */
export function isUnlocked(score: number): boolean {
  return score >= COMPLETENESS_UNLOCK_THRESHOLD;
}

/**
 * Get human-readable completeness status
 */
export function getCompletenessStatus(score: number): {
  label: string;
  color: 'red' | 'amber' | 'emerald';
  description: string;
} {
  if (score >= COMPLETENESS_UNLOCK_THRESHOLD) {
    return {
      label: 'Complete',
      color: 'emerald',
      description: 'Insights unlocked!',
    };
  }
  if (score >= 50) {
    return {
      label: 'Progressing',
      color: 'amber',
      description: `${COMPLETENESS_UNLOCK_THRESHOLD - score}% more to unlock insights`,
    };
  }
  return {
    label: 'Needs Data',
    color: 'red',
    description: 'Add more details to unlock insights',
  };
}

/**
 * Calculate how many more answers needed to reach threshold
 */
export function answersToUnlock(
  currentScore: number,
  avgWeightPerAnswer: number = 15
): number {
  if (currentScore >= COMPLETENESS_UNLOCK_THRESHOLD) return 0;
  const pointsNeeded = COMPLETENESS_UNLOCK_THRESHOLD - currentScore;
  return Math.ceil(pointsNeeded / avgWeightPerAnswer);
}
