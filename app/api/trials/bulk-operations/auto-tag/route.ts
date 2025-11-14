/**
 * Auto-Tag Organizations API Endpoint
 * Uses Groq AI to automatically generate tags for trial organizations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  generateOrgTags,
  batchTagOrganizations,
  type OrgDataForTagging,
} from '@/lib/ai/orgTagger';
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
        description,
        comments,
        engagement_score,
        org_lifecycle_stage,
        trial_start,
        trial_end,
        tags
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

    console.log(`Auto-tagging ${orgs.length} organizations...`);

    // Enrich organization data with activity metrics
    const enrichedOrgs: OrgDataForTagging[] = await Promise.all(
      orgs.map(async (org) => {
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

        return {
          org_id: org.org_id,
          org_name: org.org_name,
          description: org.description,
          comments: org.comments,
          engagement_score: org.engagement_score,
          org_lifecycle_stage: org.org_lifecycle_stage,
          trial_start: org.trial_start,
          trial_end: org.trial_end,
          event_count: eventCount || 0,
          user_count: userCount || 0,
          days_since_last_activity: daysSinceLastActivity,
        };
      })
    );

    // Generate tags using AI
    const taggingResults = await batchTagOrganizations(enrichedOrgs);

    // Update database with generated tags
    const updates: Array<{
      org_id: string;
      org_name: string;
      old_tags: string[];
      new_tags: string[];
      confidence: number;
      reasoning?: string;
      success: boolean;
      error?: string;
    }> = [];

    for (const [org_id, result] of taggingResults) {
      const org = orgs.find(o => o.org_id === org_id)!;
      const oldTags = org.tags || [];

      if (result.success && result.tags.length > 0) {
        // Merge with existing tags (avoid duplicates)
        const mergedTags = [...new Set([...oldTags, ...result.tags])];

        // Update database
        const { error: updateError } = await supabaseAdmin
          .from('trial_organizations')
          .update({ tags: mergedTags })
          .eq('org_id', org_id);

        if (updateError) {
          console.error(`Failed to update tags for ${org.org_name}:`, updateError);
          updates.push({
            org_id,
            org_name: org.org_name,
            old_tags: oldTags,
            new_tags: result.tags,
            confidence: result.confidence,
            reasoning: result.reasoning,
            success: false,
            error: updateError.message,
          });
        } else {
          updates.push({
            org_id,
            org_name: org.org_name,
            old_tags: oldTags,
            new_tags: result.tags,
            confidence: result.confidence,
            reasoning: result.reasoning,
            success: true,
          });
        }
      } else {
        updates.push({
          org_id,
          org_name: org.org_name,
          old_tags: oldTags,
          new_tags: [],
          confidence: 0,
          success: false,
          error: result.error || 'Failed to generate tags',
        });
      }
    }

    // Summary statistics
    const successCount = updates.filter(u => u.success).length;
    const failureCount = updates.filter(u => !u.success).length;
    const totalTagsAdded = updates.reduce(
      (sum, u) => sum + (u.success ? u.new_tags.length : 0),
      0
    );

    console.log(`Auto-tagging complete: ${successCount} succeeded, ${failureCount} failed`);

    return NextResponse.json({
      success: true,
      summary: {
        total: orgs.length,
        succeeded: successCount,
        failed: failureCount,
        total_tags_added: totalTagsAdded,
      },
      results: updates,
    });
  } catch (error: any) {
    console.error('Auto-tagging error:', error);
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

// GET endpoint to check if auto-tagging is available
export async function GET(request: NextRequest) {
  const available = isGroqAvailable();

  return NextResponse.json({
    available,
    message: available
      ? 'AI auto-tagging is available'
      : 'AI auto-tagging is not available - GROQ_API_KEY not configured',
  });
}
