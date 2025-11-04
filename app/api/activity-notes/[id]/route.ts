import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// PATCH - Edit activity note
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

    const noteId = params.id;
    const body = await request.json();
    const { note_text, note_category, trial_user_id, linked_roadmap_id } = body;

    // Check if user owns this note
    const { data: existingNote, error: fetchError } = await supabase
      .from('org_activity_notes')
      .select('logged_by')
      .eq('note_id', noteId)
      .single();

    if (fetchError) throw fetchError;

    if (existingNote.logged_by !== user.email) {
      return NextResponse.json(
        { error: 'Unauthorized - You can only edit your own notes' },
        { status: 403 }
      );
    }

    // Update the note
    const { data: note, error: updateError } = await supabase
      .from('org_activity_notes')
      .update({
        note_text,
        note_category,
        trial_user_id,
        linked_roadmap_id,
      })
      .eq('note_id', noteId)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ note });
  } catch (error: any) {
    console.error('Error updating activity note:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update activity note' },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete activity note
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

    const noteId = params.id;

    // Check if user owns this note
    const { data: existingNote, error: fetchError } = await supabase
      .from('org_activity_notes')
      .select('logged_by')
      .eq('note_id', noteId)
      .single();

    if (fetchError) throw fetchError;

    if (existingNote.logged_by !== user.email) {
      return NextResponse.json(
        { error: 'Unauthorized - You can only delete your own notes' },
        { status: 403 }
      );
    }

    // Soft delete
    const { error: deleteError } = await supabase
      .from('org_activity_notes')
      .update({ deleted: true })
      .eq('note_id', noteId);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting activity note:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete activity note' },
      { status: 500 }
    );
  }
}
