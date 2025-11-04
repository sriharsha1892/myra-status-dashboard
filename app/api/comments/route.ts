import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createMentionNotifications } from '@/lib/support/mentions';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user role from metadata
    const userRole = user.user_metadata?.role;

    if (!userRole || !['AM', 'Team', 'Admin'].includes(userRole)) {
      return NextResponse.json({ error: 'Invalid user role' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { ticket_id, comment, is_internal, mentioned_user_ids } = body;

    if (!ticket_id || !comment) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // AM users cannot create internal comments
    const finalIsInternal = userRole === 'AM' ? false : Boolean(is_internal);

    // Insert the comment
    const { data, error } = await supabase
      // -ignore - Supabase typing issue with dynamic columns

      .from('ticket_comments')
      // @ts-ignore - Supabase typing issue with dynamic columns
      .insert({
        ticket_id,
        user_id: user.id,
        comment: comment.trim(),
        is_internal: finalIsInternal,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating comment:', error);
      return NextResponse.json(
        { error: 'Failed to create comment' },
        { status: 500 }
      );
    }

    // Get ticket details for notification
    const { data: ticketData } = await supabase
      .from('tickets')
      .select('ticket_number')
      .eq('id', ticket_id)
      .single();

    // Create mention notifications if there are mentioned users
    if (mentioned_user_ids && mentioned_user_ids.length > 0 && data && ticketData) {
      const userName = user.user_metadata?.name || user.user_metadata?.full_name || 'Someone';
      const commentPreview = comment.substring(0, 100);

      await createMentionNotifications(
        (data as any).id,
        ticket_id,
        (ticketData as any).ticket_number,
        mentioned_user_ids,
        user.id,
        userName,
        commentPreview
      );
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/comments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
