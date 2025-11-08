import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/unified-notes/[id]
 * Fetch a single note with its replies
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch the note
    const { data: note, error: noteError } = await supabase
      .from('unified_notes')
      .select('*')
      .eq('id', params.id)
      .eq('deleted', false)
      .single();

    if (noteError) throw noteError;

    if (!note) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }

    // Fetch replies if this is a root note
    let replies = [];
    if (note.is_root) {
      const { data: repliesData } = await supabase
        .from('unified_notes')
        .select('*')
        .eq('thread_root_id', params.id)
        .eq('deleted', false)
        .order('created_at', { ascending: true });

      replies = repliesData || [];
    }

    return NextResponse.json({
      note,
      replies,
      reply_count: replies.length
    });

  } catch (error: any) {
    console.error('Error fetching note:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch note' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/unified-notes/[id]
 * Update a note (edit content)
 *
 * Body:
 * - content: string (rich HTML)
 * - plain_text: string (optional)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { content, plain_text } = body;

    if (!content) {
      return NextResponse.json(
        { error: 'content is required' },
        { status: 400 }
      );
    }

    // Fetch existing note to save to history
    const { data: existingNote } = await supabase
      .from('unified_notes')
      .select('content, plain_text, created_by')
      .eq('id', params.id)
      .single();

    if (!existingNote) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }

    // Only creator can edit
    if (existingNote.created_by !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized - only the creator can edit this note' },
        { status: 403 }
      );
    }

    // Save to edit history
    await supabase.from('note_edit_history').insert({
      note_id: params.id,
      previous_content: existingNote.content,
      previous_plain_text: existingNote.plain_text,
      edited_by: user.id
    });

    // Update note
    const updates = {
      content,
      plain_text: plain_text || content.replace(/<[^>]*>/g, ''),
      edited: true,
      last_edit_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('unified_notes')
      .update(updates)
      .eq('id', params.id)
      .eq('created_by', user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      note: data
    });

  } catch (error: any) {
    console.error('Error updating note:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update note' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/unified-notes/[id]
 * Soft delete a note
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Soft delete (only creator can delete)
    const { data, error } = await supabase
      .from('unified_notes')
      .update({
        deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: user.id
      })
      .eq('id', params.id)
      .eq('created_by', user.id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return NextResponse.json(
        { error: 'Note not found or unauthorized' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Error deleting note:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete note' },
      { status: 500 }
    );
  }
}
