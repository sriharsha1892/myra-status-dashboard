// Types for Customer Data Sync Tool

export type SyncWizardStep = 'category' | 'input' | 'results';

export type SyncCategory =
  | 'paying_customers'
  | 'trial_users'
  | 'new_trials'
  | 'strong_prospects'
  | 'prospects'
  | 'dormant'
  | 'lost';

export interface SyncCategoryOption {
  value: SyncCategory;
  label: string;
  description: string;
  icon: 'dollar' | 'clock' | 'sparkles' | 'target' | 'users' | 'moon' | 'x';
  color: 'green' | 'amber' | 'violet' | 'blue' | 'neutral' | 'slate' | 'red';
  setsField: string;
  setsValue: string;
}

export const SYNC_CATEGORIES: SyncCategoryOption[] = [
  {
    value: 'paying_customers',
    label: 'Paying Customers',
    description: 'Active paying customers',
    icon: 'dollar',
    color: 'green',
    setsField: 'status',
    setsValue: 'onboarded'
  },
  {
    value: 'trial_users',
    label: 'Trial Users',
    description: 'Users currently on trial',
    icon: 'clock',
    color: 'amber',
    setsField: 'trial_status',
    setsValue: 'active'
  },
  {
    value: 'new_trials',
    label: 'New Trials (<4 days)',
    description: 'Recently started trials',
    icon: 'sparkles',
    color: 'violet',
    setsField: 'trial_status',
    setsValue: 'active (+ start date)'
  },
  {
    value: 'strong_prospects',
    label: 'Strong Prospects',
    description: 'High potential leads',
    icon: 'target',
    color: 'blue',
    setsField: 'status',
    setsValue: 'negotiation'
  },
  {
    value: 'prospects',
    label: 'Prospects',
    description: 'General prospects',
    icon: 'users',
    color: 'neutral',
    setsField: 'status',
    setsValue: 'prospect'
  },
  {
    value: 'dormant',
    label: 'Dormant',
    description: 'Inactive users',
    icon: 'moon',
    color: 'slate',
    setsField: 'trial_status',
    setsValue: 'inactive'
  },
  {
    value: 'lost',
    label: 'Lost',
    description: 'Lost opportunities',
    icon: 'x',
    color: 'red',
    setsField: 'status',
    setsValue: 'rejected'
  },
];

// Maps category to database field updates
export const CATEGORY_DB_MAPPING: Record<SyncCategory, Record<string, string | null>> = {
  paying_customers: { status: 'onboarded' },
  trial_users: { trial_status: 'active' },
  new_trials: { trial_status: 'active' }, // trial_start_date set separately
  strong_prospects: { status: 'negotiation' },
  prospects: { status: 'prospect' },
  dormant: { trial_status: 'inactive' },
  lost: { status: 'rejected' },
};

export interface MatchResult {
  input: string;
  matched_id: string | null;
  matched_name: string | null;
  confidence: number;
  current_status?: string | null;
  current_trial_status?: string | null;
}

export interface GroqMatchResponse {
  matches: MatchResult[];
}

export interface MatchGroup {
  exact: MatchResult[];    // confidence >= 95
  fuzzy: MatchResult[];    // confidence 50-94
  noMatch: MatchResult[];  // confidence < 50
}

export interface BulkUpdateItem {
  org_id: string;
  category: SyncCategory;
}

export interface BulkCreateItem {
  name: string;
  category: SyncCategory;
}

export interface BulkUpdateRequest {
  updates: BulkUpdateItem[];
  creates: BulkCreateItem[];
}

export interface BulkUpdateResponse {
  success: boolean;
  updated_count: number;
  created_count: number;
  errors: string[];
}

// Helper to categorize match results
export function categorizeMatches(matches: MatchResult[]): MatchGroup {
  return matches.reduce<MatchGroup>(
    (acc, match) => {
      if (match.confidence >= 95) {
        acc.exact.push(match);
      } else if (match.confidence >= 50) {
        acc.fuzzy.push(match);
      } else {
        acc.noMatch.push(match);
      }
      return acc;
    },
    { exact: [], fuzzy: [], noMatch: [] }
  );
}
