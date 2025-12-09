// Assignment Rules Engine
// Evaluates rules against trial context to determine assignment

import type {
  AssignmentRule,
  RuleCondition,
  ConditionOperator,
  TrialContext,
  TeamCapacity,
} from './types';

/**
 * Evaluate a single condition against context
 */
export function evaluateCondition(
  condition: RuleCondition,
  context: TrialContext
): boolean {
  const fieldValue = context[condition.field];
  const { operator, value } = condition;

  // Handle empty checks first
  if (operator === 'is_empty') {
    return fieldValue === null || fieldValue === undefined || fieldValue === '';
  }
  if (operator === 'is_not_empty') {
    return fieldValue !== null && fieldValue !== undefined && fieldValue !== '';
  }

  // If field value is empty for other operators, condition fails
  if (fieldValue === null || fieldValue === undefined) {
    return false;
  }

  const fieldStr = String(fieldValue).toLowerCase();
  const valueStr = typeof value === 'string' ? value.toLowerCase() : String(value).toLowerCase();

  switch (operator) {
    case 'equals':
      return fieldStr === valueStr;

    case 'not_equals':
      return fieldStr !== valueStr;

    case 'contains':
      return fieldStr.includes(valueStr);

    case 'not_contains':
      return !fieldStr.includes(valueStr);

    case 'starts_with':
      return fieldStr.startsWith(valueStr);

    case 'ends_with':
      return fieldStr.endsWith(valueStr);

    case 'in':
      if (Array.isArray(value)) {
        return value.map(v => String(v).toLowerCase()).includes(fieldStr);
      }
      return String(value).toLowerCase().split(',').map(v => v.trim()).includes(fieldStr);

    case 'not_in':
      if (Array.isArray(value)) {
        return !value.map(v => String(v).toLowerCase()).includes(fieldStr);
      }
      return !String(value).toLowerCase().split(',').map(v => v.trim()).includes(fieldStr);

    case 'greater_than':
      return Number(fieldValue) > Number(value);

    case 'less_than':
      return Number(fieldValue) < Number(value);

    case 'greater_than_or_equal':
      return Number(fieldValue) >= Number(value);

    case 'less_than_or_equal':
      return Number(fieldValue) <= Number(value);

    default:
      return false;
  }
}

/**
 * Evaluate all conditions of a rule against context
 */
export function evaluateRule(
  rule: AssignmentRule,
  context: TrialContext
): boolean {
  if (!rule.is_active) return false;
  if (rule.conditions.length === 0) return true; // Empty conditions = always match

  const results = rule.conditions.map(condition =>
    evaluateCondition(condition, context)
  );

  if (rule.match_type === 'all') {
    return results.every(Boolean);
  } else {
    return results.some(Boolean);
  }
}

/**
 * Find the first matching rule for a trial
 * Rules are evaluated in priority order (lower = higher priority)
 */
export function findMatchingRule(
  rules: AssignmentRule[],
  context: TrialContext
): AssignmentRule | null {
  // Sort by priority ascending
  const sortedRules = [...rules]
    .filter(r => r.is_active)
    .sort((a, b) => a.priority - b.priority);

  for (const rule of sortedRules) {
    if (evaluateRule(rule, context)) {
      return rule;
    }
  }

  return null;
}

/**
 * Get next user from round-robin pool
 */
export function getNextRoundRobinUser(
  pool: string[],
  lastIndex: number
): { userId: string; nextIndex: number } {
  if (pool.length === 0) {
    throw new Error('Round-robin pool is empty');
  }

  const nextIndex = (lastIndex + 1) % pool.length;
  return {
    userId: pool[nextIndex],
    nextIndex,
  };
}

/**
 * Get user with lowest load from pool
 */
export function getLoadBalancedUser(
  pool: string[],
  capacities: TeamCapacity[]
): string | null {
  if (pool.length === 0) return null;

  // Filter to available users
  const availableCapacities = capacities.filter(c => {
    if (!pool.includes(c.user_id)) return false;
    if (!c.is_accepting_new) return false;
    if (c.away_until && new Date(c.away_until) > new Date()) return false;
    if (c.current_active_count >= c.max_active_trials) return false;
    if (c.new_this_week_count >= c.max_new_per_week) return false;
    return true;
  });

  if (availableCapacities.length === 0) {
    // Fallback: pick user with most remaining capacity
    const fallbackCapacities = capacities.filter(c => pool.includes(c.user_id));
    if (fallbackCapacities.length === 0) return pool[0]; // Last resort

    fallbackCapacities.sort((a, b) => {
      const aRemaining = a.max_active_trials - a.current_active_count;
      const bRemaining = b.max_active_trials - b.current_active_count;
      return bRemaining - aRemaining; // Higher remaining = better
    });

    return fallbackCapacities[0].user_id;
  }

  // Score based on remaining capacity (weighted)
  const scored = availableCapacities.map(c => {
    const activeRatio = c.current_active_count / c.max_active_trials;
    const weeklyRatio = c.new_this_week_count / c.max_new_per_week;
    // Lower score = more available
    const score = (activeRatio * 0.7) + (weeklyRatio * 0.3);
    return { userId: c.user_id, score };
  });

  scored.sort((a, b) => a.score - b.score);
  return scored[0].userId;
}

/**
 * Generate human-readable explanation of why a rule matched
 */
export function explainRuleMatch(
  rule: AssignmentRule,
  context: TrialContext
): string {
  const parts: string[] = [];

  for (const condition of rule.conditions) {
    const fieldValue = context[condition.field];
    const result = evaluateCondition(condition, context);

    if (result) {
      parts.push(`${condition.field}=${fieldValue} ${condition.operator} ${condition.value}`);
    }
  }

  const matchPhrase = rule.match_type === 'all' ? 'all conditions matched' : 'at least one condition matched';

  return `Rule "${rule.name}": ${matchPhrase} (${parts.join(', ')})`;
}

/**
 * Validate a rule's conditions
 */
export function validateRule(rule: Partial<AssignmentRule>): string[] {
  const errors: string[] = [];

  if (!rule.name?.trim()) {
    errors.push('Rule name is required');
  }

  if (!rule.assignment_type) {
    errors.push('Assignment type is required');
  }

  if (rule.assignment_type === 'user' && !rule.assigned_user_id) {
    errors.push('A user must be selected for direct assignment');
  }

  if (rule.assignment_type === 'round_robin' && (!rule.round_robin_pool || rule.round_robin_pool.length === 0)) {
    errors.push('At least one user is required for round-robin assignment');
  }

  if (rule.assignment_type === 'load_balanced' && (!rule.round_robin_pool || rule.round_robin_pool.length === 0)) {
    errors.push('At least one user is required for load-balanced assignment');
  }

  for (const condition of rule.conditions || []) {
    if (!condition.field) {
      errors.push('Condition field is required');
    }
    if (!condition.operator) {
      errors.push('Condition operator is required');
    }
    // Value check (except for is_empty/is_not_empty)
    if (!['is_empty', 'is_not_empty'].includes(condition.operator)) {
      if (condition.value === null || condition.value === undefined || condition.value === '') {
        errors.push(`Value required for ${condition.field} condition`);
      }
    }
  }

  return errors;
}
