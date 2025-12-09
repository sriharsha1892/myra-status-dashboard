import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Initialize Supabase client with service role
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Schema for bulk update request
const bulkUpdateSchema = z.object({
  org_ids: z.array(z.string().uuid()).min(1).max(100),
  updates: z.object({
    account_manager: z.string().optional(),
    account_manager_id: z.string().uuid().optional(),
    org_lifecycle_stage: z.string().optional(),
    trial_status: z.string().optional(),
    trial_start_date: z.string().optional(),
    trial_end_date: z.string().optional(),
    engagement_tier: z.string().optional(),
  }).refine(data => Object.keys(data).length > 0, {
    message: 'At least one update field is required',
  }),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate request body
    const validationResult = bulkUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { org_ids, updates } = validationResult.data;

    // Add updated_at timestamp
    const updatesWithTimestamp = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    // Perform batch update using Supabase
    const { data, error, count } = await supabase
      .from('trial_organizations')
      .update(updatesWithTimestamp)
      .in('org_id', org_ids)
      .select('org_id');

    if (error) {
      console.error('Bulk update error:', error);
      return NextResponse.json(
        { error: 'Failed to update organizations', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      updated_count: data?.length || 0,
      updated_ids: data?.map(d => d.org_id) || [],
    });
  } catch (error: any) {
    console.error('Bulk update error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// Support OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
