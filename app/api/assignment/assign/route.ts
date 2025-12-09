// Assignment Execution API
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { assignTrial, manuallyAssignTrial } from '@/lib/assignment/service';
import type { TrialContext } from '@/lib/assignment/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = any;

// POST /api/assignment/assign - Execute assignment
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient() as AnySupabaseClient;
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { org_id, manual, assign_to, reason } = body;

    if (!org_id) {
      return NextResponse.json(
        { error: 'org_id is required' },
        { status: 400 }
      );
    }

    // Manual assignment
    if (manual) {
      if (!assign_to) {
        return NextResponse.json(
          { error: 'assign_to is required for manual assignment' },
          { status: 400 }
        );
      }

      const result = await manuallyAssignTrial(org_id, assign_to, user.id, reason);
      return NextResponse.json({ result });
    }

    // Automatic assignment based on rules
    // First, fetch the trial context from the database
    const { data: org, error: orgError } = await supabase
      .from('trial_organizations')
      .select('*')
      .eq('org_id', org_id)
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Build trial context from org data
    const context: TrialContext = {
      org_id: org.org_id,
      org_name: org.org_name,
      industry: org.industry,
      company_size: org.company_size,
      source: org.source,
      region: org.region,
      country: org.country,
      plan_type: org.plan_type,
      trial_length: org.trial_length,
      user_count: org.user_count,
      email_domain: org.org_name?.includes('@')
        ? org.org_name.split('@')[1]
        : undefined,
    };

    const result = await assignTrial(context, user.id);

    return NextResponse.json({ result });
  } catch (error) {
    console.error('Error executing assignment:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Assignment failed' },
      { status: 500 }
    );
  }
}
