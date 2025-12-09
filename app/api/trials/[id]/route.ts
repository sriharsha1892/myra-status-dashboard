import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { z } from 'zod';

/**
 * Individual Trial Organization CRUD API
 *
 * GET: Fetch single trial organization with related data
 * PATCH: Update single trial organization
 * DELETE: Soft delete trial organization
 */

type RouteContext = { params: Promise<{ id: string }> };

// Validation schema for PATCH updates
const updateTrialOrgSchema = z.object({
  // Basic info
  org_name: z.string().min(1).max(255).optional(),
  org_domain: z.string().max(255).nullable().optional(),
  account_manager: z.string().nullable().optional(),

  // Lifecycle & status
  org_lifecycle_stage: z.enum([
    'prospect',
    'trial_pending',
    'trial_active',
    'trial_expired',
    'customer',
    'lost'
  ]).optional(),
  trial_status: z.enum([
    'requested',
    'approved',
    'active',
    'extended',
    'completed',
    'cancelled'
  ]).nullable().optional(),

  // Trial dates
  trial_start_date: z.string().datetime().nullable().optional(),
  trial_end_date: z.string().datetime().nullable().optional(),

  // Engagement
  engagement_score: z.number().min(0).max(100).optional(),
  engagement_tier: z.enum(['hot', 'warm', 'cold', 'dormant']).nullable().optional(),

  // Activity tracking
  last_activity_date: z.string().datetime().nullable().optional(),
  first_login_date: z.string().datetime().nullable().optional(),
  first_query_date: z.string().datetime().nullable().optional(),
  activation_date: z.string().datetime().nullable().optional(),
  last_query_date: z.string().datetime().nullable().optional(),

  // Metrics
  total_logins: z.number().int().min(0).optional(),
  total_queries: z.number().int().min(0).optional(),
  unique_active_users: z.number().int().min(0).optional(),

  // Customer health (post-conversion)
  customer_health_status: z.enum([
    'onboarding',
    'healthy',
    'warning',
    'at_risk',
    'churning'
  ]).nullable().optional(),

  // Prospect fields
  is_prospect: z.boolean().optional(),
  prospect_stage: z.enum([
    'cold_lead',
    'contacted',
    'responded',
    'screening',
    'demo_scheduled',
    'demo_done',
    'disqualified'
  ]).nullable().optional(),
  prospect_source: z.enum([
    'cold_outreach',
    'inbound',
    'referral',
    'event',
    'linkedin',
    'other'
  ]).nullable().optional(),
  icp_fit_score: z.number().min(0).max(100).nullable().optional(),

  // Deal tracking
  deal_stage: z.enum(['evaluation', 'trial_expired', 'negotiation', 'closed']).nullable().optional(),
  deal_outcome: z.enum(['won', 'lost', 'deferred']).nullable().optional(),
  deal_outcome_reason: z.string().nullable().optional(),
  deal_deferred_until: z.string().datetime().nullable().optional(),

  // Other
  comments: z.string().nullable().optional(),
}).refine(
  (data) => {
    // If both trial dates provided, end must be after start
    if (data.trial_start_date && data.trial_end_date) {
      return new Date(data.trial_end_date) >= new Date(data.trial_start_date);
    }
    return true;
  },
  {
    message: 'Trial end date must be on or after start date',
    path: ['trial_end_date'],
  }
);

/**
 * GET /api/trials/[id]
 * Fetch a single trial organization with related data
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const supabase = createServiceClient();
    const { id: orgId } = await context.params;

    // Fetch the trial organization
    const { data: org, error: orgError } = await supabase
      .from('trial_organizations')
      .select('*')
      .eq('org_id', orgId)
      .single();

    if (orgError) {
      if (orgError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Trial organization not found' },
          { status: 404 }
        );
      }
      throw orgError;
    }

    // Fetch related trial users count
    const { count: usersCount, error: usersCountError } = await supabase
      .from('trial_users')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId);

    if (usersCountError) {
      console.error('Error fetching users count:', usersCountError);
    }

    // Fetch recent activity notes (last 5)
    const { data: recentNotes, error: notesError } = await supabase
      .from('org_activity_notes')
      .select('note_id, note_text, note_category, logged_by, created_at')
      .eq('org_id', orgId)
      .eq('deleted', false)
      .order('created_at', { ascending: false })
      .limit(5);

    if (notesError) {
      console.error('Error fetching recent notes:', notesError);
    }

    // Fetch champion users
    const { data: champions, error: championsError } = await supabase
      .from('trial_users')
      .select('user_id, name, email, role, is_champion')
      .eq('org_id', orgId)
      .eq('is_champion', true);

    if (championsError) {
      console.error('Error fetching champions:', championsError);
    }

    // Fetch latest engagement snapshot
    const { data: latestSnapshot, error: snapshotError } = await supabase
      .from('trial_engagement_snapshots')
      .select('*')
      .eq('org_id', orgId)
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (snapshotError) {
      console.error('Error fetching engagement snapshot:', snapshotError);
    }

    return NextResponse.json({
      organization: org,
      trial_users_count: usersCount || 0,
      recent_activity: recentNotes || [],
      champions: champions || [],
      latest_engagement_snapshot: latestSnapshot || null,
    });

  } catch (error: any) {
    console.error('Error fetching trial organization:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch trial organization' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/trials/[id]
 * Update a single trial organization
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const supabase = createServiceClient();
    const { id: orgId } = await context.params;
    const body = await request.json();

    // Validate request body
    const validationResult = updateTrialOrgSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validationResult.error.issues
        },
        { status: 400 }
      );
    }

    // Check if organization exists
    const { data: existingOrg, error: checkError } = await supabase
      .from('trial_organizations')
      .select('org_id, org_name')
      .eq('org_id', orgId)
      .single();

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Trial organization not found' },
          { status: 404 }
        );
      }
      throw checkError;
    }

    const updates = {
      ...validationResult.data,
      updated_at: new Date().toISOString(),
    };

    // Update the organization
    const { data: updatedOrg, error: updateError } = await supabase
      .from('trial_organizations')
      .update(updates)
      .eq('org_id', orgId)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      organization: updatedOrg,
      message: 'Trial organization updated successfully',
    });

  } catch (error: any) {
    console.error('Error updating trial organization:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update trial organization' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/trials/[id]
 * Soft delete a trial organization (marks as inactive/deleted)
 *
 * Note: This sets org_lifecycle_stage to 'lost' as a soft delete.
 * We don't hard delete to preserve historical data.
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const supabase = createServiceClient();
    const { id: orgId } = await context.params;

    // Check if organization exists
    const { data: existingOrg, error: checkError } = await supabase
      .from('trial_organizations')
      .select('org_id, org_name, org_lifecycle_stage')
      .eq('org_id', orgId)
      .single();

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Trial organization not found' },
          { status: 404 }
        );
      }
      throw checkError;
    }

    // Check if already marked as lost
    if (existingOrg.org_lifecycle_stage === 'lost') {
      return NextResponse.json(
        { error: 'Trial organization already deleted (marked as lost)' },
        { status: 400 }
      );
    }

    // Soft delete by marking as 'lost'
    const { error: deleteError } = await supabase
      .from('trial_organizations')
      .update({
        org_lifecycle_stage: 'lost',
        trial_status: 'cancelled',
        updated_at: new Date().toISOString(),
        comments: existingOrg.org_lifecycle_stage === 'lost'
          ? existingOrg.org_name
          : `Deleted from ${existingOrg.org_lifecycle_stage} stage`,
      })
      .eq('org_id', orgId);

    if (deleteError) throw deleteError;

    return NextResponse.json({
      success: true,
      message: 'Trial organization deleted successfully (marked as lost)',
      org_id: orgId,
    });

  } catch (error: any) {
    console.error('Error deleting trial organization:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete trial organization' },
      { status: 500 }
    );
  }
}
