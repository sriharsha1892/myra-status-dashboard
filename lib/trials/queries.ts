import { createClient } from '@/lib/supabase/server';

export interface QueryStats {
  totalQueries: number;
  successfulQueries: number;
  failedQueries: number;
  averageConfidenceScore: number | null;
  averageResponseTime: number | null;
  queriesByCategory: { category: string; count: number }[];
  queriesByUser: { userId: string; userName: string; userEmail: string; count: number }[];
  recentQueries: any[];
}

/**
 * Get aggregated query statistics for a trial organization
 * @param orgId - The trial organization ID
 * @returns QueryStats object with aggregated metrics
 */
export async function getOrgQueryStats(orgId: string): Promise<QueryStats | null> {
  try {
    const supabase = await createClient();

    // Fetch all platform queries for the organization
    const { data: queries, error } = await supabase
      .from('platform_queries')
      .select(`
        query_id,
        user_id,
        query_topic,
        query_text,
        status,
        query_category,
        observations,
        confidence_score,
        response_time_ms,
        executed_at,
        created_at,
        trial_users!inner(
          user_id,
          name,
          email
        )
      `)
      .eq('org_id', orgId)
      .order('executed_at', { ascending: false });

    if (error) {
      console.error('Error fetching org query stats:', error);
      return null;
    }

    if (!queries || queries.length === 0) {
      return {
        totalQueries: 0,
        successfulQueries: 0,
        failedQueries: 0,
        averageConfidenceScore: null,
        averageResponseTime: null,
        queriesByCategory: [],
        queriesByUser: [],
        recentQueries: [],
      };
    }

    // Calculate total queries
    const totalQueries = queries.length;

    // Calculate successful and failed queries
    const successfulQueries = queries.filter(q => q.status === 'success').length;
    const failedQueries = queries.filter(q => q.status === 'failed').length;

    // Calculate average confidence score (only for queries with scores)
    const queriesWithConfidence = queries.filter(q => q.confidence_score !== null);
    const averageConfidenceScore = queriesWithConfidence.length > 0
      ? queriesWithConfidence.reduce((sum, q) => sum + (q.confidence_score || 0), 0) / queriesWithConfidence.length
      : null;

    // Calculate average response time (only for queries with response times)
    const queriesWithResponseTime = queries.filter(q => q.response_time_ms !== null);
    const averageResponseTime = queriesWithResponseTime.length > 0
      ? queriesWithResponseTime.reduce((sum, q) => sum + (q.response_time_ms || 0), 0) / queriesWithResponseTime.length
      : null;

    // Group queries by category
    const categoryMap = new Map<string, number>();
    queries.forEach(q => {
      if (q.query_category) {
        const count = categoryMap.get(q.query_category) || 0;
        categoryMap.set(q.query_category, count + 1);
      }
    });
    const queriesByCategory = Array.from(categoryMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    // Group queries by user
    const userMap = new Map<string, { userId: string; userName: string; userEmail: string; count: number }>();
    queries.forEach(q => {
      const user = (q as any).trial_users;
      if (user && user.user_id) {
        const existing = userMap.get(user.user_id);
        if (existing) {
          existing.count++;
        } else {
          userMap.set(user.user_id, {
            userId: user.user_id,
            userName: user.name,
            userEmail: user.email,
            count: 1,
          });
        }
      }
    });
    const queriesByUser = Array.from(userMap.values())
      .sort((a, b) => b.count - a.count);

    // Get recent queries (last 5)
    const recentQueries = queries.slice(0, 5).map(q => ({
      query_id: q.query_id,
      query_topic: q.query_topic,
      status: q.status,
      query_category: q.query_category,
      observations: q.observations,
      confidence_score: q.confidence_score,
      executed_at: q.executed_at,
      user: (q as any).trial_users,
    }));

    return {
      totalQueries,
      successfulQueries,
      failedQueries,
      averageConfidenceScore,
      averageResponseTime,
      queriesByCategory,
      queriesByUser,
      recentQueries,
    };
  } catch (error) {
    console.error('Error in getOrgQueryStats:', error);
    return null;
  }
}

/**
 * Get total query count for all trial organizations
 * Useful for dashboard-level aggregations
 */
export async function getAllTrialsQueryCount(): Promise<Map<string, number>> {
  try {
    const supabase = await createClient();

    const { data: queries, error } = await supabase
      .from('platform_queries')
      .select('org_id');

    if (error) {
      console.error('Error fetching all trials query count:', error);
      return new Map();
    }

    // Count queries per organization
    const countMap = new Map<string, number>();
    queries?.forEach(q => {
      const count = countMap.get(q.org_id) || 0;
      countMap.set(q.org_id, count + 1);
    });

    return countMap;
  } catch (error) {
    console.error('Error in getAllTrialsQueryCount:', error);
    return new Map();
  }
}

/**
 * Get query count for a specific organization
 * @param orgId - The trial organization ID
 * @returns Total number of platform queries
 */
export async function getOrgQueryCount(orgId: string): Promise<number> {
  try {
    const supabase = await createClient();

    const { count, error } = await supabase
      .from('platform_queries')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId);

    if (error) {
      console.error('Error fetching org query count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error in getOrgQueryCount:', error);
    return 0;
  }
}
