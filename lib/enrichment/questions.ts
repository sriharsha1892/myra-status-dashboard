/**
 * Progressive Data Enrichment - Question Registry
 * All enrichment questions defined in code for type safety and version control
 */

import type { EnrichmentQuestion } from './types';

export const ENRICHMENT_QUESTIONS: EnrichmentQuestion[] = [
  // ============================================
  // ORGANIZATION QUESTIONS
  // ============================================

  // Health Status - Critical for all roles
  {
    id: 'org_health_status',
    entityType: 'organization',
    targetField: 'health_status',
    targetTable: 'trial_organizations',

    label: 'How healthy is the relationship?',
    fieldType: 'card-select',
    options: [
      { value: 'healthy', label: 'Healthy', icon: 'CheckCircle', color: 'emerald' },
      { value: 'warning', label: 'Warning', icon: 'AlertTriangle', color: 'amber' },
      { value: 'at-risk', label: 'At-Risk', icon: 'AlertCircle', color: 'orange' },
      { value: 'critical', label: 'Critical', icon: 'XCircle', color: 'red' },
    ],

    relevantRoles: ['account_manager', 'sales', 'admin'],
    priority: 'critical',
    weight: 25,
  },

  // Deal Momentum
  {
    id: 'org_deal_momentum',
    entityType: 'organization',
    targetField: 'deal_momentum',
    targetTable: 'trial_organizations',

    label: 'Current deal momentum?',
    fieldType: 'card-select',
    options: [
      { value: 'fast_track', label: 'Fast Track', icon: 'Target', color: 'emerald', description: 'Moving quickly' },
      { value: 'steady', label: 'Steady', icon: 'CheckCircle', color: 'blue', description: 'Normal pace' },
      { value: 'stalled', label: 'Stalled', icon: 'AlertCircle', color: 'amber', description: 'Needs attention' },
      { value: 'at_risk', label: 'At Risk', icon: 'XCircle', color: 'red', description: 'May be lost' },
    ],

    relevantRoles: ['sales', 'admin'],
    priority: 'high',
    weight: 20,
  },

  // Organization Description
  {
    id: 'org_description',
    entityType: 'organization',
    targetField: 'description',
    targetTable: 'trial_organizations',

    label: 'Brief description of this organization',
    fieldType: 'textarea',
    placeholder: 'e.g., Mid-size fintech company, 200 employees, looking to modernize customer support...',

    relevantRoles: ['account_manager', 'sales', 'support', 'admin'],
    priority: 'medium',
    weight: 10,
  },

  // ============================================
  // USER/CONTACT QUESTIONS
  // ============================================

  // Influence Type - Critical for sales
  {
    id: 'user_influence',
    entityType: 'user',
    targetField: 'influence',
    targetTable: 'trial_users',

    label: 'What role does this contact play?',
    fieldType: 'card-select',
    options: [
      { value: 'champion', label: 'Champion', icon: 'Star', color: 'amber', description: 'Internal advocate pushing for adoption' },
      { value: 'decision_maker', label: 'Decision Maker', icon: 'Target', color: 'blue', description: 'Has final say on purchase' },
      { value: 'evaluator', label: 'Evaluator', icon: 'Search', color: 'slate', description: 'Testing and comparing options' },
      { value: 'influencer', label: 'Influencer', icon: 'Lightbulb', color: 'violet', description: 'Has voice but not the vote' },
      { value: 'blocker', label: 'Blocker', icon: 'ShieldX', color: 'red', description: 'Resistant to change' },
    ],

    relevantRoles: ['sales', 'account_manager'],
    priority: 'critical',
    weight: 20,
  },

  // User Role/Title clarification
  {
    id: 'user_role_clarify',
    entityType: 'user',
    targetField: 'role',
    targetTable: 'trial_users',

    label: 'What is their job title/role?',
    fieldType: 'text',
    placeholder: 'e.g., VP of Engineering, Product Manager, CTO...',

    relevantRoles: ['sales', 'account_manager', 'admin'],
    priority: 'medium',
    weight: 10,
  },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get questions relevant to a specific user role
 */
export function getQuestionsForRole(role: string): EnrichmentQuestion[] {
  const normalizedRole = normalizeRole(role);
  return ENRICHMENT_QUESTIONS.filter(q =>
    q.relevantRoles.includes(normalizedRole) || q.relevantRoles.includes('admin')
  );
}

/**
 * Get questions for a specific entity type
 */
export function getQuestionsForEntityType(
  entityType: 'organization' | 'user',
  role: string
): EnrichmentQuestion[] {
  return getQuestionsForRole(role).filter(q => q.entityType === entityType);
}

/**
 * Get a specific question by ID
 */
export function getQuestionById(id: string): EnrichmentQuestion | undefined {
  return ENRICHMENT_QUESTIONS.find(q => q.id === id);
}

/**
 * Calculate total possible weight for completeness scoring
 */
export function getTotalWeight(entityType: 'organization' | 'user'): number {
  return ENRICHMENT_QUESTIONS
    .filter(q => q.entityType === entityType)
    .reduce((sum, q) => sum + q.weight, 0);
}

/**
 * Normalize user role string to standard role type
 */
function normalizeRole(role: string): 'sales' | 'account_manager' | 'support' | 'admin' {
  const lower = role.toLowerCase();
  if (lower.includes('sales')) return 'sales';
  if (lower.includes('account') || lower.includes('am') || lower.includes('csm')) return 'account_manager';
  if (lower.includes('support') || lower.includes('service')) return 'support';
  return 'admin';
}

/**
 * Get priority order for sorting questions
 */
export function getPriorityOrder(priority: string): number {
  const order: Record<string, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  return order[priority] ?? 3;
}

/**
 * Sort questions by priority
 */
export function sortQuestionsByPriority(questions: EnrichmentQuestion[]): EnrichmentQuestion[] {
  return [...questions].sort((a, b) => {
    const priorityDiff = getPriorityOrder(a.priority) - getPriorityOrder(b.priority);
    if (priorityDiff !== 0) return priorityDiff;
    return b.weight - a.weight; // Higher weight first within same priority
  });
}
