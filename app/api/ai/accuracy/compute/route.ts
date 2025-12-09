// AI Accuracy Compute API - Trigger accuracy computation
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  computeAccuracyMetrics,
  saveAccuracyMetrics,
  generateTrainingExamplesFromFeedback,
  calculateConfidenceCorrelation,
} from '@/lib/ai/tuning';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = any;

// POST /api/ai/accuracy/compute - Compute and save accuracy metrics
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
      model_name,
      action_types,
      period_start,
      period_end,
      generate_training_examples = false,
    } = body;

    // Default to last 7 days if no period specified
    const defaultEnd = new Date().toISOString().split('T')[0];
    const defaultStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const periodStart = period_start || defaultStart;
    const periodEnd = period_end || defaultEnd;

    const results: any[] = [];
    const actionTypesToProcess = action_types || [
      'LOG_ACTIVITY',
      'UPDATE_STAGE',
      'UPDATE_HEALTH',
      'CREATE_FOLLOW_UP',
      'UPDATE_STAKEHOLDER',
      null, // Overall
    ];

    // Compute metrics for each action type
    for (const actionType of actionTypesToProcess) {
      try {
        const metrics = await computeAccuracyMetrics(supabase, {
          model_name: model_name || 'default',
          action_type: actionType,
          period_start: periodStart,
          period_end: periodEnd,
        });

        // Calculate confidence correlation
        const correlation = await calculateConfidenceCorrelation(
          supabase,
          periodStart,
          periodEnd
        );

        if (correlation !== null) {
          (metrics as any).confidence_accuracy_correlation = correlation;
        }

        // Save to database
        await saveAccuracyMetrics(supabase, metrics);

        results.push({
          action_type: actionType,
          status: 'success',
          metrics,
        });
      } catch (error) {
        results.push({
          action_type: actionType,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Generate training examples if requested
    let trainingExamplesGenerated = 0;
    if (generate_training_examples) {
      try {
        trainingExamplesGenerated = await generateTrainingExamplesFromFeedback(supabase, {
          since: periodStart,
          max_examples: 100,
        });
      } catch (error) {
        console.error('Error generating training examples:', error);
      }
    }

    return NextResponse.json({
      success: true,
      period: { start: periodStart, end: periodEnd },
      results,
      training_examples_generated: trainingExamplesGenerated,
    });
  } catch (error) {
    console.error('Error computing accuracy metrics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
