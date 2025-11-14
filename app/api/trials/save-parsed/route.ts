import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { incrementTerminologyUsage } from '@/lib/trials/terminology';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      session_id,
      selected_org,
      selected_users,
      selected_activities,
      auto_link_decisions = {}
    } = body;

    const created_org_ids: string[] = [];
    const created_user_ids: string[] = [];
    const created_activity_ids: string[] = [];

    // 1. Handle organization
    let org_id: string | null = null;

    if (selected_org) {
      if (auto_link_decisions.org_id) {
        // Link to existing org
        org_id = auto_link_decisions.org_id;
      } else {
        // Create new org
        const { data: newOrg, error: orgError } = await supabase
          .from('trial_organizations')
          .insert({
            org_name: selected_org.name,
            org_domain: selected_org.domain || null,
            org_url: selected_org.url || null,
            org_lifecycle_stage: 'prospect',
            trial_status: 'requested',
            trial_request_date: new Date().toISOString().split('T')[0],
            custom_fields: selected_org.metadata || {}
          })
          .select()
          .single();

        if (orgError) {
          console.error('Error creating org:', orgError);
          throw new Error(`Failed to create organization: ${orgError.message}`);
        }

        org_id = newOrg.org_id;
        created_org_ids.push(org_id);
      }
    }

    // 2. Handle users
    if (selected_users && selected_users.length > 0 && org_id) {
      for (const userData of selected_users) {
        if (auto_link_decisions[`user_${userData.email}`]) {
          // Link to existing user
          created_user_ids.push(auto_link_decisions[`user_${userData.email}`]);
        } else {
          // Create new user
          const { data: newUser, error: userError } = await supabase
            .from('trial_users')
            .insert({
              org_id,
              email: userData.email,
              name: userData.name || userData.full_name || userData.email.split('@')[0],
              role: userData.role || userData.title_role || null,
              account_manager: userData.account_manager || 'unassigned',
              salesforce_id: userData.salesforce_id || null,
              current_stage: 'invited'
            })
            .select()
            .single();

          if (userError) {
            console.error('Error creating user:', userError);
            // Continue with other users even if one fails
          } else {
            created_user_ids.push(newUser.user_id);
          }
        }
      }
    }

    // 3. Handle activities - create user_interactions for each user
    if (selected_activities && selected_activities.length > 0 && org_id && created_user_ids.length > 0) {
      // Map interaction types from activity types
      const typeMapping: Record<string, string> = {
        'demo': 'demo',
        'call': 'call',
        'meeting': 'meeting',
        'email': 'email',
        'chat': 'chat',
        'training': 'training',
        'support': 'support',
        'trial_started': 'demo',
        'questions_asked': 'support',
        'feedback_received': 'call'
      };

      for (const activity of selected_activities) {
        // Create interaction for each user (or primary user if specified)
        const targetUserIds = activity.user_id ? [activity.user_id] : created_user_ids;

        for (const userId of targetUserIds) {
          const interactionType = typeMapping[activity.type] || 'meeting';
          const title = activity.title || `${activity.type.replace(/_/g, ' ')}`;

          const { data: newInteraction, error: interactionError } = await supabase
            .from('user_interactions')
            .insert({
              user_id: userId,
              org_id: org_id,
              interaction_type: interactionType,
              title: title,
              notes: activity.description || activity.notes || null,
              interaction_date: activity.date || new Date().toISOString(),
              duration_minutes: activity.duration_minutes || null,
              conducted_by: user.email || null,
              created_at: new Date().toISOString()
            })
            .select()
            .single();

          if (interactionError) {
            console.error('Error creating user interaction:', interactionError);
          } else {
            created_activity_ids.push(newInteraction.id);

            // Increment terminology usage count
            if (activity.terminology_id) {
              await incrementTerminologyUsage(activity.terminology_id);
            }
          }
        }
      }
    }

    // 4. Update parsing session with created IDs
    if (session_id) {
      await supabase
        .from('parsing_sessions')
        .update({
          created_org_ids,
          created_user_ids,
          created_activity_ids
        })
        .eq('id', session_id);
    }

    // 5. Update org's last activity date and recalculate engagement score
    if (org_id) {
      await supabase
        .from('trial_organizations')
        .update({
          last_activity_date: new Date().toISOString()
        })
        .eq('org_id', org_id);

      // Trigger engagement score calculation
      await fetch(`${request.nextUrl.origin}/api/trials/calculate-scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id })
      });
    }

    return NextResponse.json({
      success: true,
      created: {
        org_id,
        org_ids: created_org_ids,
        user_ids: created_user_ids,
        activity_ids: created_activity_ids
      },
      counts: {
        orgs: created_org_ids.length,
        users: created_user_ids.length,
        activities: created_activity_ids.length
      }
    });
  } catch (error) {
    console.error('Error in save-parsed API:', error);
    return NextResponse.json(
      { error: 'Failed to save parsed data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
