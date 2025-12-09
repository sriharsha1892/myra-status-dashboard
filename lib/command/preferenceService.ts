/**
 * Preference Service
 * Tracks command execution history and provides adaptive thresholds
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { CONFIDENCE_THRESHOLDS, type ConfidenceTier } from './types';

// Default thresholds
const DEFAULT_HIGH_THRESHOLD = CONFIDENCE_THRESHOLDS.HIGH; // 0.90
const ADJUSTED_HIGH_THRESHOLD = 0.85; // For power users

// Minimum commands before threshold adjustment
const MIN_COMMANDS_FOR_ADJUSTMENT = 20;
const MIN_SUCCESS_RATE_FOR_ADJUSTMENT = 0.95;

/**
 * User preference data
 */
export interface UserPreferences {
  userId: string;
  totalCommands: number;
  successfulCommands: number;
  successRate: number;
  autoExecuteThreshold: number;
  thresholdAdjusted: boolean;
  frequentOrgs: Array<{
    orgId: string;
    orgName: string;
    count: number;
    lastUsed: string;
  }>;
}

/**
 * Execution record for tracking
 */
export interface ExecutionRecord {
  userId: string;
  orgId?: string;
  orgName?: string;
  action: string;
  commandText: string;
  confidence: number;
  confidenceTier: ConfidenceTier;
  autoExecuted: boolean;
  success: boolean;
  executionTimeMs?: number;
  errorMessage?: string;
}

/**
 * Get user's auto-execute threshold from database
 */
export async function getUserThreshold(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  try {
    const { data, error } = await supabase
      .rpc('get_user_auto_execute_threshold', { p_user_id: userId });

    if (error) {
      console.warn('Failed to get user threshold, using default:', error);
      return DEFAULT_HIGH_THRESHOLD;
    }

    return data ?? DEFAULT_HIGH_THRESHOLD;
  } catch (error) {
    console.warn('Error getting user threshold:', error);
    return DEFAULT_HIGH_THRESHOLD;
  }
}

/**
 * Record a command execution
 */
export async function recordExecution(
  supabase: SupabaseClient,
  record: ExecutionRecord
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .rpc('record_command_execution', {
        p_user_id: record.userId,
        p_org_id: record.orgId || null,
        p_org_name: record.orgName || null,
        p_action: record.action,
        p_command_text: record.commandText,
        p_confidence: record.confidence,
        p_confidence_tier: record.confidenceTier,
        p_auto_executed: record.autoExecuted,
        p_success: record.success,
        p_execution_time_ms: record.executionTimeMs || null,
        p_error_message: record.errorMessage || null,
      });

    if (error) {
      console.warn('Failed to record execution:', error);
      return null;
    }

    // Check if threshold should be adjusted
    await maybeAdjustThreshold(supabase, record.userId);

    return data;
  } catch (error) {
    console.warn('Error recording execution:', error);
    return null;
  }
}

/**
 * Check and potentially adjust user's threshold
 */
async function maybeAdjustThreshold(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  try {
    await supabase.rpc('maybe_adjust_threshold', { p_user_id: userId });
  } catch (error) {
    console.warn('Error adjusting threshold:', error);
  }
}

/**
 * Update user's frequent orgs
 */
export async function updateFrequentOrgs(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  try {
    await supabase.rpc('update_user_frequent_orgs', { p_user_id: userId });
  } catch (error) {
    console.warn('Error updating frequent orgs:', error);
  }
}

/**
 * Get user preferences
 */
export async function getUserPreferences(
  supabase: SupabaseClient,
  userId: string
): Promise<UserPreferences | null> {
  try {
    const { data, error } = await supabase
      .from('command_user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      userId: data.user_id,
      totalCommands: data.total_commands || 0,
      successfulCommands: data.successful_commands || 0,
      successRate: data.success_rate || 0,
      autoExecuteThreshold: data.auto_execute_threshold || DEFAULT_HIGH_THRESHOLD,
      thresholdAdjusted: !!data.threshold_adjusted_at,
      frequentOrgs: data.frequent_orgs || [],
    };
  } catch (error) {
    console.warn('Error getting user preferences:', error);
    return null;
  }
}

/**
 * Get confidence boost for frequent orgs
 * Returns a boost (0-0.05) if org is in user's frequent orgs
 */
export function getFrequentOrgBoost(
  preferences: UserPreferences | null,
  orgId: string
): number {
  if (!preferences || !orgId) return 0;

  const frequentOrg = preferences.frequentOrgs.find(o => o.orgId === orgId);
  if (!frequentOrg) return 0;

  // Scale boost based on usage count (max 0.05 for very frequent orgs)
  const count = frequentOrg.count;
  if (count >= 10) return 0.05;
  if (count >= 5) return 0.04;
  if (count >= 3) return 0.03;
  return 0.02;
}

/**
 * Determine if command should auto-execute based on user preferences
 */
export function shouldAutoExecute(
  combinedConfidence: number,
  userThreshold: number
): boolean {
  return combinedConfidence >= userThreshold;
}

/**
 * Get execution statistics for a user
 */
export async function getExecutionStats(
  supabase: SupabaseClient,
  userId: string,
  days: number = 30
): Promise<{
  totalCommands: number;
  successRate: number;
  autoExecuteRate: number;
  byAction: Record<string, number>;
  byOrg: Array<{ orgName: string; count: number }>;
}> {
  try {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data, error } = await supabase
      .from('command_execution_history')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', since.toISOString());

    if (error || !data) {
      return {
        totalCommands: 0,
        successRate: 0,
        autoExecuteRate: 0,
        byAction: {},
        byOrg: [],
      };
    }

    const totalCommands = data.length;
    const successfulCommands = data.filter(d => d.success).length;
    const autoExecuted = data.filter(d => d.auto_executed).length;

    // Group by action
    const byAction: Record<string, number> = {};
    data.forEach(d => {
      byAction[d.action] = (byAction[d.action] || 0) + 1;
    });

    // Group by org
    const orgCounts: Record<string, { name: string; count: number }> = {};
    data.forEach(d => {
      if (d.org_id && d.org_name) {
        if (!orgCounts[d.org_id]) {
          orgCounts[d.org_id] = { name: d.org_name, count: 0 };
        }
        orgCounts[d.org_id].count++;
      }
    });

    const byOrg = Object.values(orgCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(o => ({ orgName: o.name, count: o.count }));

    return {
      totalCommands,
      successRate: totalCommands > 0 ? successfulCommands / totalCommands : 0,
      autoExecuteRate: totalCommands > 0 ? autoExecuted / totalCommands : 0,
      byAction,
      byOrg,
    };
  } catch (error) {
    console.warn('Error getting execution stats:', error);
    return {
      totalCommands: 0,
      successRate: 0,
      autoExecuteRate: 0,
      byAction: {},
      byOrg: [],
    };
  }
}

/**
 * In-memory cache for user thresholds (5 minute TTL)
 */
const thresholdCache = new Map<string, { threshold: number; expires: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached threshold or fetch from database
 */
export async function getCachedUserThreshold(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const cached = thresholdCache.get(userId);
  const now = Date.now();

  if (cached && cached.expires > now) {
    return cached.threshold;
  }

  const threshold = await getUserThreshold(supabase, userId);
  thresholdCache.set(userId, {
    threshold,
    expires: now + CACHE_TTL_MS,
  });

  return threshold;
}

/**
 * Clear threshold cache for a user (after adjustment)
 */
export function clearThresholdCache(userId: string): void {
  thresholdCache.delete(userId);
}
