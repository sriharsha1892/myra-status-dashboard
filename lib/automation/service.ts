/**
 * Automation Service
 * CRUD operations for automation rules
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type {
  AutomationRule,
  CreateAutomationRule,
  UpdateAutomationRule,
  AutomationExecution,
  AutomationEntityType,
} from './types';
import { createAutomationRuleSchema, updateAutomationRuleSchema } from './schemas';

const RULES_TABLE = 'automation_rules';
const EXECUTIONS_TABLE = 'automation_executions';

// ============================================
// Rules CRUD
// ============================================

/**
 * Get all automation rules
 */
export async function getAutomationRules(
  supabase: SupabaseClient,
  options?: {
    entityType?: AutomationEntityType;
    activeOnly?: boolean;
    limit?: number;
  }
): Promise<AutomationRule[]> {
  let query = supabase
    .from(RULES_TABLE)
    .select('*')
    .order('created_at', { ascending: false });

  if (options?.entityType) {
    query = query.eq('entity_type', options.entityType);
  }

  if (options?.activeOnly) {
    query = query.eq('is_active', true);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch automation rules: ${error.message}`);
  }

  return data || [];
}

/**
 * Get a single automation rule by ID
 */
export async function getAutomationRuleById(
  supabase: SupabaseClient,
  id: string
): Promise<AutomationRule | null> {
  const { data, error } = await supabase
    .from(RULES_TABLE)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch automation rule: ${error.message}`);
  }

  return data;
}

/**
 * Create a new automation rule
 */
export async function createAutomationRule(
  supabase: SupabaseClient,
  input: CreateAutomationRule,
  userId?: string
): Promise<AutomationRule> {
  // Validate input
  const validation = createAutomationRuleSchema.safeParse(input);
  if (!validation.success) {
    throw new Error(`Validation error: ${validation.error.issues.map(e => e.message).join(', ')}`);
  }

  const { data, error } = await supabase
    .from(RULES_TABLE)
    .insert({
      ...validation.data,
      created_by: userId,
      updated_by: userId,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create automation rule: ${error.message}`);
  }

  return data;
}

/**
 * Update an automation rule
 */
export async function updateAutomationRule(
  supabase: SupabaseClient,
  id: string,
  input: UpdateAutomationRule,
  userId?: string
): Promise<AutomationRule> {
  // Validate input
  const validation = updateAutomationRuleSchema.safeParse(input);
  if (!validation.success) {
    throw new Error(`Validation error: ${validation.error.issues.map(e => e.message).join(', ')}`);
  }

  const { data, error } = await supabase
    .from(RULES_TABLE)
    .update({
      ...validation.data,
      updated_by: userId,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update automation rule: ${error.message}`);
  }

  return data;
}

/**
 * Delete an automation rule
 */
export async function deleteAutomationRule(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from(RULES_TABLE)
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to delete automation rule: ${error.message}`);
  }
}

/**
 * Toggle rule active status
 */
export async function toggleAutomationRule(
  supabase: SupabaseClient,
  id: string,
  isActive: boolean,
  userId?: string
): Promise<AutomationRule> {
  const { data, error } = await supabase
    .from(RULES_TABLE)
    .update({
      is_active: isActive,
      updated_by: userId,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to toggle automation rule: ${error.message}`);
  }

  return data;
}

// ============================================
// Executions
// ============================================

/**
 * Get execution history for a rule
 */
export async function getRuleExecutions(
  supabase: SupabaseClient,
  ruleId: string,
  options?: {
    limit?: number;
    status?: string;
  }
): Promise<AutomationExecution[]> {
  let query = supabase
    .from(EXECUTIONS_TABLE)
    .select('*')
    .eq('rule_id', ruleId)
    .order('started_at', { ascending: false });

  if (options?.status) {
    query = query.eq('status', options.status);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch executions: ${error.message}`);
  }

  return data || [];
}

/**
 * Create an execution record
 */
export async function createExecution(
  supabase: SupabaseClient,
  execution: {
    rule_id: string;
    entity_type: string;
    entity_id: string;
    status: 'pending' | 'running';
    entity_snapshot?: Record<string, unknown>;
  }
): Promise<AutomationExecution> {
  const { data, error } = await supabase
    .from(EXECUTIONS_TABLE)
    .insert(execution)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create execution: ${error.message}`);
  }

  return data;
}

/**
 * Update execution status
 */
export async function updateExecution(
  supabase: SupabaseClient,
  id: string,
  update: {
    status: string;
    actions_executed?: unknown[];
    error_message?: string;
    completed_at?: string;
  }
): Promise<void> {
  const { error } = await supabase
    .from(EXECUTIONS_TABLE)
    .update(update)
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to update execution: ${error.message}`);
  }
}

/**
 * Check if rule can execute for entity (cooldown check)
 */
export async function canExecuteRule(
  supabase: SupabaseClient,
  ruleId: string,
  entityId: string,
  cooldownMinutes: number
): Promise<boolean> {
  const cooldownTime = new Date();
  cooldownTime.setMinutes(cooldownTime.getMinutes() - cooldownMinutes);

  const { data, error } = await supabase
    .from(EXECUTIONS_TABLE)
    .select('id')
    .eq('rule_id', ruleId)
    .eq('entity_id', entityId)
    .eq('status', 'completed')
    .gte('completed_at', cooldownTime.toISOString())
    .limit(1);

  if (error) {
    console.error('Error checking cooldown:', error);
    return false;
  }

  return (data || []).length === 0;
}

/**
 * Update rule execution stats
 */
export async function updateRuleStats(
  supabase: SupabaseClient,
  ruleId: string
): Promise<void> {
  const { error } = await supabase
    .from(RULES_TABLE)
    .update({
      last_executed_at: new Date().toISOString(),
      execution_count: supabase.rpc('increment_count', { row_id: ruleId }),
    })
    .eq('id', ruleId);

  if (error) {
    console.error('Error updating rule stats:', error);
  }
}

// ============================================
// Export
// ============================================

export const automationService = {
  // Rules
  getRules: getAutomationRules,
  getRuleById: getAutomationRuleById,
  createRule: createAutomationRule,
  updateRule: updateAutomationRule,
  deleteRule: deleteAutomationRule,
  toggleRule: toggleAutomationRule,

  // Executions
  getExecutions: getRuleExecutions,
  createExecution,
  updateExecution,
  canExecuteRule,
  updateRuleStats,
};

export default automationService;
