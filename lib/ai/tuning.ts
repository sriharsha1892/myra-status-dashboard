// AI Tuning Service
// Computes accuracy metrics and generates training examples from feedback

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = any;

export interface AccuracyComputationResult {
  model_name: string;
  action_type: string | null;
  period_start: string;
  period_end: string;
  total_extractions: number;
  correct_extractions: number;
  accuracy_rate: number;
  field_accuracy: Record<string, number>;
  common_errors: Array<{ error_type: string; count: number; examples: any[] }>;
  avg_confidence: number | null;
}

// Compute accuracy metrics from feedback data
export async function computeAccuracyMetrics(
  supabase: AnySupabaseClient,
  options: {
    model_name?: string;
    action_type?: string;
    period_start: string;
    period_end: string;
  }
): Promise<AccuracyComputationResult> {
  const { model_name = 'default', action_type, period_start, period_end } = options;

  // Get feedback data for the period
  let feedbackQuery = supabase
    .from('ai_feedback')
    .select('*')
    .gte('created_at', period_start)
    .lte('created_at', period_end);

  if (action_type) {
    feedbackQuery = feedbackQuery.eq('action_type', action_type);
  }

  const { data: feedback, error } = await feedbackQuery;

  if (error) {
    console.error('Error fetching feedback:', error);
    throw error;
  }

  // Calculate metrics
  const totalExtractions = feedback?.length || 0;
  let correctExtractions = 0;
  const fieldCorrectCounts: Record<string, { correct: number; total: number }> = {};
  const errorCounts: Record<string, { count: number; examples: any[] }> = {};
  let confidenceSum = 0;
  let confidenceCount = 0;

  feedback?.forEach((fb: any) => {
    // Check if extraction was correct
    const isCorrect = fb.was_correct === true || fb.rating >= 4;
    if (isCorrect) {
      correctExtractions++;
    }

    // Track field-level accuracy
    if (fb.field_feedback) {
      Object.entries(fb.field_feedback).forEach(([field, correct]) => {
        if (!fieldCorrectCounts[field]) {
          fieldCorrectCounts[field] = { correct: 0, total: 0 };
        }
        fieldCorrectCounts[field].total++;
        if (correct) {
          fieldCorrectCounts[field].correct++;
        }
      });
    }

    // Track errors
    if (!isCorrect && fb.error_type) {
      if (!errorCounts[fb.error_type]) {
        errorCounts[fb.error_type] = { count: 0, examples: [] };
      }
      errorCounts[fb.error_type].count++;
      if (errorCounts[fb.error_type].examples.length < 5) {
        errorCounts[fb.error_type].examples.push({
          input: fb.original_input?.substring(0, 200),
          expected: fb.corrected_output,
          actual: fb.extracted_output,
        });
      }
    }

    // Track confidence
    if (fb.confidence !== null && fb.confidence !== undefined) {
      confidenceSum += fb.confidence;
      confidenceCount++;
    }
  });

  // Calculate field accuracy
  const fieldAccuracy: Record<string, number> = {};
  Object.entries(fieldCorrectCounts).forEach(([field, counts]) => {
    fieldAccuracy[field] = counts.total > 0 ? counts.correct / counts.total : 0;
  });

  // Sort errors by count
  const commonErrors = Object.entries(errorCounts)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([type, data]) => ({
      error_type: type,
      count: data.count,
      examples: data.examples,
    }));

  return {
    model_name,
    action_type: action_type || null,
    period_start,
    period_end,
    total_extractions: totalExtractions,
    correct_extractions: correctExtractions,
    accuracy_rate: totalExtractions > 0 ? correctExtractions / totalExtractions : 0,
    field_accuracy: fieldAccuracy,
    common_errors: commonErrors,
    avg_confidence: confidenceCount > 0 ? confidenceSum / confidenceCount : null,
  };
}

// Save computed metrics to database
export async function saveAccuracyMetrics(
  supabase: AnySupabaseClient,
  metrics: AccuracyComputationResult
): Promise<void> {
  const { error } = await supabase
    .from('ai_accuracy_metrics')
    .upsert({
      ...metrics,
      computed_at: new Date().toISOString(),
    }, {
      onConflict: 'model_name,action_type,period_start,period_end',
    });

  if (error) {
    console.error('Error saving accuracy metrics:', error);
    throw error;
  }
}

// Generate training examples from feedback corrections
export async function generateTrainingExamplesFromFeedback(
  supabase: AnySupabaseClient,
  options: {
    since?: string;
    min_quality_threshold?: number;
    max_examples?: number;
  } = {}
): Promise<number> {
  const {
    since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    min_quality_threshold = 0.8,
    max_examples = 50,
  } = options;

  // Get feedback with corrections
  const { data: feedback, error } = await supabase
    .from('ai_feedback')
    .select('*')
    .gte('created_at', since)
    .not('corrected_output', 'is', null)
    .limit(max_examples);

  if (error) {
    console.error('Error fetching feedback for training:', error);
    throw error;
  }

  let createdCount = 0;

  for (const fb of feedback || []) {
    // Skip if already created training example from this feedback
    const { data: existing } = await supabase
      .from('ai_training_examples')
      .select('id')
      .eq('source_feedback_id', fb.id)
      .single();

    if (existing) continue;

    // Determine category
    let category: string;
    if (fb.was_correct === false && fb.error_type) {
      category = 'common_error';
    } else if (fb.confidence && fb.confidence < 0.5) {
      category = 'edge_case';
    } else {
      category = 'positive';
    }

    // Create training example
    const { error: insertError } = await supabase
      .from('ai_training_examples')
      .insert({
        action_type: fb.action_type,
        category,
        input_text: fb.original_input,
        expected_output: fb.corrected_output || fb.extracted_output,
        explanation: fb.feedback_text || null,
        quality_score: fb.rating ? fb.rating / 5 : min_quality_threshold,
        validation_status: 'pending',
        source: 'correction',
        source_feedback_id: fb.id,
        is_active: true,
      });

    if (!insertError) {
      createdCount++;
    }
  }

  return createdCount;
}

// Get training examples for a specific action type
export async function getTrainingExamplesForAction(
  supabase: AnySupabaseClient,
  actionType: string,
  options: {
    limit?: number;
    includeEdgeCases?: boolean;
    validatedOnly?: boolean;
  } = {}
): Promise<any[]> {
  const { limit = 20, includeEdgeCases = true, validatedOnly = false } = options;

  let query = supabase
    .from('ai_training_examples')
    .select('*')
    .eq('action_type', actionType)
    .eq('is_active', true)
    .order('quality_score', { ascending: false });

  if (validatedOnly) {
    query = query.eq('validation_status', 'validated');
  }

  if (!includeEdgeCases) {
    query = query.neq('category', 'edge_case');
  }

  query = query.limit(limit);

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching training examples:', error);
    throw error;
  }

  return data || [];
}

// Format training examples for prompt inclusion
export function formatTrainingExamplesForPrompt(examples: any[]): string {
  if (examples.length === 0) return '';

  const formattedExamples = examples.map((ex, index) => {
    const output = typeof ex.expected_output === 'object'
      ? JSON.stringify(ex.expected_output, null, 2)
      : ex.expected_output;

    return `Example ${index + 1}:
Input: ${ex.input_text}
Expected Output: ${output}${ex.explanation ? `\nExplanation: ${ex.explanation}` : ''}`;
  });

  return `\n\nHere are some training examples:\n\n${formattedExamples.join('\n\n---\n\n')}`;
}

// Calculate confidence-accuracy correlation
export async function calculateConfidenceCorrelation(
  supabase: AnySupabaseClient,
  periodStart: string,
  periodEnd: string
): Promise<number | null> {
  const { data: feedback } = await supabase
    .from('ai_feedback')
    .select('confidence, was_correct')
    .gte('created_at', periodStart)
    .lte('created_at', periodEnd)
    .not('confidence', 'is', null)
    .not('was_correct', 'is', null);

  if (!feedback || feedback.length < 10) {
    return null;
  }

  // Calculate Pearson correlation
  const n = feedback.length;
  const confidences = feedback.map((f: any) => f.confidence);
  const correctness = feedback.map((f: any) => f.was_correct ? 1 : 0);

  const sumX = confidences.reduce((a: number, b: number) => a + b, 0);
  const sumY = correctness.reduce((a: number, b: number) => a + b, 0);
  const sumXY = confidences.reduce((sum: number, x: number, i: number) => sum + x * correctness[i], 0);
  const sumX2 = confidences.reduce((sum: number, x: number) => sum + x * x, 0);
  const sumY2 = correctness.reduce((sum: number, y: number) => sum + y * y, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  if (denominator === 0) return null;

  return numerator / denominator;
}
