import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    let updatedCount = 0;
    const scores: { org_id: string; org_name: string; score: number }[] = [];

    // Calculate score for each organization
    for (const org of organizations) {
      const orgTyped = org as any;
      // Get all users for this organization
      const { data: users, error: usersError } = await supabase
        .from('trial_users')
        .select('login_count, last_login_date')
        .eq('org_id', orgTyped.org_id);

      if (usersError || !users) {
        console.error(`Failed to fetch users for org ${orgTyped.org_id}:`, usersError);
        continue;
      }

      // Calculate login frequency component (50 points max)
      const totalLogins = users.reduce((sum, user) => sum + ((user as any).login_count || 0), 0);
      const loginScore = Math.min(totalLogins * 5, 50);

      // Calculate recency component (50 points max)
      let recencyScore = 0;
      if (orgTyped.last_activity_date) {
        const lastActivity = new Date(orgTyped.last_activity_date);
        const now = new Date();
        const daysSinceLastActivity = Math.floor(
          (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceLastActivity < 2) {
          recencyScore = 50;
        } else if (daysSinceLastActivity <= 7) {
          recencyScore = 30;
        } else if (daysSinceLastActivity <= 14) {
          recencyScore = 10;
        } else {
          recencyScore = 0;
        }
      }

      // Total engagement score
      const engagementScore = loginScore + recencyScore;

      // Update the organization's engagement score
      const { error: updateError } = await supabase
        // -ignore - Supabase typing issue with dynamic columns

        .from('trial_organizations')
        // @ts-ignore - Supabase typing issue with dynamic columns
        .update({ engagement_score: engagementScore })
        .eq('org_id', orgTyped.org_id);

      if (updateError) {
        console.error(`Failed to update score for org ${orgTyped.org_id}:`, updateError);
        continue;
      }

      updatedCount++;
      scores.push({
        org_id: orgTyped.org_id,
        org_name: orgTyped.org_name,
        score: engagementScore
      });
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
