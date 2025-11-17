import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createActivityNoteNotifications, notifyAccountManagerOfNote } from '@/lib/notifications/activity-notes';

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
      .select('account_manager, org_name')
      .eq('org_id', org_id)
      .single();

    if (org?.account_manager && org.account_manager !== user.email) {
      notifications.push({
        user_email: org.account_manager,
        note_id: note.note_id,
        notification_type: 'new_note',
      });
    }

    // Filter notifications based on user preferences
    if (notifications.length > 0) {
      const userEmails = [...new Set(notifications.map(n => n.user_email))];

      // Fetch user preferences
      const { data: preferences } = await supabase
        .from('user_notification_preferences' as any)
        .select('user_email, notification_type, enabled')
        .in('user_email', userEmails) as any;

      // Create a map of user preferences
      const preferencesMap = new Map<string, Set<string>>();
      if (preferences) {
        for (const pref of preferences as any[]) {
          if (!pref.enabled) {
            if (!preferencesMap.has(pref.user_email)) {
              preferencesMap.set(pref.user_email, new Set());
            }
            preferencesMap.get(pref.user_email)!.add(pref.notification_type);
          }
        }
      }

      // Filter out notifications for users who have disabled them
      const filteredNotifications = notifications.filter(notif => {
        const disabledTypes = preferencesMap.get(notif.user_email);
        return !disabledTypes || !disabledTypes.has(notif.notification_type);
      });

      // Insert filtered notifications (backward compatibility)
      if (filteredNotifications.length > 0) {
        await supabase
          .from('activity_note_notifications')
          .insert(filteredNotifications as any);
      }
    }

    // Create unified notifications for mentions (dual-write strategy)
    if (mentions && mentions.length > 0 && org) {
      // Get user's name for notification
      const { data: userData } = await supabase
        .from('users' as any)
        .select('full_name')
        .eq('email', user.email)
        .single() as any;

      const actorName = userData?.full_name || user.email?.split('@')[0] || 'Someone';

      await createActivityNoteNotifications({
        noteId: note.note_id,
        orgId: org_id,
        orgName: org.org_name,
        noteCategory: note_category,
        noteText: note_text,
        actorEmail: user.email!,
        actorName,
        mentionedEmails: mentions,
      });
    }

    // Notify account manager via unified notifications (if not already mentioned)
    if (org?.account_manager && org.account_manager !== user.email) {
      const isMentioned = mentions && mentions.includes(org.account_manager);
      if (!isMentioned) {
        const { data: userData } = await supabase
          .from('users' as any)
          .select('full_name')
          .eq('email', user.email)
          .single() as any;

        const actorName = userData?.full_name || user.email?.split('@')[0] || 'Someone';

        await notifyAccountManagerOfNote(
          note.note_id,
          org_id,
          org.org_name,
          org.account_manager,
          note_category,
          note_text,
          user.email!,
          actorName
        );
      }
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
