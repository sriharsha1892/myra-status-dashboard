import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Helper to group array by key
function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((result, item) => {
    const groupKey = String(item[key]);
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {} as Record<string, T[]>);
}

// Calculate recency score based on last activity
function calculateRecencyScore(lastActivityDate: string | null): number {
  if (!lastActivityDate) return 0;

  const lastActivity = new Date(lastActivityDate);
  const now = new Date();
  const daysSinceLastActivity = Math.floor(
    (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceLastActivity < 2) return 50;
  if (daysSinceLastActivity <= 7) return 30;
  if (daysSinceLastActivity <= 14) return 10;
  return 0;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get all trial_active organizations
    const { data: organizations, error: orgsError } = await supabase
      .from('trial_organizations')
      .select('org_id, org_name, last_activity_date')
      .eq('org_lifecycle_stage', 'trial_active');

    if (orgsError) {
      return NextResponse.json(
        { error: 'Failed to fetch organizations', details: orgsError.message },
        { status: 500 }
      );
    }

    if (!organizations || organizations.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No trial_active organizations found',
        updated_count: 0
      });
    }

    // BATCH QUERY: Fetch all users for all orgs at once (fixes N+1)
    const orgIds = organizations.map(o => o.org_id);
    const { data: allUsers, error: usersError } = await supabase
      .from('trial_users')
      .select('org_id, login_count, last_login_date')
      .in('org_id', orgIds);

    if (usersError) {
      return NextResponse.json(
        { error: 'Failed to fetch users', details: usersError.message },
        { status: 500 }
      );
    }

    // Group users by org_id for O(1) lookup
    const usersByOrg = groupBy(allUsers || [], 'org_id' as keyof typeof allUsers[0]);

    // Calculate scores in memory
    const scores: { org_id: string; org_name: string; score: number }[] = [];
    const updates: { org_id: string; engagement_score: number }[] = [];

    for (const org of organizations) {
      const orgUsers = usersByOrg[org.org_id] || [];

      // Calculate login frequency component (50 points max)
      const totalLogins = orgUsers.reduce((sum, user) => sum + ((user as any).login_count || 0), 0);
      const loginScore = Math.min(totalLogins * 5, 50);

      // Calculate recency component (50 points max)
      const recencyScore = calculateRecencyScore(org.last_activity_date);

      // Total engagement score
      const engagementScore = loginScore + recencyScore;

      updates.push({ org_id: org.org_id, engagement_score: engagementScore });
      scores.push({
        org_id: org.org_id,
        org_name: org.org_name,
        score: engagementScore
      });
    }

    // BATCH UPDATE: Use upsert to update all scores at once
    // Note: Supabase doesn't support batch updates directly, so we use Promise.all
    // with chunked updates to reduce round trips while staying within limits
    const CHUNK_SIZE = 50;
    let updatedCount = 0;

    for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
      const chunk = updates.slice(i, i + CHUNK_SIZE);

      // Use Promise.all to parallelize updates within each chunk
      const results = await Promise.all(
        chunk.map(update =>
          supabase
            .from('trial_organizations')
            // @ts-ignore - Supabase typing issue with dynamic columns
            .update({ engagement_score: update.engagement_score })
            .eq('org_id', update.org_id)
        )
      );

      updatedCount += results.filter(r => !r.error).length;
    }

    return NextResponse.json({
      success: true,
      message: `Successfully updated engagement scores for ${updatedCount} organizations`,
      updated_count: updatedCount,
      scores: scores
    });

  } catch (error) {
    console.error('Error calculating engagement scores:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
