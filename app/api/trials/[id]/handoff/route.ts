import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendTrialHandoffEmail } from '@/lib/notifications/send-with-email';

interface HandoffRequest {
  new_account_manager: string; // email
  handoff_reason: string;
  context_notes?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = params.id;
    const body: HandoffRequest = await request.json();

    const { new_account_manager, handoff_reason, context_notes } = body;

    // Validate required fields
    if (!new_account_manager || !handoff_reason) {
      return NextResponse.json(
        { error: 'new_account_manager and handoff_reason are required' },
        { status: 400 }
      );
    }

    // Get current trial org
    const { data: org, error: orgError } = await supabase
      .from('trial_organizations')
      .select('org_id, org_name, account_manager')
      .eq('org_id', orgId)
      .single();

    if (orgError || !org) {
      return NextResponse.json({ error: 'Trial organization not found' }, { status: 404 });
    }

    const previousAccountManager = org.account_manager;

    // Check if trying to handoff to same person
    if (previousAccountManager === new_account_manager) {
      return NextResponse.json(
        { error: 'Cannot handoff to the same account manager' },
        { status: 400 }
      );
    }

    // Update account manager
    const { error: updateError } = await supabase
      .from('trial_organizations')
      .update({ account_manager: new_account_manager })
      .eq('org_id', orgId);

    if (updateError) throw updateError;

    // Create activity log entry
    const handoffNote = `Trial handoff: ${previousAccountManager || 'Unassigned'} → ${new_account_manager}\nReason: ${handoff_reason}${context_notes ? `\nContext: ${context_notes}` : ''}`;

    const { data: activityNote, error: noteError } = await supabase
      .from('org_activity_notes')
      .insert({
        org_id: orgId,
        logged_by: user.email,
        note_category: 'other',
        note_text: handoffNote,
        mentions: [new_account_manager], // Mention new account manager
      })
      .select()
      .single();

    if (noteError) {
      console.error('Error creating activity note:', noteError);
    }

    // Create high-priority notification for new account manager
    const { data: users } = await supabase
      .from('users' as any)
      .select('id, email, full_name')
      .in('email', [new_account_manager, user.email!]) as any;

    if (users && users.length > 0) {
      const newAccountManagerUser = (users as any[]).find((u: any) => u.email === new_account_manager);
      const actorUser = (users as any[]).find((u: any) => u.email === user.email);

      if (newAccountManagerUser) {
        const actorName = actorUser?.full_name || user.email?.split('@')[0] || 'Someone';

        // Create high-priority handoff notification
        await supabase.from('notifications').insert({
          user_id: newAccountManagerUser.id,
          entity_type: 'trial_org',
          entity_id: orgId,
          entity_title: org.org_name,
          notification_type: 'assigned',
          actor_id: actorUser?.id,
          title: `Trial handoff: You've been assigned ${org.org_name}`,
          message: `${actorName} handed off this trial to you. Reason: ${handoff_reason}`,
          action_url: `/support/trials/${orgId}`,
          thread_key: `trial_org:${orgId}`,
          priority_score: 75, // High priority for handoffs
          status: 'unread',
        } as any);

        // Send email notification asynchronously
        sendTrialHandoffEmail({
          recipientEmail: new_account_manager,
          orgName: org.org_name,
          previousAccountManager: previousAccountManager || 'Unassigned',
          newAccountManager: new_account_manager,
          handoffReason: handoff_reason,
          contextNotes: context_notes,
          actionUrl: `/support/trials/${orgId}`,
          actorName,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Trial handed off successfully',
      previous_account_manager: previousAccountManager,
      new_account_manager,
    });
  } catch (error: any) {
    console.error('Error during trial handoff:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to handoff trial' },
      { status: 500 }
    );
  }
}
