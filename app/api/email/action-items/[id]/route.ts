// Email Action Items API
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateActionItemStatus, convertActionToFollowup } from '@/lib/email/service';

type RouteContext = { params: Promise<{ id: string }> };

// PATCH /api/email/action-items/[id] - Update action item status
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const { status, convert_to_followup_id } = body;

    // If converting to followup
    if (convert_to_followup_id) {
      await convertActionToFollowup(id, convert_to_followup_id);
      return NextResponse.json({ success: true });
    }

    // Otherwise, update status
    if (!status || !['pending', 'in_progress', 'completed', 'dismissed'].includes(status)) {
      return NextResponse.json(
        { error: 'Valid status required (pending, in_progress, completed, dismissed)' },
        { status: 400 }
      );
    }

    const actionItem = await updateActionItemStatus(id, status);
    return NextResponse.json({ action_item: actionItem });
  } catch (error) {
    console.error('Error updating action item:', error);
    return NextResponse.json(
      { error: 'Failed to update action item' },
      { status: 500 }
    );
  }
}
