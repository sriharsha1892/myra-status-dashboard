// Alert Evaluation Service
// Evaluates alert conditions and triggers notifications

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = any;

export type AlertType =
  | 'trial_expiring'
  | 'no_activity'
  | 'engagement_drop'
  | 'at_risk'
  | 'follow_up_overdue'
  | 'stage_change'
  | 'health_critical'
  | 'custom';

export interface AlertConfig {
  id: string;
  name: string;
  alert_type: AlertType;
  trigger_config: Record<string, any>;
  notification_channels: string[];
  recipients: any[];
  teams_webhook_url?: string;
  message_template?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  cooldown_minutes: number;
  max_alerts_per_day: number;
  last_triggered_at?: string;
  total_alerts_sent: number;
}

export interface AlertTrigger {
  entity_type: string;
  entity_id: string;
  trigger_reason: string;
  entity_data?: any;
}

export interface EvaluationResult {
  alert_config_id: string;
  triggered: boolean;
  triggers: AlertTrigger[];
  skipped_reason?: string;
}

// Evaluate all active alerts
export async function evaluateAlerts(
  supabase: AnySupabaseClient
): Promise<EvaluationResult[]> {
  // Get all active alert configurations
  const { data: alertConfigs, error } = await supabase
    .from('alert_configurations')
    .select('*')
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching alert configs:', error);
    return [];
  }

  const results: EvaluationResult[] = [];

  for (const config of alertConfigs || []) {
    const result = await evaluateAlert(supabase, config);
    results.push(result);
  }

  return results;
}

// Evaluate a single alert
async function evaluateAlert(
  supabase: AnySupabaseClient,
  config: AlertConfig
): Promise<EvaluationResult> {
  // Check cooldown
  if (config.last_triggered_at) {
    const lastTriggered = new Date(config.last_triggered_at);
    const cooldownMs = (config.cooldown_minutes || 60) * 60 * 1000;
    if (Date.now() - lastTriggered.getTime() < cooldownMs) {
      return {
        alert_config_id: config.id,
        triggered: false,
        triggers: [],
        skipped_reason: 'In cooldown period',
      };
    }
  }

  // Check daily limit
  const { data: todayAlerts } = await supabase
    .from('alert_history')
    .select('id')
    .eq('alert_config_id', config.id)
    .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString());

  if ((todayAlerts?.length || 0) >= (config.max_alerts_per_day || 10)) {
    return {
      alert_config_id: config.id,
      triggered: false,
      triggers: [],
      skipped_reason: 'Daily limit reached',
    };
  }

  // Evaluate based on alert type
  const evaluators: Record<AlertType, () => Promise<AlertTrigger[]>> = {
    trial_expiring: () => evaluateTrialExpiring(supabase, config.trigger_config),
    no_activity: () => evaluateNoActivity(supabase, config.trigger_config),
    engagement_drop: () => evaluateEngagementDrop(supabase, config.trigger_config),
    at_risk: () => evaluateAtRisk(supabase, config.trigger_config),
    follow_up_overdue: () => evaluateFollowUpOverdue(supabase, config.trigger_config),
    stage_change: () => evaluateStageChange(supabase, config.trigger_config),
    health_critical: () => evaluateHealthCritical(supabase, config.trigger_config),
    custom: () => evaluateCustom(supabase, config.trigger_config),
  };

  const triggers = await evaluators[config.alert_type]();

  return {
    alert_config_id: config.id,
    triggered: triggers.length > 0,
    triggers,
  };
}

// Trial Expiring Alert
async function evaluateTrialExpiring(
  supabase: AnySupabaseClient,
  config: Record<string, any>
): Promise<AlertTrigger[]> {
  const daysBefore = config.days_before || 7;
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + daysBefore);

  const { data: orgs } = await supabase
    .from('trial_organizations')
    .select('org_id, org_name, trial_end_date')
    .eq('org_lifecycle_stage', 'trial_active')
    .lte('trial_end_date', targetDate.toISOString())
    .gte('trial_end_date', new Date().toISOString());

  return (orgs || []).map((org: any) => ({
    entity_type: 'trial_organizations',
    entity_id: org.org_id,
    trigger_reason: `Trial expires on ${new Date(org.trial_end_date).toLocaleDateString()}`,
    entity_data: org,
  }));
}

// No Activity Alert
async function evaluateNoActivity(
  supabase: AnySupabaseClient,
  config: Record<string, any>
): Promise<AlertTrigger[]> {
  const days = config.days || 7;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const { data: orgs } = await supabase
    .from('trial_organizations')
    .select('org_id, org_name, last_activity_date')
    .eq('org_lifecycle_stage', 'trial_active')
    .or(`last_activity_date.lt.${cutoffDate.toISOString()},last_activity_date.is.null`);

  return (orgs || []).map((org: any) => ({
    entity_type: 'trial_organizations',
    entity_id: org.org_id,
    trigger_reason: org.last_activity_date
      ? `No activity since ${new Date(org.last_activity_date).toLocaleDateString()}`
      : 'No activity recorded',
    entity_data: org,
  }));
}

// Engagement Drop Alert
async function evaluateEngagementDrop(
  supabase: AnySupabaseClient,
  config: Record<string, any>
): Promise<AlertTrigger[]> {
  const threshold = config.threshold || 30;
  const dropPercent = config.drop_percent || 20;

  const { data: orgs } = await supabase
    .from('trial_organizations')
    .select('org_id, org_name, engagement_score, previous_engagement_score')
    .eq('org_lifecycle_stage', 'trial_active')
    .lt('engagement_score', threshold);

  return (orgs || [])
    .filter((org: any) => {
      // Check if there was a significant drop
      if (org.previous_engagement_score && org.engagement_score) {
        const drop = ((org.previous_engagement_score - org.engagement_score) / org.previous_engagement_score) * 100;
        return drop >= dropPercent;
      }
      return org.engagement_score < threshold;
    })
    .map((org: any) => ({
      entity_type: 'trial_organizations',
      entity_id: org.org_id,
      trigger_reason: `Engagement score: ${org.engagement_score || 0}%`,
      entity_data: org,
    }));
}

// At Risk Alert
async function evaluateAtRisk(
  supabase: AnySupabaseClient,
  config: Record<string, any>
): Promise<AlertTrigger[]> {
  const { data: orgs } = await supabase
    .from('trial_organizations')
    .select('org_id, org_name, deal_momentum, health_status')
    .or('deal_momentum.eq.at_risk,deal_momentum.eq.stalled');

  return (orgs || []).map((org: any) => ({
    entity_type: 'trial_organizations',
    entity_id: org.org_id,
    trigger_reason: `Deal momentum: ${org.deal_momentum}`,
    entity_data: org,
  }));
}

// Follow-up Overdue Alert
async function evaluateFollowUpOverdue(
  supabase: AnySupabaseClient,
  config: Record<string, any>
): Promise<AlertTrigger[]> {
  const { data: followUps } = await supabase
    .from('follow_ups')
    .select(`
      id, title, due_date, priority,
      trial_organizations(org_name)
    `)
    .eq('status', 'pending')
    .lt('due_date', new Date().toISOString());

  return (followUps || []).map((fu: any) => ({
    entity_type: 'follow_ups',
    entity_id: fu.id,
    trigger_reason: `Overdue since ${new Date(fu.due_date).toLocaleDateString()}`,
    entity_data: fu,
  }));
}

// Stage Change Alert
async function evaluateStageChange(
  supabase: AnySupabaseClient,
  config: Record<string, any>
): Promise<AlertTrigger[]> {
  const targetStage = config.to;
  const fromStage = config.from;
  const withinMinutes = config.within_minutes || 60;

  const cutoff = new Date();
  cutoff.setMinutes(cutoff.getMinutes() - withinMinutes);

  // Check activity log for stage changes
  const { data: activities } = await supabase
    .from('trial_activities')
    .select(`
      id, activity_type, notes, created_at, org_id,
      trial_organizations(org_name, org_lifecycle_stage)
    `)
    .eq('activity_type', 'STAGE_CHANGE')
    .gte('created_at', cutoff.toISOString());

  return (activities || [])
    .filter((a: any) => {
      const org = a.trial_organizations;
      if (targetStage && org?.org_lifecycle_stage !== targetStage) return false;
      if (fromStage && fromStage !== 'any') {
        // Would need to check previous stage from notes/metadata
      }
      return true;
    })
    .map((a: any) => ({
      entity_type: 'trial_organizations',
      entity_id: a.org_id,
      trigger_reason: `Stage changed to ${a.trial_organizations?.org_lifecycle_stage}`,
      entity_data: a,
    }));
}

// Health Critical Alert
async function evaluateHealthCritical(
  supabase: AnySupabaseClient,
  config: Record<string, any>
): Promise<AlertTrigger[]> {
  const { data: orgs } = await supabase
    .from('trial_organizations')
    .select('org_id, org_name, health_status, engagement_score')
    .eq('health_status', 'critical')
    .eq('org_lifecycle_stage', 'trial_active');

  return (orgs || []).map((org: any) => ({
    entity_type: 'trial_organizations',
    entity_id: org.org_id,
    trigger_reason: `Health status is critical (engagement: ${org.engagement_score || 0}%)`,
    entity_data: org,
  }));
}

// Custom Alert (placeholder)
async function evaluateCustom(
  supabase: AnySupabaseClient,
  config: Record<string, any>
): Promise<AlertTrigger[]> {
  // Custom alerts would need specific query logic
  return [];
}

// Send alert notification
export async function sendAlertNotification(
  config: AlertConfig,
  triggers: AlertTrigger[]
): Promise<{ success: boolean; error?: string }> {
  if (!config.teams_webhook_url) {
    return { success: false, error: 'No Teams webhook configured' };
  }

  // Build message
  const message = buildAlertMessage(config, triggers);

  try {
    const response = await fetch(config.teams_webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Teams returned ${response.status}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Build Teams alert message
function buildAlertMessage(config: AlertConfig, triggers: AlertTrigger[]): any {
  const severityColors: Record<string, string> = {
    low: 'accent',
    medium: 'warning',
    high: 'attention',
    critical: 'attention',
  };

  const card = {
    type: 'AdaptiveCard',
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
    version: '1.4',
    body: [
      {
        type: 'TextBlock',
        text: `⚠️ ${config.name}`,
        size: 'Large',
        weight: 'Bolder',
        color: severityColors[config.severity] || 'default',
      },
      {
        type: 'TextBlock',
        text: `Severity: ${config.severity.toUpperCase()} | ${triggers.length} trigger(s)`,
        size: 'Small',
        color: 'Accent',
      },
      {
        type: 'Container',
        style: 'emphasis',
        items: triggers.slice(0, 5).map((t) => ({
          type: 'ColumnSet',
          columns: [
            {
              type: 'Column',
              width: 'stretch',
              items: [
                {
                  type: 'TextBlock',
                  text: t.entity_data?.org_name || t.entity_data?.title || t.entity_id,
                  weight: 'Bolder',
                },
                {
                  type: 'TextBlock',
                  text: t.trigger_reason,
                  size: 'Small',
                  color: 'Accent',
                  spacing: 'None',
                },
              ],
            },
          ],
        })),
      },
    ],
  };

  if (triggers.length > 5) {
    card.body.push({
      type: 'TextBlock',
      text: `... and ${triggers.length - 5} more`,
      size: 'Small',
      isSubtle: true,
    } as any);
  }

  return {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: card,
      },
    ],
  };
}

// Record alert in history
export async function recordAlertHistory(
  supabase: AnySupabaseClient,
  alertConfigId: string,
  trigger: AlertTrigger,
  notificationSent: boolean,
  notificationChannel?: string,
  notificationError?: string
): Promise<void> {
  await supabase.from('alert_history').insert({
    alert_config_id: alertConfigId,
    entity_type: trigger.entity_type,
    entity_id: trigger.entity_id,
    trigger_reason: trigger.trigger_reason,
    notification_sent: notificationSent,
    notification_channel: notificationChannel,
    notification_error: notificationError,
  });
}
