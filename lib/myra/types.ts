// Type definitions for myRA activity integration

export interface MappingResult<T = any> {
  entity_id: string | null;
  entity_name: string;
  confidence: number; // 0-100
  match_strategy: 'exact' | 'fuzzy' | 'domain' | 'ai' | 'manual' | 'none';
  alternatives: Array<{
    id: string;
    name: string;
    score: number;
    metadata?: T;
  }>;
  reasoning?: string; // AI explanation for the match
}

export interface TrialOrg {
  org_id: string;
  org_name: string;
  domain?: string | null;
  parent_organization?: string | null;
}

export interface TrialUser {
  user_id: string;
  org_id: string;
  name?: string | null;
  email?: string | null;
}

export interface RawInsightData {
  raw_org_name: string;
  raw_user_name?: string | null;
  raw_user_email?: string | null;
  raw_insight_title: string;
  raw_timestamp?: string | null;
  raw_cost?: string | null;
  raw_category?: string | null;
}

export interface StagingRecord extends RawInsightData {
  staging_id: string;
  import_batch_id: string;

  // AI extraction metadata
  extraction_confidence?: number;
  ai_extraction_data?: any;
  screenshot_url?: string;

  // Mapping results
  mapped_org_id?: string | null;
  mapped_org_confidence?: number;
  mapped_org_alternatives?: Array<{id: string; name: string; score: number}>;

  mapped_user_id?: string | null;
  mapped_user_confidence?: number;
  mapped_user_alternatives?: Array<{id: string; name: string; score: number}>;

  // Parsed data
  parsed_timestamp?: Date | null;
  parsed_cost?: number;
  parsed_category?: string;

  // Status
  mapping_status: 'pending' | 'needs_review' | 'reviewed' | 'approved' | 'rejected' | 'committed' | 'failed';
  manual_overrides?: any;
  review_notes?: string;

  created_at: Date;
  reviewed_by?: string;
  reviewed_at?: Date;
}

export interface ImportBatch {
  batch_id: string;
  batch_name: string;
  description?: string;

  // Statistics
  total_screenshots: number;
  total_extracted: number;
  auto_approved: number;
  needs_review: number;
  committed: number;
  failed: number;

  // Config
  excluded_users?: string[];
  import_settings?: {
    auto_approve_threshold?: number; // Default 90
    needs_review_threshold?: number; // Default 70
    enable_ai_disambiguation?: boolean;
  };

  // Metadata
  imported_by: string;
  started_at: Date;
  completed_at?: Date;
  committed_at?: Date;
  status: 'in_progress' | 'extracted' | 'reviewed' | 'committed' | 'failed';
}

export interface MappingConfig {
  // Confidence thresholds
  autoApproveThreshold: number; // Default: 90
  needsReviewThreshold: number; // Default: 70

  // Feature flags
  enableAI: boolean;
  enableFuzzyMatching: boolean;
  enableDomainMatching: boolean;

  // Fuzzy matching settings
  fuzzyThreshold: number; // Default: 70
  fuzzyHighConfidence: number; // Default: 85

  // Excluded users
  excludedUserNames: string[];
}

export const DEFAULT_MAPPING_CONFIG: MappingConfig = {
  autoApproveThreshold: 90,
  needsReviewThreshold: 70,
  enableAI: true,
  enableFuzzyMatching: true,
  enableDomainMatching: true,
  fuzzyThreshold: 70,
  fuzzyHighConfidence: 85,
  excludedUserNames: [],
};
