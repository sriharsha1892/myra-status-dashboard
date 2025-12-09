// Alert Evaluation API - Trigger alert evaluation
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  evaluateAlerts,
  sendAlertNotification,
  recordAlertHistory,
  AlertConfig,
} from '@/lib/alerts/evaluator';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = any;

// POST /api/alerts/evaluate - Evaluate all active alerts
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient() as AnySupabaseClient;
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { alert_id, dry_run = false } = body;

    // If specific alert_id provided, evaluate only that alert
    if (alert_id) {
      const { data: config, error } = await supabase
        .from('alert_configurations')
        .select('*')
        .eq('id', alert_id)
        .eq('is_active', true)
        .single();

      if (error || !config) {
        return NextResponse.json({ error: 'Alert not found or inactive' }, { status: 404 });
      }

      // Evaluate single alert
      const results = await evaluateAlerts(supabase);
      const result = results.find(r => r.alert_config_id === alert_id);

      if (!result) {
        return NextResponse.json({ error: 'Evaluation failed' }, { status: 500 });
      }

      // Send notifications if not dry run and triggers found
      if (!dry_run && result.triggered && result.triggers.length > 0) {
        const notificationResult = await sendAlertNotification(config as AlertConfig, result.triggers);

        // Record history
        for (const trigger of result.triggers) {
          await recordAlertHistory(
            supabase,
            config.id,
            trigger,
            notificationResult.success,
            'teams',
            notificationResult.error
          );
        }

        // Update alert config
        await supabase
          .from('alert_configurations')
          .update({
            last_triggered_at: new Date().toISOString(),
            total_alerts_sent: (config.total_alerts_sent || 0) + result.triggers.length,
          })
          .eq('id', config.id);
      }

      return NextResponse.json({
        evaluated: 1,
        triggered: result.triggered ? 1 : 0,
        results: [result],
        dry_run,
      });
    }

    // Evaluate all active alerts
    const results = await evaluateAlerts(supabase);

    if (!dry_run) {
      // Process triggered alerts
      for (const result of results) {
        if (result.triggered && result.triggers.length > 0) {
          const { data: config } = await supabase
            .from('alert_configurations')
            .select('*')
            .eq('id', result.alert_config_id)
            .single();

          if (config) {
            const notificationResult = await sendAlertNotification(config as AlertConfig, result.triggers);

            // Record history for each trigger
            for (const trigger of result.triggers) {
              await recordAlertHistory(
                supabase,
                config.id,
                trigger,
                notificationResult.success,
                'teams',
                notificationResult.error
              );
            }

            // Update alert config
            await supabase
              .from('alert_configurations')
              .update({
                last_triggered_at: new Date().toISOString(),
                total_alerts_sent: (config.total_alerts_sent || 0) + result.triggers.length,
              })
              .eq('id', config.id);
          }
        }
      }
    }

    const triggered = results.filter(r => r.triggered).length;
    const totalTriggers = results.reduce((sum, r) => sum + r.triggers.length, 0);

    return NextResponse.json({
      evaluated: results.length,
      triggered,
      total_triggers: totalTriggers,
      results,
      dry_run,
    });
  } catch (error) {
    console.error('Error evaluating alerts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
