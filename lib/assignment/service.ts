// Assignment Service - CRUD operations and assignment execution

import { createClient } from '@/lib/supabase/server';
import type {
  AssignmentRule,
  AssignmentHistory,
  TeamCapacity,
  CreateRuleInput,
  UpdateRuleInput,
  TrialContext,
  AssignmentResult,
} from './types';
import {
  findMatchingRule,
  getNextRoundRobinUser,
  getLoadBalancedUser,
  explainRuleMatch,
} from './engine';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = any;

// ============================================
// Assignment Rules CRUD
// ============================================

export async function getAssignmentRules(
  activeOnly = false
): Promise<AssignmentRule[]> {
  const supabase = await createClient() as AnySupabaseClient;

  let query = supabase
    .from('assignment_rules')
    .select('*')
    .order('priority', { ascending: true });

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching assignment rules:', error);
    throw new Error('Failed to fetch assignment rules');
  }

  return (data || []) as AssignmentRule[];
}

export async function getAssignmentRule(id: string): Promise<AssignmentRule | null> {
  const supabase = await createClient() as AnySupabaseClient;

  const { data, error } = await supabase
    .from('assignment_rules')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching assignment rule:', error);
    throw new Error('Failed to fetch assignment rule');
  }

  return data as AssignmentRule;
}

export async function createAssignmentRule(
  input: CreateRuleInput,
  userId: string
): Promise<AssignmentRule> {
  const supabase = await createClient() as AnySupabaseClient;

  const { data, error } = await supabase
    .from('assignment_rules')
    .insert({
      name: input.name,
      description: input.description || null,
      priority: input.priority || 100,
      conditions: input.conditions,
      match_type: input.match_type || 'all',
      assignment_type: input.assignment_type,
      assigned_user_id: input.assigned_user_id || null,
      round_robin_pool: input.round_robin_pool || [],
      set_status: input.set_status || null,
      add_tags: input.add_tags || [],
      notify_on_assignment: input.notify_on_assignment ?? true,
      created_by: userId,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating assignment rule:', error);
    throw new Error('Failed to create assignment rule');
  }

  return data as AssignmentRule;
}

export async function updateAssignmentRule(
  id: string,
  input: UpdateRuleInput
): Promise<AssignmentRule> {
  const supabase = await createClient() as AnySupabaseClient;

  const updates: Record<string, unknown> = {};

  if (input.name !== undefined) updates.name = input.name;
  if (input.description !== undefined) updates.description = input.description;
  if (input.priority !== undefined) updates.priority = input.priority;
  if (input.is_active !== undefined) updates.is_active = input.is_active;
  if (input.conditions !== undefined) updates.conditions = input.conditions;
  if (input.match_type !== undefined) updates.match_type = input.match_type;
  if (input.assignment_type !== undefined) updates.assignment_type = input.assignment_type;
  if (input.assigned_user_id !== undefined) updates.assigned_user_id = input.assigned_user_id;
  if (input.round_robin_pool !== undefined) updates.round_robin_pool = input.round_robin_pool;
  if (input.set_status !== undefined) updates.set_status = input.set_status;
  if (input.add_tags !== undefined) updates.add_tags = input.add_tags;
  if (input.notify_on_assignment !== undefined) updates.notify_on_assignment = input.notify_on_assignment;

  const { data, error } = await supabase
    .from('assignment_rules')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating assignment rule:', error);
    throw new Error('Failed to update assignment rule');
  }

  return data as AssignmentRule;
}

export async function deleteAssignmentRule(id: string): Promise<void> {
  const supabase = await createClient() as AnySupabaseClient;

  const { error } = await supabase
    .from('assignment_rules')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting assignment rule:', error);
    throw new Error('Failed to delete assignment rule');
  }
}

// ============================================
// Team Capacity
// ============================================

export async function getTeamCapacities(): Promise<TeamCapacity[]> {
  const supabase = await createClient() as AnySupabaseClient;

  const { data, error } = await supabase
    .from('team_capacity')
    .select('*')
    .order('current_active_count', { ascending: true });

  if (error) {
    console.error('Error fetching team capacities:', error);
    throw new Error('Failed to fetch team capacities');
  }

  return (data || []) as TeamCapacity[];
}

export async function updateTeamCapacity(
  userId: string,
  updates: Partial<Omit<TeamCapacity, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<TeamCapacity> {
  const supabase = await createClient() as AnySupabaseClient;

  // Upsert to handle creation if not exists
  const { data, error } = await supabase
    .from('team_capacity')
    .upsert({
      user_id: userId,
      ...updates,
    }, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) {
    console.error('Error updating team capacity:', error);
    throw new Error('Failed to update team capacity');
  }

  return data as TeamCapacity;
}

// ============================================
// Assignment Execution
// ============================================

export async function assignTrial(
  context: TrialContext,
  assignedBy?: string
): Promise<AssignmentResult> {
  const supabase = await createClient() as AnySupabaseClient;

  try {
    // Get all active rules
    const rules = await getAssignmentRules(true);

    // Find matching rule
    const matchedRule = findMatchingRule(rules, context);

    if (!matchedRule) {
      return {
        success: false,
        reason: 'No matching assignment rule found',
      };
    }

    let assignedUserId: string | null = null;
    let method: string = 'rule';

    // Determine who to assign to
    switch (matchedRule.assignment_type) {
      case 'user':
        assignedUserId = matchedRule.assigned_user_id;
        method = 'rule';
        break;

      case 'round_robin':
        if (matchedRule.round_robin_pool.length > 0) {
          const { userId, nextIndex } = getNextRoundRobinUser(
            matchedRule.round_robin_pool,
            matchedRule.last_assigned_index
          );
          assignedUserId = userId;
          method = 'round_robin';

          // Update last assigned index
          await supabase
            .from('assignment_rules')
            .update({ last_assigned_index: nextIndex })
            .eq('id', matchedRule.id);
        }
        break;

      case 'load_balanced':
        if (matchedRule.round_robin_pool.length > 0) {
          const capacities = await getTeamCapacities();
          assignedUserId = getLoadBalancedUser(matchedRule.round_robin_pool, capacities);
          method = 'load_balanced';
        }
        break;
    }

    if (!assignedUserId) {
      return {
        success: false,
        error: 'Could not determine assignee',
      };
    }

    // Get current assignee
    const { data: orgData } = await supabase
      .from('trial_organizations')
      .select('account_manager')
      .eq('org_id', context.org_id)
      .single();

    const previousAssignee = orgData?.account_manager || null;

    // Update the organization's account manager
    const { error: updateError } = await supabase
      .from('trial_organizations')
      .update({ account_manager: assignedUserId })
      .eq('org_id', context.org_id);

    if (updateError) {
      throw new Error('Failed to update organization assignment');
    }

    // Log assignment history
    await supabase
      .from('assignment_history')
      .insert({
        org_id: context.org_id,
        assigned_to: assignedUserId,
        previous_assignee: previousAssignee,
        assignment_method: method,
        rule_id: matchedRule.id,
        rule_name: matchedRule.name,
        match_reason: explainRuleMatch(matchedRule, context),
        assigned_by: assignedBy || null,
      });

    // Increment rule match count
    await supabase.rpc('increment_rule_match_count', { rule_uuid: matchedRule.id });

    // Update capacity counter for the assigned user
    await supabase.rpc('increment_assignment_count', { user_uuid: assignedUserId }).catch(() => {
      // Silently fail if RPC doesn't exist
    });

    // Get assignee name for response
    const { data: userData } = await supabase
      .from('users')
      .select('name')
      .eq('id', assignedUserId)
      .single();

    return {
      success: true,
      assigned_to: assignedUserId,
      assigned_to_name: userData?.name,
      rule_matched: matchedRule,
      reason: explainRuleMatch(matchedRule, context),
    };
  } catch (error) {
    console.error('Error assigning trial:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Assignment failed',
    };
  }
}

// ============================================
// Assignment History
// ============================================

export async function getAssignmentHistory(options: {
  org_id?: string;
  assigned_to?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<AssignmentHistory[]> {
  const supabase = await createClient() as AnySupabaseClient;

  let query = supabase
    .from('assignment_history')
    .select('*')
    .order('assigned_at', { ascending: false });

  if (options.org_id) {
    query = query.eq('org_id', options.org_id);
  }

  if (options.assigned_to) {
    query = query.eq('assigned_to', options.assigned_to);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching assignment history:', error);
    throw new Error('Failed to fetch assignment history');
  }

  return (data || []) as AssignmentHistory[];
}

// ============================================
// Manual Assignment
// ============================================

export async function manuallyAssignTrial(
  orgId: string,
  assignToUserId: string,
  assignedBy: string,
  reason?: string
): Promise<AssignmentResult> {
  const supabase = await createClient() as AnySupabaseClient;

  try {
    // Get current assignee
    const { data: orgData } = await supabase
      .from('trial_organizations')
      .select('account_manager')
      .eq('org_id', orgId)
      .single();

    const previousAssignee = orgData?.account_manager || null;

    // Update the organization
    const { error: updateError } = await supabase
      .from('trial_organizations')
      .update({ account_manager: assignToUserId })
      .eq('org_id', orgId);

    if (updateError) {
      throw new Error('Failed to update organization assignment');
    }

    // Log assignment history
    await supabase
      .from('assignment_history')
      .insert({
        org_id: orgId,
        assigned_to: assignToUserId,
        previous_assignee: previousAssignee,
        assignment_method: 'manual',
        match_reason: reason || 'Manual assignment',
        assigned_by: assignedBy,
      });

    // Get assignee name
    const { data: userData } = await supabase
      .from('users')
      .select('name')
      .eq('id', assignToUserId)
      .single();

    return {
      success: true,
      assigned_to: assignToUserId,
      assigned_to_name: userData?.name,
      reason: reason || 'Manual assignment',
    };
  } catch (error) {
    console.error('Error manually assigning trial:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Manual assignment failed',
    };
  }
}
