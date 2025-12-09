// AI Accuracy Metrics API - Track AI extraction performance
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = any;

// GET /api/ai/accuracy - Get accuracy metrics
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient() as AnySupabaseClient;
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const model_name = searchParams.get('model_name');
    const action_type = searchParams.get('action_type');
    const period = searchParams.get('period') || 'last_30_days';

    // Calculate date range
    const { startDate, endDate } = getDateRange(period);

    let query = supabase
      .from('ai_accuracy_metrics')
      .select('*')
      .gte('period_start', startDate)
      .lte('period_end', endDate)
      .order('period_start', { ascending: false });

    if (model_name) {
      query = query.eq('model_name', model_name);
    }

    if (action_type) {
      query = query.eq('action_type', action_type);
    }

    const { data: metrics, error } = await query;

    if (error) {
      console.error('Error fetching accuracy metrics:', error);
      return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
    }

    // Calculate aggregate stats
    const totalExtractions = metrics?.reduce((sum, m) => sum + (m.total_extractions || 0), 0) || 0;
    const correctExtractions = metrics?.reduce((sum, m) => sum + (m.correct_extractions || 0), 0) || 0;
    const overallAccuracy = totalExtractions > 0 ? correctExtractions / totalExtractions : 0;

    // Get action type breakdown
    const actionTypeStats: Record<string, { total: number; correct: number; accuracy: number }> = {};
    metrics?.forEach((m: any) => {
      if (m.action_type) {
        if (!actionTypeStats[m.action_type]) {
          actionTypeStats[m.action_type] = { total: 0, correct: 0, accuracy: 0 };
        }
        actionTypeStats[m.action_type].total += m.total_extractions || 0;
        actionTypeStats[m.action_type].correct += m.correct_extractions || 0;
      }
    });

    // Calculate accuracy for each action type
    Object.keys(actionTypeStats).forEach((key) => {
      const stats = actionTypeStats[key];
      stats.accuracy = stats.total > 0 ? stats.correct / stats.total : 0;
    });

    // Aggregate field accuracy across metrics
    const fieldAccuracyTotals: Record<string, { sum: number; count: number }> = {};
    metrics?.forEach((m: any) => {
      if (m.field_accuracy) {
        Object.entries(m.field_accuracy).forEach(([field, accuracy]) => {
          if (!fieldAccuracyTotals[field]) {
            fieldAccuracyTotals[field] = { sum: 0, count: 0 };
          }
          fieldAccuracyTotals[field].sum += accuracy as number;
          fieldAccuracyTotals[field].count++;
        });
      }
    });

    const fieldAccuracy: Record<string, number> = {};
    Object.entries(fieldAccuracyTotals).forEach(([field, data]) => {
      fieldAccuracy[field] = data.count > 0 ? data.sum / data.count : 0;
    });

    // Collect common errors
    const allErrors: Record<string, { count: number; examples: any[] }> = {};
    metrics?.forEach((m: any) => {
      m.common_errors?.forEach((err: any) => {
        if (!allErrors[err.error_type]) {
          allErrors[err.error_type] = { count: 0, examples: [] };
        }
        allErrors[err.error_type].count += err.count || 0;
        if (err.examples) {
          allErrors[err.error_type].examples.push(...err.examples.slice(0, 3));
        }
      });
    });

    const topErrors = Object.entries(allErrors)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([type, data]) => ({
        error_type: type,
        count: data.count,
        examples: data.examples.slice(0, 5),
      }));

    return NextResponse.json({
      metrics: metrics || [],
      summary: {
        overall_accuracy: overallAccuracy,
        total_extractions: totalExtractions,
        correct_extractions: correctExtractions,
        action_type_breakdown: actionTypeStats,
        field_accuracy: fieldAccuracy,
        top_errors: topErrors,
        period: { start: startDate, end: endDate },
      },
    });
  } catch (error) {
    console.error('Error in accuracy metrics API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/ai/accuracy - Record accuracy metric
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
      action_type,
      period_start,
      period_end,
      total_extractions,
      correct_extractions,
      field_accuracy,
      common_errors,
      avg_confidence,
      confidence_accuracy_correlation,
    } = body;

    if (!period_start || !period_end) {
      return NextResponse.json({ error: 'period_start and period_end are required' }, { status: 400 });
    }

    // Calculate accuracy rate
    const accuracy_rate = total_extractions > 0 ? correct_extractions / total_extractions : null;

    const { data, error } = await supabase
      .from('ai_accuracy_metrics')
      .upsert({
        model_name: model_name || 'default',
        action_type: action_type || null,
        period_start,
        period_end,
        total_extractions: total_extractions || 0,
        correct_extractions: correct_extractions || 0,
        accuracy_rate,
        field_accuracy: field_accuracy || {},
        common_errors: common_errors || [],
        avg_confidence: avg_confidence || null,
        confidence_accuracy_correlation: confidence_accuracy_correlation || null,
        computed_at: new Date().toISOString(),
      }, {
        onConflict: 'model_name,action_type,period_start,period_end',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating accuracy metric:', error);
      return NextResponse.json({ error: 'Failed to create metric' }, { status: 500 });
    }

    return NextResponse.json({ metric: data }, { status: 201 });
  } catch (error) {
    console.error('Error creating accuracy metric:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper to calculate date range
function getDateRange(period: string): { startDate: string; endDate: string } {
  const now = new Date();
  const endDate = now.toISOString().split('T')[0];
  let startDate: string;

  switch (period) {
    case 'last_7_days':
      startDate = new Date(now.setDate(now.getDate() - 7)).toISOString().split('T')[0];
      break;
    case 'last_30_days':
      startDate = new Date(now.setDate(now.getDate() - 30)).toISOString().split('T')[0];
      break;
    case 'last_90_days':
      startDate = new Date(now.setDate(now.getDate() - 90)).toISOString().split('T')[0];
      break;
    case 'this_month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      break;
    case 'last_month':
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      startDate = lastMonth.toISOString().split('T')[0];
      break;
    default:
      startDate = new Date(now.setDate(now.getDate() - 30)).toISOString().split('T')[0];
  }

  return { startDate, endDate: new Date().toISOString().split('T')[0] };
}
