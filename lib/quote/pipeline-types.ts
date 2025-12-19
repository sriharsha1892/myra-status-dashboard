// Sales Pipeline Types

// Updated pipeline stages to match Demo Log workflow
export type PipelineStage = 'intro' | 'demo' | 'pending_trial' | 'trial' | 'feedback' | 'proposal' | 'nego' | 'won' | 'lost';

// Organization status - clearer B2B sales funnel
export type OrgStatus = 'prospect' | 'demo_done' | 'trial_access' | 'negotiation' | 'rejected' | 'onboarded';

// Rejection reasons
export type RejectionReason = 'competitor' | 'budget' | 'timing' | 'no_response' | 'not_fit' | 'other';

// Updated trial status with revoked and extended
export type TrialStatus = 'not_requested' | 'requested' | 'scheduled' | 'active' | 'inactive' | 'revoked' | 'extended' | 'expired';

export type LoginStatus = 'logged_in' | 'not_logged_in' | 'login_issues';

export type EvaluationStatus = 'evaluating' | 'quote_requested' | 'dormant' | 'hold_indefinite' | 'lost';

export interface SalesPipelineEntry {
  id: string;

  // Pipeline tracking
  stage: PipelineStage;
  stage_updated_at: string | null;

  // Trial-specific tracking (enhanced for Demo Log)
  trial_status: TrialStatus | null;
  login_status: LoginStatus | null;
  trial_start_date: string | null;
  trial_end_date: string | null;
  trial_requested_date: string | null;
  trial_needed_date: string | null;
  trial_given_date: string | null;
  trial_usage_notes: string | null;

  // Post-trial evaluation status
  evaluation_status: EvaluationStatus | null;

  // Deal identification
  deal_id: string | null;
  invoice_no: string | null;
  lead_event_id: string | null;

  // Company info
  company_name: string;
  client_name: string | null;
  client_title: string | null;
  address: string | null;
  country: string | null;
  industry: string | null;

  // Contact emails
  primary_email: string;
  email_2: string | null;
  email_3: string | null;
  email_4: string | null;

  // Sales team
  employee_name: string | null;
  employee_id: string | null;
  source: string | null;
  referred_by: string | null;

  // Demo tracking (from Demo Call Log)
  demo_date: string | null;
  current_tools: string | null;
  pain_points: string | null;
  next_steps: string | null;
  next_step_date: string | null;
  demo_notes: string | null;
  expected_close: string | null;

  // Subscription details
  subscription_details: string | null;
  num_users: number | null;
  billing_frequency: string | null;
  subscription_start_date: string | null;
  subscription_end_date: string | null;

  // Consulting
  consulting_hours_included: boolean;
  num_consulting_hours: number | null;
  additional_consulting_rate: number | null;

  // Financials
  standard_cost: number | null;
  deal_value: number | null;
  deal_value_inr: number | null;
  currency: string;
  gst_applicable: boolean;
  gst_number: string | null;
  gst_amount: number | null;

  // Payment
  mode_of_payment: string | null;
  payment_terms: string | null;
  termination_terms: string | null;

  // Timeline
  invoice_date: string | null;
  expected_start_date: string | null;
  fiscal_month: string | null;
  fiscal_quarter: string | null;

  // Metadata
  notes: string | null;
  extra_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;

  // Links
  quote_id: string | null;
  msa_id: string | null;
}

export interface PipelineActivityLog {
  id: string;
  pipeline_id: string;
  action: 'created' | 'updated' | 'stage_changed' | 'status_changed';
  field_changed: string | null;
  old_value: string | null;
  new_value: string | null;
  changed_by: string | null;
  changed_at: string;
}

export interface MSARecord {
  id: string;
  msa_reference: string;
  version: number;
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_title: string | null;
  client_address: string | null;
  client_country: string | null;
  effective_date: string;
  jurisdiction: string;
  currency: string;
  total_value: number;
  line_items: unknown[];
  consulting_hours: number | null;
  additional_hour_rate: number | null;
  include_consulting: boolean;
  special_terms: string | null;
  prepared_by: string;
  prepared_by_email: string | null;
  created_at: string;
  pipeline_id: string | null;
}

export interface ImportTemplate {
  id: string;
  name: string;
  description: string | null;
  column_mappings: Record<string, string>;
  created_at: string;
  created_by: string | null;
}

// Import-related types
export interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
  confidence: number;
  isManualOverride: boolean;
}

export interface ImportPreviewRow {
  rowIndex: number;
  data: Record<string, unknown>;
  mappedData: Partial<SalesPipelineEntry>;
  detectedStage: PipelineStage;
  errors: string[];
  warnings: string[];
}

export interface ImportResult {
  success: boolean;
  imported: number;
  errors: Array<{ row: number; message: string }>;
  warnings: Array<{ row: number; message: string }>;
}

// Stage labels for UI (matching Demo Log workflow)
export const STAGE_LABELS: Record<PipelineStage, string> = {
  intro: 'Intro',
  demo: 'Demo',
  pending_trial: 'Pending Trial',
  trial: 'Trial',
  feedback: 'Feedback',
  proposal: 'Proposal',
  nego: 'Negotiation',
  won: 'Won',
  lost: 'Lost',
};

// Stage order for funnel visualization
export const STAGE_ORDER: PipelineStage[] = [
  'intro', 'demo', 'pending_trial', 'trial', 'feedback', 'proposal', 'nego', 'won'
];

export const STAGE_COLORS: Record<PipelineStage, { bg: string; text: string; border: string }> = {
  intro: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
  demo: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  pending_trial: { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-300' },
  trial: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
  feedback: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
  proposal: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
  nego: { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-300' },
  won: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  lost: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
};

// Hex colors for inline styles
export const STAGE_HEX_COLORS: Record<PipelineStage, string> = {
  intro: '#64748b',
  demo: '#3b82f6',
  pending_trial: '#06b6d4',
  trial: '#f59e0b',
  feedback: '#f97316',
  proposal: '#a855f7',
  nego: '#6366f1',
  won: '#22c55e',
  lost: '#ef4444',
};

// Trial status labels
export const TRIAL_STATUS_LABELS: Record<TrialStatus, string> = {
  not_requested: 'Not Requested',
  requested: 'Requested',
  scheduled: 'Scheduled',
  active: 'Active',
  inactive: 'Inactive',
  revoked: 'Revoked',
  extended: 'Extended',
  expired: 'Expired',
};

// Trial status colors for badges
export const TRIAL_STATUS_COLORS: Record<TrialStatus, { bg: string; text: string }> = {
  not_requested: { bg: 'bg-gray-100', text: 'text-gray-600' },
  requested: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  scheduled: { bg: 'bg-blue-100', text: 'text-blue-700' },
  active: { bg: 'bg-green-100', text: 'text-green-700' },
  inactive: { bg: 'bg-orange-100', text: 'text-orange-700' },
  revoked: { bg: 'bg-purple-100', text: 'text-purple-700' },
  extended: { bg: 'bg-cyan-100', text: 'text-cyan-700' },
  expired: { bg: 'bg-red-100', text: 'text-red-700' },
};

// Organization status labels
export const ORG_STATUS_LABELS: Record<OrgStatus, string> = {
  prospect: 'Prospect',
  demo_done: 'Demo Done',
  trial_access: 'Trial Access',
  negotiation: 'Negotiation',
  rejected: 'Rejected',
  onboarded: 'Onboarded',
};

// Organization status colors
export const ORG_STATUS_COLORS: Record<OrgStatus, string> = {
  prospect: '#6B7280',
  demo_done: '#3B82F6',
  trial_access: '#F59E0B',
  negotiation: '#8B5CF6',
  rejected: '#EF4444',
  onboarded: '#10B981',
};

// Rejection reason labels
export const REJECTION_REASON_LABELS: Record<RejectionReason, string> = {
  competitor: 'Has Competitor Solution',
  budget: 'Budget Constraints',
  timing: 'Bad Timing',
  no_response: 'No Response',
  not_fit: 'Not a Fit',
  other: 'Other',
};

export const LOGIN_STATUS_LABELS: Record<LoginStatus, string> = {
  logged_in: 'Logged In',
  not_logged_in: 'Not Logged In',
  login_issues: 'Login Issues',
};

export const EVALUATION_STATUS_LABELS: Record<EvaluationStatus, string> = {
  evaluating: 'Evaluating',
  quote_requested: 'Quote Requested',
  dormant: 'Dormant',
  hold_indefinite: 'On Hold',
  lost: 'Lost',
};

// All mappable fields in sales_pipeline
export const PIPELINE_FIELDS: Array<{ field: string; label: string; required: boolean; category: string }> = [
  // Required
  { field: 'company_name', label: 'Company Name', required: true, category: 'Company' },
  { field: 'primary_email', label: 'Primary Email', required: true, category: 'Contact' },

  // Company Info
  { field: 'client_name', label: 'Contact Name', required: false, category: 'Company' },
  { field: 'client_title', label: 'Title/Role', required: false, category: 'Company' },
  { field: 'industry', label: 'Industry/Domain', required: false, category: 'Company' },
  { field: 'address', label: 'Address', required: false, category: 'Company' },
  { field: 'country', label: 'Country', required: false, category: 'Company' },

  // Additional Emails
  { field: 'email_2', label: 'Email 2', required: false, category: 'Contact' },
  { field: 'email_3', label: 'Email 3', required: false, category: 'Contact' },
  { field: 'email_4', label: 'Email 4', required: false, category: 'Contact' },

  // Pipeline
  { field: 'stage', label: 'Stage', required: false, category: 'Pipeline' },
  { field: 'employee_name', label: 'Sales POC / AM', required: false, category: 'Pipeline' },
  { field: 'employee_id', label: 'Employee ID', required: false, category: 'Pipeline' },
  { field: 'source', label: 'Source', required: false, category: 'Pipeline' },
  { field: 'referred_by', label: 'Referred By', required: false, category: 'Pipeline' },

  // Demo Tracking
  { field: 'demo_date', label: 'Demo Date', required: false, category: 'Demo' },
  { field: 'current_tools', label: 'Current Tools Used', required: false, category: 'Demo' },
  { field: 'pain_points', label: 'Pain Points', required: false, category: 'Demo' },
  { field: 'next_steps', label: 'Next Steps', required: false, category: 'Demo' },
  { field: 'next_step_date', label: 'Next Step Date', required: false, category: 'Demo' },
  { field: 'demo_notes', label: 'Demo Observations', required: false, category: 'Demo' },

  // Trial Tracking
  { field: 'trial_status', label: 'Trial Status', required: false, category: 'Trial' },
  { field: 'trial_requested_date', label: 'Trial Requested Date', required: false, category: 'Trial' },
  { field: 'trial_needed_date', label: 'Trial Needed Date', required: false, category: 'Trial' },
  { field: 'trial_given_date', label: 'Trial Given Date', required: false, category: 'Trial' },
  { field: 'trial_usage_notes', label: 'Trial Usage Notes', required: false, category: 'Trial' },

  // Deal
  { field: 'deal_id', label: 'Deal ID', required: false, category: 'Deal' },
  { field: 'deal_value', label: 'Deal Value', required: false, category: 'Deal' },
  { field: 'deal_value_inr', label: 'Deal Value (INR)', required: false, category: 'Deal' },
  { field: 'currency', label: 'Currency', required: false, category: 'Deal' },
  { field: 'expected_close', label: 'Expected Close', required: false, category: 'Deal' },

  // Subscription
  { field: 'invoice_no', label: 'Invoice No', required: false, category: 'Subscription' },
  { field: 'subscription_details', label: 'Subscription Details', required: false, category: 'Subscription' },
  { field: 'num_users', label: 'Number of Users', required: false, category: 'Subscription' },
  { field: 'billing_frequency', label: 'Billing Frequency', required: false, category: 'Subscription' },
  { field: 'subscription_start_date', label: 'Start Date', required: false, category: 'Subscription' },
  { field: 'subscription_end_date', label: 'End Date', required: false, category: 'Subscription' },

  // Consulting
  { field: 'num_consulting_hours', label: 'Consulting Hours', required: false, category: 'Consulting' },
  { field: 'additional_consulting_rate', label: 'Hourly Rate', required: false, category: 'Consulting' },

  // Financials
  { field: 'standard_cost', label: 'Standard Cost', required: false, category: 'Financial' },
  { field: 'gst_number', label: 'GST Number', required: false, category: 'Financial' },
  { field: 'gst_amount', label: 'GST Amount', required: false, category: 'Financial' },
  { field: 'mode_of_payment', label: 'Mode of Payment', required: false, category: 'Financial' },
  { field: 'payment_terms', label: 'Payment Terms', required: false, category: 'Financial' },
  { field: 'termination_terms', label: 'Termination Terms', required: false, category: 'Financial' },
  { field: 'invoice_date', label: 'Invoice Date', required: false, category: 'Financial' },

  // Other
  { field: 'lead_event_id', label: 'Lead Event ID', required: false, category: 'Other' },
  { field: 'expected_start_date', label: 'Expected Start Date', required: false, category: 'Other' },
  { field: 'fiscal_month', label: 'Fiscal Month', required: false, category: 'Other' },
  { field: 'fiscal_quarter', label: 'Fiscal Quarter', required: false, category: 'Other' },
  { field: 'notes', label: 'General Notes', required: false, category: 'Other' },
];
