import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ParsedUsageEntry } from '@/lib/parsers/myra-usage-parser';

export interface EnrichedUsageEntry extends ParsedUsageEntry {
  matched_user_id: string | null;
  matched_org_id: string | null;
  match_confidence: 'high' | 'low' | 'none';
  suggested_org_name: string | null;
}

export interface ParseResponse {
  success: boolean;
  entries: EnrichedUsageEntry[];
  summary: {
    totalParsed: number;
    totalCost: number;
    uniqueUsers: number;
    matchedUsers: number;
    unmatchedUsers: number;
    dateRange: {
      earliest: string | null;
      latest: string | null;
    };
  };
  aggregations: {
    byUser: Array<{
      user_name: string;
      conversation_count: number;
      total_cost: number;
      first_usage: string;
      last_usage: string;
    }>;
    byDate: Array<{
      date: string;
      conversation_count: number;
      total_cost: number;
      unique_users: number;
    }>;
  };
  errors: string[];
}

export interface UsageStats {
  summary: {
    total_conversations: number;
    total_cost: number;
    total_users: number;
    total_orgs: number;
    conversations_last_7_days: number;
    cost_last_7_days: number;
    conversations_last_30_days: number;
    cost_last_30_days: number;
  };
  byDate: Array<{
    usage_date: string;
    conversation_count: number;
    total_cost: number;
    unique_users: number;
    matched_org_id: string | null;
  }>;
  topUsers: Array<{
    user_name: string;
    conversation_count: number;
    total_cost: number;
    matched_org_id: string | null;
    org_name: string | null;
  }>;
}

/**
 * Parse usage text
 */
async function parseUsageText(text: string): Promise<ParseResponse> {
  const response = await fetch('/api/reporting/parse-usage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to parse usage text');
  }

  return response.json();
}

/**
 * Save parsed entries to database
 */
async function saveUsageEntries(
  entries: Array<{
    conversation_title: string;
    user_name: string;
    timestamp: string;
    cost: number;
    matched_user_id: string | null;
    matched_org_id: string | null;
    match_method: 'auto' | 'manual';
  }>
): Promise<{ success: boolean; batchId: string; entriesSaved: number }> {
  const response = await fetch('/api/reporting/parse-usage', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entries }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to save usage entries');
  }

  return response.json();
}

/**
 * Fetch usage stats
 */
async function fetchUsageStats(days: number = 30): Promise<UsageStats> {
  const response = await fetch(`/api/reporting/parse-usage?days=${days}`);

  if (!response.ok) {
    throw new Error('Failed to fetch usage stats');
  }

  return response.json();
}

/**
 * Hook for parsing usage text
 */
export function useParseUsage() {
  return useMutation({
    mutationFn: parseUsageText,
  });
}

/**
 * Hook for saving usage entries
 */
export function useSaveUsageEntries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveUsageEntries,
    onSuccess: () => {
      // Invalidate usage stats queries
      queryClient.invalidateQueries({ queryKey: ['myra-usage-stats'] });
    },
  });
}

/**
 * Hook for fetching usage stats
 */
export function useUsageStats(days: number = 30) {
  return useQuery({
    queryKey: ['myra-usage-stats', days],
    queryFn: () => fetchUsageStats(days),
    staleTime: 60_000, // 1 minute
    refetchOnWindowFocus: false,
  });
}
