/**
 * Health Scores Generation API Endpoint
 * Uses Groq AI to analyze trial organizations and generate health assessments
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  generateHealthScore,
  batchGenerateHealthScores,
  type OrgDataForHealth,
  type HealthAnalysis,
} from '@/lib/ai/healthScorer';
import { isGroqAvailable } from '@/lib/ai/groqClient';

// Create Supabase admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    // Check if Groq is available
    if (!isGroqAvailable()) {
      return NextResponse.json(
        {
          success: false,
          error: 'AI features not configured - GROQ_API_KEY missing',
        },
        { status: 503 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { org_ids, mode = 'selected' } = body;

    // Validate input
    if (mode === 'selected' && (!org_ids || !Array.isArray(org_ids) || org_ids.length === 0)) {
      return NextResponse.json(
        {
          success: false,
          error: 'org_ids array is required when mode is "selected"',
        },
        { status: 400 }
      );
    }

    // Fetch organizations data
    let query = supabaseAdmin
      .from('trial_organizations')
      .select(`
        org_id,
        org_name,
        org_lifecycle_stage,
        trial_start,
        trial_end,
        engagement_score
      `);

    // Filter by org_ids if provided
    if (mode === 'selected') {
      query = query.in('org_id', org_ids);
    }

    const { data: orgs, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching organizations:', fetchError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch organizations',
          details: fetchError.message,
        },
        { status: 500 }
      );
    }

    if (!orgs || orgs.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No organizations found',
        },
        { status: 404 }
      );
    }

    console.log(`Generating health scores for ${orgs.length} organizations...`);

    // Enrich organization data with activity metrics
    const enrichedOrgs: OrgDataForHealth[] = await Promise.all(
      orgs.map(async (org) => {
        // Calculate days in trial
        let daysInTrial: number | undefined;
        if (org.trial_start) {
          const startDate = new Date(org.trial_start);
          const now = new Date();
          daysInTrial = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        }

        // Get event count
        const { count: eventCount } = await supabaseAdmin
          .from('trial_timeline_events')
          .select('*', { count: 'exact', head: true })
          .eq('org_id', org.org_id);

        // Get user count
        const { count: userCount } = await supabaseAdmin
          .from('trial_users')
          .select('*', { count: 'exact', head: true })
          .eq('org_id', org.org_id);

        // Get last activity
        const { data: lastEvent } = await supabaseAdmin
          .from('trial_timeline_events')
          .select('event_timestamp')
          .eq('org_id', org.org_id)
          .order('event_timestamp', { ascending: false })
          .limit(1)
          .single();

        let daysSinceLastActivity: number | undefined;
        if (lastEvent) {
          const lastActivityDate = new Date(lastEvent.event_timestamp);
          const now = new Date();
          daysSinceLastActivity = Math.floor(
            (now.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24)
          );
        }

        // Get recent timeline events for context
        const { data: recentEvents } = await supabaseAdmin
          .from('trial_timeline_events')
          .select('event_type, event_category, sentiment, title, event_timestamp')
          .eq('org_id', org.org_id)
          .order('event_timestamp', { ascending: false })
          .limit(10);

        return {
          org_id: org.org_id,
          org_name: org.org_name,
          org_lifecycle_stage: org.org_lifecycle_stage,
          trial_start: org.trial_start,
          trial_end: org.trial_end,
          engagement_score: org.engagement_score,
          event_count: eventCount || 0,
          user_count: userCount || 0,
          days_since_last_activity: daysSinceLastActivity,
          days_in_trial: daysInTrial,
          recent_events: recentEvents || [],
        };
      })
    );

    // Generate health scores using AI
    const healthAnalyses = await batchGenerateHealthScores(enrichedOrgs);

    // Update database with health scores
    const updates: Array<{
      org_id: string;
      org_name: string;
      old_health_status?: string;
      new_health_status: string;
      old_engagement_score?: number;
      new_engagement_score: number;
      issues_count: number;
      recommendations_count: number;
      summary: string;
      confidence: number;
      success: boolean;
      error?: string;
    }> = [];

    for (const [org_id, analysis] of healthAnalyses) {
      const org = orgs.find(o => o.org_id === org_id)!;

      if (analysis.success) {
        // Update database
        const { error: updateError } = await supabaseAdmin
          .from('trial_organizations')
          .update({
            health_status: analysis.health_status,
            engagement_score: analysis.engagement_score,
            health_issues: analysis.health_issues,
            health_recommendations: analysis.health_recommendations,
            last_health_check: new Date().toISOString(),
          })
          .eq('org_id', org_id);

        if (updateError) {
          console.error(`Failed to update health score for ${org.org_name}:`, updateError);
          updates.push({
            org_id,
            org_name: org.org_name,
            old_health_status: undefined,
            new_health_status: analysis.health_status,
            old_engagement_score: org.engagement_score,
            new_engagement_score: analysis.engagement_score,
            issues_count: analysis.health_issues.length,
            recommendations_count: analysis.health_recommendations.length,
            summary: analysis.summary,
            confidence: analysis.confidence,
            success: false,
            error: updateError.message,
          });
        } else {
          updates.push({
            org_id,
            org_name: org.org_name,
            old_engagement_score: org.engagement_score,
            new_engagement_score: analysis.engagement_score,
            new_health_status: analysis.health_status,
            issues_count: analysis.health_issues.length,
            recommendations_count: analysis.health_recommendations.length,
            summary: analysis.summary,
            confidence: analysis.confidence,
            success: true,
          });
        }
      } else {
        updates.push({
          org_id,
          org_name: org.org_name,
          old_engagement_score: org.engagement_score,
          new_engagement_score: org.engagement_score || 50,
          new_health_status: 'warning',
          issues_count: 0,
          recommendations_count: 0,
          summary: '',
          confidence: 0,
          success: false,
          error: analysis.error || 'Failed to generate health score',
        });
      }
    }

    // Summary statistics
    const successCount = updates.filter(u => u.success).length;
    const failureCount = updates.filter(u => !u.success).length;
    const totalIssues = updates.reduce((sum, u) => sum + u.issues_count, 0);
    const totalRecommendations = updates.reduce((sum, u) => sum + u.recommendations_count, 0);

    // Health status distribution
    const healthDistribution = updates.reduce((acc, u) => {
      acc[u.new_health_status] = (acc[u.new_health_status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log(`Health score generation complete: ${successCount} succeeded, ${failureCount} failed`);

    return NextResponse.json({
      success: true,
      summary: {
        total: orgs.length,
        succeeded: successCount,
        failed: failureCount,
        total_issues: totalIssues,
        total_recommendations: totalRecommendations,
        health_distribution: healthDistribution,
      },
      results: updates,
      // Include full analysis for detailed view
      detailed_analyses: Array.from(healthAnalyses.entries()).map(([org_id, analysis]) => ({
        org_id,
        org_name: orgs.find(o => o.org_id === org_id)?.org_name,
        ...analysis,
      })),
    });
  } catch (error: any) {
    console.error('Health score generation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check if health scoring is available
export async function GET(request: NextRequest) {
  const available = isGroqAvailable();

  return NextResponse.json({
    available,
    message: available
      ? 'AI health scoring is available'
      : 'AI health scoring is not available - GROQ_API_KEY not configured',
  });
}
