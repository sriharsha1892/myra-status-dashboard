import { createClient } from '@/lib/supabase/server';
import type {
  PromptTemplate,
  PromptOverride,
  PromptExecution,
  ResolvedPrompt,
  PromptTemplateInput,
  PromptOverrideInput,
  TemplateWithOverrides,
} from './types';

// Type for execution stats query result
interface ExecutionStatsRow {
  success: boolean;
  duration_ms: number | null;
  confidence_score: number | null;
  user_feedback: string | null;
}

// Helper to get typed table access
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = any;

// ============================================
// Template Operations
// ============================================

export async function getPromptTemplates(
  category?: string,
  activeOnly = true
): Promise<PromptTemplate[]> {
  const supabase = await createClient() as AnySupabaseClient;

  let query = supabase
    .from('ai_prompt_templates')
    .select('*')
    .order('category')
    .order('template_name');

  if (category) {
    query = query.eq('category', category);
  }

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching prompt templates:', error);
    throw new Error('Failed to fetch prompt templates');
  }

  return (data || []) as PromptTemplate[];
}

export async function getPromptTemplate(id: string): Promise<PromptTemplate | null> {
  const supabase = await createClient() as AnySupabaseClient;

  const { data, error } = await supabase
    .from('ai_prompt_templates')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching prompt template:', error);
    throw new Error('Failed to fetch prompt template');
  }

  return data as PromptTemplate;
}

export async function getPromptTemplateByKey(key: string): Promise<PromptTemplate | null> {
  const supabase = await createClient() as AnySupabaseClient;

  const { data, error } = await supabase
    .from('ai_prompt_templates')
    .select('*')
    .eq('template_key', key)
    .eq('is_active', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching prompt template by key:', error);
    throw new Error('Failed to fetch prompt template');
  }

  return data as PromptTemplate;
}

export async function createPromptTemplate(
  input: PromptTemplateInput,
  userId?: string
): Promise<PromptTemplate> {
  const supabase = await createClient() as AnySupabaseClient;

  const insertData = {
    ...input,
    created_by: userId,
    updated_by: userId,
  };

  const { data, error } = await supabase
    .from('ai_prompt_templates')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('Error creating prompt template:', error);
    throw new Error('Failed to create prompt template');
  }

  return data as PromptTemplate;
}

export async function updatePromptTemplate(
  id: string,
  input: Partial<PromptTemplateInput>,
  userId?: string
): Promise<PromptTemplate> {
  const supabase = await createClient() as AnySupabaseClient;

  // Increment version on update
  const { data: existing } = await supabase
    .from('ai_prompt_templates')
    .select('version')
    .eq('id', id)
    .single();

  const updateData = {
    ...input,
    version: ((existing?.version as number) || 0) + 1,
    updated_by: userId,
  };

  const { data, error } = await supabase
    .from('ai_prompt_templates')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating prompt template:', error);
    throw new Error('Failed to update prompt template');
  }

  return data as PromptTemplate;
}

export async function deletePromptTemplate(id: string): Promise<void> {
  const supabase = await createClient() as AnySupabaseClient;

  const { error } = await supabase
    .from('ai_prompt_templates')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting prompt template:', error);
    throw new Error('Failed to delete prompt template');
  }
}

// ============================================
// Override Operations
// ============================================

export async function getPromptOverrides(
  templateId?: string,
  orgId?: string
): Promise<PromptOverride[]> {
  const supabase = await createClient() as AnySupabaseClient;

  let query = supabase
    .from('ai_prompt_overrides')
    .select('*')
    .order('created_at', { ascending: false });

  if (templateId) {
    query = query.eq('template_id', templateId);
  }

  if (orgId) {
    query = query.eq('org_id', orgId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching prompt overrides:', error);
    throw new Error('Failed to fetch prompt overrides');
  }

  return (data || []) as PromptOverride[];
}

export async function getPromptOverride(
  templateId: string,
  orgId: string
): Promise<PromptOverride | null> {
  const supabase = await createClient() as AnySupabaseClient;

  const { data, error } = await supabase
    .from('ai_prompt_overrides')
    .select('*')
    .eq('template_id', templateId)
    .eq('org_id', orgId)
    .eq('is_active', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching prompt override:', error);
    throw new Error('Failed to fetch prompt override');
  }

  return data as PromptOverride;
}

export async function createOrUpdatePromptOverride(
  input: PromptOverrideInput,
  userId?: string
): Promise<PromptOverride> {
  const supabase = await createClient() as AnySupabaseClient;

  // Check if override already exists
  const { data: existing } = await supabase
    .from('ai_prompt_overrides')
    .select('id')
    .eq('template_id', input.template_id)
    .eq('org_id', input.org_id)
    .single();

  if (existing) {
    // Update existing
    const updateData = {
      ...input,
      updated_by: userId,
    };

    const { data, error } = await supabase
      .from('ai_prompt_overrides')
      .update(updateData)
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating prompt override:', error);
      throw new Error('Failed to update prompt override');
    }

    return data as PromptOverride;
  } else {
    // Create new
    const insertData = {
      ...input,
      created_by: userId,
      updated_by: userId,
    };

    const { data, error } = await supabase
      .from('ai_prompt_overrides')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error creating prompt override:', error);
      throw new Error('Failed to create prompt override');
    }

    return data as PromptOverride;
  }
}

export async function deletePromptOverride(id: string): Promise<void> {
  const supabase = await createClient() as AnySupabaseClient;

  const { error } = await supabase
    .from('ai_prompt_overrides')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting prompt override:', error);
    throw new Error('Failed to delete prompt override');
  }
}

// ============================================
// Resolved Prompt (with overrides applied)
// ============================================

export async function getResolvedPrompt(
  templateKey: string,
  orgId?: string
): Promise<ResolvedPrompt | null> {
  const template = await getPromptTemplateByKey(templateKey);

  if (!template) {
    return null;
  }

  let override: PromptOverride | null = null;

  if (orgId) {
    override = await getPromptOverride(template.id, orgId);
  }

  // Build resolved prompt with overrides applied
  const resolved: ResolvedPrompt = {
    template_key: template.template_key,
    template_name: template.template_name,
    system_prompt: override?.system_prompt_override || template.system_prompt,
    user_prompt_template: override?.user_prompt_template_override || template.user_prompt_template,
    model: override?.model_override || template.model,
    temperature: override?.temperature_override ?? template.temperature,
    max_tokens: override?.max_tokens_override ?? template.max_tokens,
    available_variables: template.available_variables,
    template_id: template.id,
    override_id: override?.id || null,
    has_override: !!override,
  };

  // Append additional instructions if present
  if (override?.additional_instructions) {
    resolved.system_prompt += `\n\nAdditional Instructions:\n${override.additional_instructions}`;
  }

  // Append custom examples if present
  if (override?.custom_examples && override.custom_examples.length > 0) {
    const examplesText = override.custom_examples
      .map((ex, i) => `Example ${i + 1}:\nInput: ${ex.input}\nOutput: ${ex.output}`)
      .join('\n\n');
    resolved.system_prompt += `\n\nExamples:\n${examplesText}`;
  }

  return resolved;
}

// ============================================
// Execution Logging
// ============================================

export async function logPromptExecution(execution: {
  template_id?: string;
  override_id?: string;
  org_id?: string;
  model_used: string;
  input_tokens?: number;
  output_tokens?: number;
  duration_ms?: number;
  success: boolean;
  confidence_score?: number;
  error_message?: string;
}): Promise<PromptExecution> {
  const supabase = await createClient() as AnySupabaseClient;

  const { data, error } = await supabase
    .from('ai_prompt_executions')
    .insert(execution)
    .select()
    .single();

  if (error) {
    console.error('Error logging prompt execution:', error);
    // Don't throw - logging shouldn't break the main flow
    return execution as PromptExecution;
  }

  return data as PromptExecution;
}

export async function updateExecutionFeedback(
  executionId: string,
  feedback: 'positive' | 'negative' | 'neutral',
  notes?: string
): Promise<void> {
  const supabase = await createClient() as AnySupabaseClient;

  const updateData = {
    user_feedback: feedback,
    feedback_notes: notes,
  };

  const { error } = await supabase
    .from('ai_prompt_executions')
    .update(updateData)
    .eq('id', executionId);

  if (error) {
    console.error('Error updating execution feedback:', error);
    throw new Error('Failed to update feedback');
  }
}

export async function getExecutionStats(
  templateId?: string,
  orgId?: string,
  days = 30
): Promise<{
  total: number;
  successful: number;
  failed: number;
  avg_duration_ms: number;
  avg_confidence: number;
  positive_feedback: number;
  negative_feedback: number;
}> {
  const supabase = await createClient() as AnySupabaseClient;

  const since = new Date();
  since.setDate(since.getDate() - days);

  let query = supabase
    .from('ai_prompt_executions')
    .select('success, duration_ms, confidence_score, user_feedback')
    .gte('executed_at', since.toISOString());

  if (templateId) {
    query = query.eq('template_id', templateId);
  }

  if (orgId) {
    query = query.eq('org_id', orgId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching execution stats:', error);
    throw new Error('Failed to fetch execution stats');
  }

  const executions = (data || []) as ExecutionStatsRow[];
  const successful = executions.filter(e => e.success);
  const durations = executions.filter(e => e.duration_ms != null).map(e => e.duration_ms!);
  const confidences = executions.filter(e => e.confidence_score != null).map(e => e.confidence_score!);

  return {
    total: executions.length,
    successful: successful.length,
    failed: executions.length - successful.length,
    avg_duration_ms: durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0,
    avg_confidence: confidences.length > 0
      ? confidences.reduce((a, b) => a + b, 0) / confidences.length
      : 0,
    positive_feedback: executions.filter(e => e.user_feedback === 'positive').length,
    negative_feedback: executions.filter(e => e.user_feedback === 'negative').length,
  };
}

// ============================================
// Template with Overrides
// ============================================

export async function getTemplatesWithOverrides(): Promise<TemplateWithOverrides[]> {
  const supabase = await createClient() as AnySupabaseClient;

  const { data: templates, error: templatesError } = await supabase
    .from('ai_prompt_templates')
    .select('*')
    .order('category')
    .order('template_name');

  if (templatesError) {
    console.error('Error fetching templates:', templatesError);
    throw new Error('Failed to fetch templates');
  }

  const { data: overrides, error: overridesError } = await supabase
    .from('ai_prompt_overrides')
    .select('*');

  if (overridesError) {
    console.error('Error fetching overrides:', overridesError);
    throw new Error('Failed to fetch overrides');
  }

  const templateList = (templates || []) as PromptTemplate[];
  const overrideList = (overrides || []) as PromptOverride[];

  // Group overrides by template
  const overridesByTemplate = overrideList.reduce((acc, override) => {
    if (!acc[override.template_id]) {
      acc[override.template_id] = [];
    }
    acc[override.template_id].push(override);
    return acc;
  }, {} as Record<string, PromptOverride[]>);

  return templateList.map(template => ({
    ...template,
    overrides: overridesByTemplate[template.id] || [],
  }));
}
