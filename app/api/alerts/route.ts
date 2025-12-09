// Alert Configurations API - CRUD for automated alerts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = any;

const ALERT_TYPES = [
  'trial_expiring',
  'no_activity',
  'engagement_drop',
  'at_risk',
  'follow_up_overdue',
  'stage_change',
  'health_critical',
  'custom'
] as const;

const SEVERITY_LEVELS = ['low', 'medium', 'high', 'critical'] as const;

// GET /api/alerts - List alert configurations
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient() as AnySupabaseClient;
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const is_active = searchParams.get('is_active');
    const alert_type = searchParams.get('alert_type');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('alert_configurations')
      .select(`
        *,
        created_by_user:users!alert_configurations_created_by_fkey(id, email, full_name)
      `)
      .order('created_at', { ascending: false });

    if (is_active !== null) {
      query = query.eq('is_active', is_active === 'true');
    }

    if (alert_type) {
      query = query.eq('alert_type', alert_type);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching alert configurations:', error);
      return NextResponse.json({ error: 'Failed to fetch alert configurations' }, { status: 500 });
    }

    // Get recent alert history
    const { data: recentAlerts } = await supabase
      .from('alert_history')
      .select('alert_config_id, notification_sent, created_at')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(100);

    // Calculate stats
    const alertCounts: Record<string, { triggered: number; sent: number }> = {};
    recentAlerts?.forEach((a: any) => {
      if (!alertCounts[a.alert_config_id]) {
        alertCounts[a.alert_config_id] = { triggered: 0, sent: 0 };
      }
      alertCounts[a.alert_config_id].triggered++;
      if (a.notification_sent) {
        alertCounts[a.alert_config_id].sent++;
      }
    });

    return NextResponse.json({
      alerts: data || [],
      stats: {
        activeAlerts: data?.filter((a: any) => a.is_active).length || 0,
        last24hTriggers: recentAlerts?.length || 0,
        alertCounts,
      },
    });
  } catch (error) {
    console.error('Error in alerts API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/alerts - Create alert configuration
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const {
      name,
      description,
      alert_type,
      trigger_config,
      notification_channels,
      recipients,
      teams_webhook_url,
      message_template,
      severity,
      cooldown_minutes,
      max_alerts_per_day,
    } = body;

    // Validations
    if (!name?.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    if (!alert_type || !ALERT_TYPES.includes(alert_type)) {
      return NextResponse.json(
        { error: `Invalid alert_type. Must be one of: ${ALERT_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    if (severity && !SEVERITY_LEVELS.includes(severity)) {
      return NextResponse.json(
        { error: `Invalid severity. Must be one of: ${SEVERITY_LEVELS.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate trigger config based on alert type
    const configValidation = validateTriggerConfig(alert_type, trigger_config || {});
    if (!configValidation.valid) {
      return NextResponse.json({ error: configValidation.error }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('alert_configurations')
      .insert({
        name: name.trim(),
        description: description || null,
        alert_type,
        trigger_config: trigger_config || {},
        notification_channels: notification_channels || ['teams'],
        recipients: recipients || [],
        teams_webhook_url: teams_webhook_url || null,
        message_template: message_template || null,
        severity: severity || 'medium',
        cooldown_minutes: cooldown_minutes || 60,
        max_alerts_per_day: max_alerts_per_day || 10,
        is_active: true,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating alert configuration:', error);
      return NextResponse.json({ error: 'Failed to create alert configuration' }, { status: 500 });
    }

    return NextResponse.json({ alert: data }, { status: 201 });
  } catch (error) {
    console.error('Error creating alert configuration:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Validate trigger config based on alert type
function validateTriggerConfig(
  alertType: string,
  config: Record<string, any>
): { valid: boolean; error?: string } {
  switch (alertType) {
    case 'trial_expiring':
      if (typeof config.days_before !== 'number' || config.days_before < 1) {
        return { valid: false, error: 'trial_expiring requires trigger_config.days_before (number >= 1)' };
      }
      break;

    case 'no_activity':
      if (typeof config.days !== 'number' || config.days < 1) {
        return { valid: false, error: 'no_activity requires trigger_config.days (number >= 1)' };
      }
      break;

    case 'engagement_drop':
      if (typeof config.threshold !== 'number') {
        return { valid: false, error: 'engagement_drop requires trigger_config.threshold (number)' };
      }
      break;

    case 'stage_change':
      if (!config.to) {
        return { valid: false, error: 'stage_change requires trigger_config.to (target stage)' };
      }
      break;

    case 'at_risk':
    case 'health_critical':
    case 'follow_up_overdue':
    case 'custom':
      // No specific validation needed
      break;
  }

  return { valid: true };
}
