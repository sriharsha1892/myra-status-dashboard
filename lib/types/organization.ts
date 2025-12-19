/**
 * Unified Organization Types
 * Single source of truth for org data model
 */

// Lifecycle stages an organization can be in
export type OrgLifecycleStage =
  | 'prospect'           // Pre-engagement cold/warm lead
  | 'demo_scheduled'     // Demo meeting booked
  | 'demo_done'          // Demo completed, evaluating
  | 'trial_pending'      // Trial requested but not yet provided
  | 'trial_active'       // Active trial in progress
  | 'trial_expired'      // Trial ended, not converted
  | 'negotiation'        // In contract negotiation
  | 'onboarded'          // Paying customer
  | 'churned'            // Former customer
  | 'lost';              // Lost deal (never converted)

// Trial status tracking
export type TrialStatus =
  | 'not_requested'
  | 'requested'
  | 'approved'
  | 'active'
  | 'extended'
  | 'expired'
  | 'revoked';

// Login status for trial users
export type LoginStatus = 'not_logged_in' | 'logged_in' | 'login_issues';

// Customer health indicators
export type CustomerHealth = 'onboarding' | 'healthy' | 'warning' | 'at_risk' | 'churning';

// Contract types
export type ContractType = 'annual' | 'multi_year' | 'month_to_month' | 'pilot';

// Deal outcome
export type DealOutcome = 'won' | 'lost' | 'deferred';

// Prospect sources
export type ProspectSource = 'cold_outreach' | 'inbound' | 'referral' | 'event' | 'linkedin' | 'website' | 'other';

// Rejection reasons
export type RejectionReason = 'competitor' | 'budget' | 'timing' | 'no_response' | 'not_fit' | 'other';

// Vertical/Domain
export type Vertical = 'TMT' | 'NEO' | 'AF&B' | 'E&C' | 'HC' | 'AAD' | 'Unassigned';

// Parent company
export type ParentCompany = 'Mordor Intelligence' | 'GMI';

// Currency
export type Currency = 'USD' | 'EUR' | 'GBP' | 'INR' | 'AED';

/**
 * Unified Organization - main data type
 */
export interface OrganizationUnified {
  id: string;

  // Hierarchy
  parent_id: string | null;

  // Identity
  name: string;
  display_name: string | null;
  domain: string | null;
  website_url: string | null;
  logo_url: string | null;
  description: string | null;

  // Company info
  industry: string | null;
  vertical: Vertical | null;
  country: string | null;
  region: string | null;
  team_size: number | null;

  // Lifecycle (single source of truth)
  lifecycle_stage: OrgLifecycleStage;
  lifecycle_stage_updated_at: string | null;

  // Prospect tracking
  prospect_source: ProspectSource | null;
  icp_fit_score: number | null;

  // Trial tracking
  trial_status: TrialStatus | null;
  trial_requested_date: string | null;
  trial_start_date: string | null;
  trial_end_date: string | null;
  trial_extended_until: string | null;
  login_status: LoginStatus | null;
  trial_usage_notes: string | null;

  // Deal tracking
  deal_value: number | null;
  deal_currency: Currency | null;
  expected_close_date: string | null;
  deal_outcome: DealOutcome | null;
  deal_outcome_reason: string | null;
  deal_deferred_until: string | null;

  // Customer details (when lifecycle_stage = 'onboarded')
  contract_type: ContractType | null;
  contract_value: number | null;
  contract_start_date: string | null;
  contract_end_date: string | null;
  renewal_date: string | null;
  arr: number | null;
  num_licensed_users: number | null;
  customer_health: CustomerHealth | null;

  // Churn tracking
  churned_at: string | null;
  churn_reason: string | null;

  // Assignment
  account_manager_id: string | null;
  sales_poc_id: string | null;
  employee_name: string | null;

  // Discovery/qualification
  pain_points: string | null;
  current_tools: string | null;
  notes: string | null;

  // Rejection tracking
  rejection_reason: RejectionReason | null;

  // Metadata
  parent_company: ParentCompany | null;
  source_system: string | null;
  external_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

/**
 * Organization with related data (for list views)
 */
export interface OrganizationWithRelations extends OrganizationUnified {
  contacts?: ContactSummary[];
  primary_contact?: ContactSummary | null;
  contact_count?: number;
  champion_count?: number;
  decision_maker_count?: number;
  last_activity_at?: string | null;
}

/**
 * Contact summary for organization cards
 */
export interface ContactSummary {
  id: string;
  name: string;
  email: string | null;
  role: string;
  title: string | null;
  is_primary: boolean;
  is_advocate: boolean;
  avatar_url: string | null;
}

/**
 * Kanban column configuration
 */
export interface KanbanColumn {
  id: OrgLifecycleStage;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

/**
 * Kanban columns with visual styling
 */
export const KANBAN_COLUMNS: KanbanColumn[] = [
  {
    id: 'prospect',
    label: 'Prospects',
    color: 'text-gray-700',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
  },
  {
    id: 'demo_scheduled',
    label: 'Demo Scheduled',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  {
    id: 'demo_done',
    label: 'Demo Done',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
  },
  {
    id: 'trial_pending',
    label: 'Trial Pending',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
  },
  {
    id: 'trial_active',
    label: 'Trial Active',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
  },
  {
    id: 'trial_expired',
    label: 'Trial Expired',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
  },
  {
    id: 'negotiation',
    label: 'Negotiation',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
  },
  {
    id: 'onboarded',
    label: 'Onboarded',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
  {
    id: 'churned',
    label: 'Churned',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
  {
    id: 'lost',
    label: 'Lost',
    color: 'text-slate-700',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
  },
];

/**
 * Get Kanban column config by lifecycle stage
 */
export function getKanbanColumn(stage: OrgLifecycleStage): KanbanColumn {
  return KANBAN_COLUMNS.find(col => col.id === stage) || KANBAN_COLUMNS[0];
}

/**
 * Lifecycle stage display labels
 */
export const LIFECYCLE_LABELS: Record<OrgLifecycleStage, string> = {
  prospect: 'Prospect',
  demo_scheduled: 'Demo Scheduled',
  demo_done: 'Demo Done',
  trial_pending: 'Trial Pending',
  trial_active: 'Trial Active',
  trial_expired: 'Trial Expired',
  negotiation: 'Negotiation',
  onboarded: 'Onboarded',
  churned: 'Churned',
  lost: 'Lost',
};

/**
 * Trial status display labels
 */
export const TRIAL_STATUS_LABELS: Record<TrialStatus, string> = {
  not_requested: 'Not Requested',
  requested: 'Requested',
  approved: 'Approved',
  active: 'Active',
  extended: 'Extended',
  expired: 'Expired',
  revoked: 'Revoked',
};

/**
 * Customer health display config
 */
export const CUSTOMER_HEALTH_CONFIG: Record<CustomerHealth, { label: string; color: string; bgColor: string }> = {
  onboarding: { label: 'Onboarding', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  healthy: { label: 'Healthy', color: 'text-green-700', bgColor: 'bg-green-100' },
  warning: { label: 'Warning', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  at_risk: { label: 'At Risk', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  churning: { label: 'Churning', color: 'text-red-700', bgColor: 'bg-red-100' },
};
