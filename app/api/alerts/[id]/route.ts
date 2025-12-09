// Individual Alert Configuration API - GET, PATCH, DELETE
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = any;

type RouteContext = { params: Promise<{ id: string }> };

const ALERT_TYPES = [
  'trial_expiring', 'no_activity', 'engagement_drop', 'at_risk',
  'follow_up_overdue', 'stage_change', 'health_critical', 'custom'
] as const;

const SEVERITY_LEVELS = ['low', 'medium', 'high', 'critical'] as const;

// GET /api/alerts/[id] - Get single alert config with history
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const supabase = await createClient() as AnySupabaseClient;
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    const { data: alert, error } = await supabase
      .from('alert_configurations')
      .select(`
        *,
        created_by_user:users!alert_configurations_created_by_fkey(id, email, full_name)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
      }
      console.error('Error fetching alert:', error);
      return NextResponse.json({ error: 'Failed to fetch alert' }, { status: 500 });
    }

    // Get recent history
    const { data: history } = await supabase
      .from('alert_history')
      .select(`
        *,
        acknowledged_by_user:users!alert_history_acknowledged_by_fkey(full_name)
      `)
      .eq('alert_config_id', id)
      .order('created_at', { ascending: false })
      .limit(20);

    return NextResponse.json({
      alert,
      history: history || [],
    });
  } catch (error) {
    console.error('Error fetching alert:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/alerts/[id] - Update alert configuration
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const supabase = await createClient() as AnySupabaseClient;
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin permission
    const { data: userData } = await supabase
      .from('users')
      .select('role, is_super_admin')
      .eq('id', user.id)
      .single();

    if (!userData || (userData.role !== 'Admin' && !userData.is_super_admin)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await request.json();

    // Validate fields if provided
    if (body.alert_type && !ALERT_TYPES.includes(body.alert_type)) {
      return NextResponse.json(
        { error: `Invalid alert_type. Must be one of: ${ALERT_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    if (body.severity && !SEVERITY_LEVELS.includes(body.severity)) {
      return NextResponse.json(
        { error: `Invalid severity. Must be one of: ${SEVERITY_LEVELS.join(', ')}` },
        { status: 400 }
      );
    }

    // Build update object
    const updates: Record<string, unknown> = {};
    const allowedFields = [
      'name', 'description', 'alert_type', 'trigger_config',
      'notification_channels', 'recipients', 'teams_webhook_url',
      'message_template', 'severity', 'cooldown_minutes',
      'max_alerts_per_day', 'is_active'
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    const { data, error } = await supabase
      .from('alert_configurations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating alert:', error);
      return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 });
    }

    return NextResponse.json({ alert: data });
  } catch (error) {
    console.error('Error updating alert:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/alerts/[id] - Delete alert configuration
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const supabase = await createClient() as AnySupabaseClient;
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin permission
    const { data: userData } = await supabase
      .from('users')
      .select('role, is_super_admin')
      .eq('id', user.id)
      .single();

    if (!userData || (userData.role !== 'Admin' && !userData.is_super_admin)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await context.params;

    const { error } = await supabase
      .from('alert_configurations')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting alert:', error);
      return NextResponse.json({ error: 'Failed to delete alert' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting alert:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
