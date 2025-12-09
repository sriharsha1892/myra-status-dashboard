// API Route: Update individual staging record
// PATCH /api/myra/staging/[id] - Update mapping or status

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: stagingId } = await context.params;
    const updates = await request.json();

    // Allowed fields to update
    const allowedUpdates: any = {};

    if (updates.mapped_org_id !== undefined) {
      allowedUpdates.mapped_org_id = updates.mapped_org_id;
    }
    if (updates.mapped_user_id !== undefined) {
      allowedUpdates.mapped_user_id = updates.mapped_user_id;
    }
    if (updates.mapping_status !== undefined) {
      allowedUpdates.mapping_status = updates.mapping_status;
    }
    if (updates.review_notes !== undefined) {
      allowedUpdates.review_notes = updates.review_notes;
    }
    if (updates.raw_insight_title !== undefined) {
      allowedUpdates.raw_insight_title = updates.raw_insight_title;
    }

    // Track manual overrides
    if (Object.keys(updates).length > 0) {
      allowedUpdates.reviewed_by = user.id;
      allowedUpdates.reviewed_at = new Date().toISOString();
      allowedUpdates.manual_overrides = updates; // Store full update for audit
    }

    const { data, error } = await supabase
      .from('myra_activity_staging')
      .update(allowedUpdates)
      .eq('staging_id', stagingId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, record: data });
  } catch (error: any) {
    console.error('Update staging error:', error);
    return NextResponse.json(
      {
        error: 'Failed to update staging record',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
