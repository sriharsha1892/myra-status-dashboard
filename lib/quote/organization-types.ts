// Organization Types for B2B Sales Pipeline

import type { OrgStatus, RejectionReason, TrialStatus, LoginStatus } from './pipeline-types';

// Region codes for subsidiaries
export type Region = 'MEA' | 'EMEA' | 'APAC' | 'Americas' | 'Global';

export interface Organization {
  id: string;

  // Hierarchy
  parent_id: string | null;  // NULL for parent orgs
  name: string;
  display_name: string | null;  // For display (e.g., "Schneider Electric - MEA")

  // Company info
  industry: string | null;
  country: string | null;
  region: Region | string | null;

  // Pipeline status
  status: OrgStatus;
  status_updated_at: string | null;
  rejection_reason: RejectionReason | null;

  // Trial tracking
  trial_status: TrialStatus;
  trial_start_date: string | null;
  trial_end_date: string | null;
  trial_given_date: string | null;
  trial_usage_notes: string | null;
  login_status: LoginStatus;

  // Onboarding details (when status = 'onboarded')
  deal_value: number | null;
  contract_period_months: number | null;
  num_users: number | null;
  arr: number | null;  // Annual Recurring Revenue
  contract_start_date: string | null;
  contract_end_date: string | null;
  renewal_date: string | null;

  // Assignment
  employee_name: string | null;

  // Notes
  notes: string | null;
  pain_points: string | null;
  current_tools: string | null;

  // Metadata
  created_at: string;
  updated_at: string;

  // Virtual fields (populated from joins)
  contacts?: OrganizationContact[];
  subsidiaries?: Organization[];
  contact_count?: number;
  subsidiary_count?: number;
}

// Simplified contact info for organization view
export interface OrganizationContact {
  id: string;
  name: string | null;
  email: string;
  title: string | null;
  is_primary: boolean;
}

// For creating/updating organizations
export interface OrganizationInput {
  parent_id?: string | null;
  name: string;
  display_name?: string | null;
  industry?: string | null;
  country?: string | null;
  region?: Region | string | null;
  status?: OrgStatus;
  rejection_reason?: RejectionReason | null;
  trial_status?: TrialStatus;
  trial_start_date?: string | null;
  trial_end_date?: string | null;
  trial_given_date?: string | null;
  trial_usage_notes?: string | null;
  login_status?: LoginStatus;
  deal_value?: number | null;
  contract_period_months?: number | null;
  num_users?: number | null;
  arr?: number | null;
  contract_start_date?: string | null;
  contract_end_date?: string | null;
  renewal_date?: string | null;
  employee_name?: string | null;
  notes?: string | null;
  pain_points?: string | null;
  current_tools?: string | null;
}

// Organization with aggregated data for dashboard
export interface OrganizationWithStats extends Organization {
  total_contacts: number;
  total_subsidiaries: number;
  combined_deal_value: number;  // Sum of this org + subsidiaries
}

// For Kanban board grouping
export interface OrganizationsByStatus {
  prospect: Organization[];
  demo_done: Organization[];
  trial_access: Organization[];
  negotiation: Organization[];
  rejected: Organization[];
  onboarded: Organization[];
}
