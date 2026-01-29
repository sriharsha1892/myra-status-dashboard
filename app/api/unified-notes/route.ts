import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { formatErrorForAPI } from '@/lib/errorHandler';

/**
 * GET /api/unified-notes
 * Fetch notes for an entity or standalone notes
 *
 * Query params:
 * - entity_type: 'trial_org' | 'meeting' | 'roadmap_item' | 'ticket' | 'todo' | 'standalone'
 * - entity_id: UUID (optional for standalone)
 * - include_replies: boolean (default true)
 * - limit: number (default 50)
 * - offset: number (default 0)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const entityType = searchParams.get('entity_type');
    const entityId = searchParams.get('entity_id');
    const includeReplies = searchParams.get('include_replies') !== 'false';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query - only fetch root notes or all depending on includeReplies
    let query = supabase
      .from('unified_notes')
      .select('*')
      .eq('deleted', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by entity
    if (entityType) {
      query = query.eq('entity_type', entityType);

      if (entityId) {
        query = query.eq('entity_id', entityId);
      }
    }

    // Only root notes if not including replies
    if (!includeReplies) {
      query = query.is('parent_note_id', null);
    }

    const { data: notes, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      notes: notes || [],
      count: notes?.length || 0
    });

  } catch (error: any) {
    console.error('Error fetching notes:', error);
    return NextResponse.json(
      formatErrorForAPI(error, 'api_call'),
      { status: 500 }
    );
  }
}

/**
 * POST /api/unified-notes
 * Create a new note or reply
 *
 * Body:
 * - entity_type: 'trial_org' | 'meeting' | 'roadmap_item' | 'ticket' | 'todo' | 'standalone'
 * - entity_id: UUID (optional for standalone)
 * - entity_title: string (optional)
 * - content: string (rich HTML from TipTap)
 * - plain_text: string (for search)
 * - parent_note_id: UUID (optional, for replies)
 * - mentioned_user_ids: UUID[] (optional)
 * - visibility: 'team' | 'internal' | 'private' (default 'team')
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      entity_type,
      entity_id,
      entity_title,
      content,
      plain_text,
      parent_note_id,
      mentioned_user_ids,
      visibility
    } = body;

    // Validation
    if (!entity_type || !content) {
      return NextResponse.json(
        { error: 'entity_type and content are required' },
        { status: 400 }
      );
    }

    // If this is a reply, find the thread root
    let thread_root_id = null;
    if (parent_note_id) {
      const { data: parentNote } = await supabase
        .from('unified_notes')
        .select('thread_root_id, id')
        .eq('id', parent_note_id)
        .single();

      // If parent has a thread_root_id, use it; otherwise parent is the root
      thread_root_id = parentNote?.thread_root_id || parent_note_id;
    }

    // Create note
    const note = {
      entity_type,
      entity_id: entity_id || null,
      entity_title: entity_title || null,
      content,
      plain_text: plain_text || content.replace(/<[^>]*>/g, ''), // Strip HTML if not provided
      parent_note_id: parent_note_id || null,
      thread_root_id,
      mentioned_user_ids: mentioned_user_ids || [],
      visibility: visibility || 'team',
      created_by: user.id
    };

    const { data, error } = await supabase
      .from('unified_notes')
      .insert(note)
      .select()
      .single();

    if (error) throw error;

    // Create notifications for feature proposals (notify admin@myra.ai)
    // TODO: Make this configurable in settings later
    if (entity_type === 'feature_proposal') {
      try {
        // Fetch the admin@myra.ai user
        const { data: { users: allUsers }, error: usersError } = await supabase.auth.admin.listUsers();

        if (!usersError && allUsers) {
          const targetAdmin = allUsers.find(u => u.email === 'admin@myra.ai');

          if (targetAdmin && targetAdmin.id !== user.id) {
            // Get proposer's name
            const proposerName = user.user_metadata?.name || user.email || 'Someone';

            // Create notification for admin@myra.ai
            await supabase.from('notifications').insert({
              user_id: targetAdmin.id,
              entity_type: 'feature_proposal',
              entity_id: data.id,
              entity_title: entity_title || 'Feature Proposal',
              notification_type: 'feature_proposal',
              actor_id: user.id,
              title: `New Feature Proposal from ${proposerName}`,
              message: plain_text?.substring(0, 200) || '',
              action_url: `/status`,
              priority_score: 85, // High priority for feature proposals
              thread_key: `feature_proposal:${data.id}`,
              status: 'unread'
            });
          }
        }
      } catch (notifError) {
        console.error('Error creating feature proposal notification:', notifError);
        // Don't fail the note creation if notifications fail
      }
    }

    // Create notifications for mentions if any
    if (mentioned_user_ids && mentioned_user_ids.length > 0) {
      const notifications = mentioned_user_ids.map((userId: string) => ({
        user_id: userId,
        entity_type: 'note',
        entity_id: data.id,
        entity_title: entity_title || `Note in ${entity_type}`,
        notification_type: 'mention',
        actor_id: user.id,
        title: `You were mentioned in a note`,
        message: plain_text?.substring(0, 200) || '',
        action_url: `/status`,
        priority_score: 60, // Base priority for mentions
        thread_key: `note:${data.id}`,
        status: 'unread'
      }));

      await supabase.from('notifications').insert(notifications);
    }

    return NextResponse.json({
      success: true,
      note: data
    });

  } catch (error: any) {
    console.error('Error creating note:', error);
    return NextResponse.json(
      formatErrorForAPI(error, 'note_create'),
      { status: 500 }
    );
  }
}
