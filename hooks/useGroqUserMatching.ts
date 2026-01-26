import { useQuery } from '@tanstack/react-query';
import type { MatchResult, GroqMatcherResponse } from '@/lib/parsers/groq-user-matcher';

interface Organization {
  id: string;
  org_name: string;
}

interface GroqMatchInput {
  userNames: string[];
  organizations: Organization[];
}

// Query keys factory
export const groqMatchingKeys = {
  all: ['groq-user-match'] as const,
  match: (userNames: string[]) => [...groqMatchingKeys.all, 'match', userNames.sort().join(',')] as const,
};

// Fetch Groq matches
async function fetchGroqMatches(input: GroqMatchInput): Promise<GroqMatcherResponse> {
  const response = await fetch('/api/reporting/match-users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userNames: input.userNames,
      organizations: input.organizations.map(o => ({
        id: o.id,
        name: o.org_name,
      })),
    }),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error);
  }

  return data;
}

/**
 * Hook for AI-powered user-to-organization matching using Groq
 * Returns matches with confidence scores for display in UsageReviewModal
 */
export function useGroqUserMatching(
  userNames: string[],
  organizations: Organization[],
  enabled = true
) {
  return useQuery({
    queryKey: groqMatchingKeys.match(userNames),
    queryFn: () => fetchGroqMatches({ userNames, organizations }),
    enabled: enabled && userNames.length > 0 && organizations.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    retry: 1, // Only retry once for AI calls
  });
}

/**
 * Get confidence badge color based on score
 * Green >= 85, Yellow 70-84, Red < 70
 */
export function getConfidenceBadgeColor(confidence: number): {
  bg: string;
  text: string;
  border: string;
} {
  if (confidence >= 85) {
    return {
      bg: 'bg-emerald-100',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
    };
  }
  if (confidence >= 70) {
    return {
      bg: 'bg-amber-100',
      text: 'text-amber-700',
      border: 'border-amber-200',
    };
  }
  return {
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-200',
  };
}

/**
 * Format confidence as a percentage string
 */
export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence)}%`;
}

export type { MatchResult, GroqMatcherResponse };
