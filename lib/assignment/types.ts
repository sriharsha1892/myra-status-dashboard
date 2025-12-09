// Smart Assignment Types

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'in'
  | 'not_in'
  | 'greater_than'
  | 'less_than'
  | 'greater_than_or_equal'
  | 'less_than_or_equal'
  | 'is_empty'
  | 'is_not_empty';

export type ConditionField =
  | 'industry'
  | 'company_size'
  | 'source'
  | 'region'
  | 'country'
  | 'plan_type'
  | 'trial_length'
  | 'user_count'
  | 'company_name'
  | 'email_domain';

export type MatchType = 'all' | 'any';
export type AssignmentType = 'user' | 'round_robin' | 'load_balanced';
export type AssignmentMethod = 'rule' | 'manual' | 'round_robin' | 'load_balanced' | 'rebalance';

export interface RuleCondition {
  field: ConditionField;
  operator: ConditionOperator;
  value: string | string[] | number;
}

export interface AssignmentRule {
  id: string;
  name: string;
  description: string | null;
  priority: number;
  is_active: boolean;
  conditions: RuleCondition[];
  match_type: MatchType;
  assignment_type: AssignmentType;
  assigned_user_id: string | null;
  round_robin_pool: string[];
  last_assigned_index: number;
  set_status: string | null;
  add_tags: string[];
  notify_on_assignment: boolean;
  total_matches: number;
  last_matched_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssignmentHistory {
  id: string;
  org_id: string;
  assigned_to: string;
  previous_assignee: string | null;
  assignment_method: AssignmentMethod;
  rule_id: string | null;
  rule_name: string | null;
  match_reason: string | null;
  assigned_at: string;
  assigned_by: string | null;
}

export interface TeamCapacity {
  id: string;
  user_id: string;
  max_active_trials: number;
  max_new_per_week: number;
  current_active_count: number;
  new_this_week_count: number;
  is_accepting_new: boolean;
  away_until: string | null;
  specializations: {
    industries?: string[];
    company_sizes?: string[];
    regions?: string[];
  };
  avg_trial_duration_days: number | null;
  conversion_rate: number | null;
  created_at: string;
  updated_at: string;
}

// Input types
export interface CreateRuleInput {
  name: string;
  description?: string;
  priority?: number;
  conditions: RuleCondition[];
  match_type?: MatchType;
  assignment_type: AssignmentType;
  assigned_user_id?: string;
  round_robin_pool?: string[];
  set_status?: string;
  add_tags?: string[];
  notify_on_assignment?: boolean;
}

export interface UpdateRuleInput extends Partial<CreateRuleInput> {
  is_active?: boolean;
}

// Matching context for rule evaluation
export interface TrialContext {
  org_id: string;
  org_name: string;
  industry?: string;
  company_size?: string;
  source?: string;
  region?: string;
  country?: string;
  plan_type?: string;
  trial_length?: number;
  user_count?: number;
  email_domain?: string;
  [key: string]: unknown;
}

// Assignment result
export interface AssignmentResult {
  success: boolean;
  assigned_to?: string;
  assigned_to_name?: string;
  rule_matched?: AssignmentRule;
  reason?: string;
  error?: string;
}

// Labels
export const OPERATOR_LABELS: Record<ConditionOperator, string> = {
  equals: 'equals',
  not_equals: 'does not equal',
  contains: 'contains',
  not_contains: 'does not contain',
  starts_with: 'starts with',
  ends_with: 'ends with',
  in: 'is one of',
  not_in: 'is not one of',
  greater_than: 'is greater than',
  less_than: 'is less than',
  greater_than_or_equal: 'is at least',
  less_than_or_equal: 'is at most',
  is_empty: 'is empty',
  is_not_empty: 'is not empty',
};

export const FIELD_LABELS: Record<ConditionField, string> = {
  industry: 'Industry',
  company_size: 'Company Size',
  source: 'Lead Source',
  region: 'Region',
  country: 'Country',
  plan_type: 'Plan Type',
  trial_length: 'Trial Length (days)',
  user_count: 'User Count',
  company_name: 'Company Name',
  email_domain: 'Email Domain',
};

export const ASSIGNMENT_TYPE_LABELS: Record<AssignmentType, string> = {
  user: 'Specific User',
  round_robin: 'Round Robin',
  load_balanced: 'Load Balanced',
};
