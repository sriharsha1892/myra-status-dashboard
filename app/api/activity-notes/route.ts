import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET - List activity notes for an org
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('org_id');

    if (!orgId) {
      return NextResponse.json({ error: 'org_id is required' }, { status: 400 });
    }

    // Get activity notes with related data
    const { data: notes, error } = await supabase
      .from('org_activity_notes')
      .select(`
        *,
        trial_users:trial_user_id (
          user_id,
          name,
          email
        ),
        roadmap_items:linked_roadmap_id (
          roadmap_id,
          title,
          status
        )
      `)
      .eq('org_id', orgId)
      .eq('deleted', false)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ notes: notes || [] });
  } catch (error: any) {
    console.error('Error fetching activity notes:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch activity notes' },
      { status: 500 }
    );
  }
}

// POST - Create new activity note
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      org_id,
      trial_user_id,
      note_category,
      note_text,
      linked_roadmap_id,
      mentions,
    } = body;

    // Validate required fields
    if (!org_id || !note_category || !note_text) {
      return NextResponse.json(
        { error: 'org_id, note_category, and note_text are required' },
        { status: 400 }
      );
    }

    // Validate category
    const validCategories = ['first_login', 'question', 'issue', 'success', 'data_quality', 'feature_request', 'other'];
    if (!validCategories.includes(note_category)) {
      return NextResponse.json(
        { error: 'Invalid note_category' },
        { status: 400 }
      );
    }

    // Insert the note
    const { data: note, error: noteError } = await supabase
      .from('org_activity_notes')
      .insert({
        org_id,
        trial_user_id: trial_user_id || null,
        logged_by: user.email,
        note_category,
        note_text,
        linked_roadmap_id: linked_roadmap_id || null,
        mentions: mentions || [],
      })
      .select()
      .single();

    if (noteError) throw noteError;

    // Create notifications
    const notifications = [];

    // 1. Notify @mentioned users
    if (mentions && mentions.length > 0) {
      for (const email of mentions) {
        if (email !== user.email) { // Don't notify yourself
          notifications.push({
            user_email: email,
            note_id: note.note_id,
            notification_type: 'mention',
          });
        }
      }
    }

    // 2. If it's an issue, notify all product team (you can customize this logic)
    if (note_category === 'issue') {
      // TODO: Fetch product team emails from database or config
      // For now, skip or add specific emails
    }

    // 3. Notify account manager for this org
    const { data: org } = await supabase
      .from('trial_organizations')
      .select('account_manager')
      .eq('org_id', org_id)
      .single();

    if (org?.account_manager && org.account_manager !== user.email) {
      notifications.push({
        user_email: org.account_manager,
        note_id: note.note_id,
        notification_type: 'new_note',
      });
    }

    // Insert notifications
    if (notifications.length > 0) {
      await supabase
        .from('activity_note_notifications')
        .insert(notifications);
    }

    return NextResponse.json({ note }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating activity note:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create activity note' },
      { status: 500 }
    );
  }
}
