// Type definitions for myRA CSV Import System
// Provides type safety and contracts for AI-powered import pipeline

// ============================================================================
// ENUMS
// ============================================================================

export enum ConfidenceTier {
  AUTO_APPROVE = 'auto_approve', // >90% confidence - green tier
  NEEDS_REVIEW = 'needs_review', // 70-90% confidence - yellow tier
  REQUIRES_FIX = 'requires_fix', // <70% confidence - red tier
}

export enum QueryCategory {
  MARKET_SIZE = 'market_size',
  FORECAST = 'forecast',
  TRENDS = 'trends',
  COMPETITIVE_ANALYSIS = 'competitive_analysis',
  CUSTOMER_INSIGHTS = 'customer_insights',
  PRICING = 'pricing',
  GENERAL = 'general',
}

export enum MatchStrategy {
  EXACT_EMAIL = 'exact_email',
  FUZZY_NAME = 'fuzzy_name',
  DOMAIN_BASED = 'domain_based',
  CREATE_NEW = 'create_new',
}

export enum ImportStatus {
  PENDING = 'pending',
  ANALYZING = 'analyzing',
  READY_FOR_REVIEW = 'ready_for_review',
  IMPORTING = 'importing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

// ============================================================================
// CSV INPUT TYPES
// ============================================================================

export interface CSVRow {
  // Required fields
  org_name: string;
  user_email: string;
  user_name: string;
  query_text: string;
  executed_at: string; // ISO date string

  // Optional fields (AI can auto-fill if missing)
  category?: string;
  query_topic?: string;
  cost_usd?: string | number;
  insight_title?: string;
  status?: string;
}

export interface ParsedCSVData {
  rows: CSVRow[];
  totalRows: number;
  errors: CSVParseError[];
  hasErrors: boolean;
}

export interface CSVParseError {
  row: number;
  field?: string;
  message: string;
  value?: string;
}

// ============================================================================
// ENTITY MATCHING TYPES
// ============================================================================

export interface OrgMatch {
  orgId: string | null;
  orgName: string;
  matchedName?: string; // If fuzzy matched to existing org
  confidence: number; // 0-100
  strategy: MatchStrategy;
  tier: ConfidenceTier;
  isNewOrg: boolean;
  suggestions?: Array<{
    orgId: string;
    orgName: string;
    confidence: number;
  }>;
}

export interface UserMatch {
  userId: string | null;
  userEmail: string;
  userName: string;
  matchedName?: string; // If fuzzy matched to existing user
  confidence: number; // 0-100
  strategy: MatchStrategy;
  tier: ConfidenceTier;
  isNewUser: boolean;
  orgId: string; // Parent org
  suggestions?: Array<{
    userId: string;
    userName: string;
    userEmail: string;
    confidence: number;
  }>;
}

export interface EntityMatchResult {
  orgMatch: OrgMatch;
  userMatch: UserMatch;
  overallConfidence: number; // Combined confidence score
  overallTier: ConfidenceTier;
}

// ============================================================================
// AI ANALYSIS TYPES
// ============================================================================

export interface AIAnalysisRequest {
  queries: Array<{
    query_text: string;
    existing_category?: string;
    existing_topic?: string;
  }>;
}

export interface AIAnalysisResult {
  category: QueryCategory;
  categoryConfidence: number; // 0-100
  query_topic: string;
  insight_title?: string;
  reasoning?: string; // Why AI chose this category
}

export interface BatchAIAnalysis {
  results: AIAnalysisResult[];
  processed: number;
  failed: number;
  errors: Array<{
    index: number;
    error: string;
  }>;
}

// ============================================================================
// ANALYZED QUERY TYPES
// ============================================================================

export interface AnalyzedQuery {
  // Original CSV data
  rowNumber: number;
  originalData: CSVRow;

  // Entity matching results
  entityMatch: EntityMatchResult;

  // AI analysis results
  aiAnalysis: AIAnalysisResult;

  // Final values to import
  finalQuery: {
    org_id: string | null;
    org_name: string;
    user_id: string | null;
    user_email: string;
    user_name: string;
    query_text: string;
    query_topic: string;
    insight_title: string;
    category: QueryCategory;
    status: string;
    executed_at: Date;
    cost_usd: number;
  };

  // Overall confidence and tier
  overallConfidence: number;
  tier: ConfidenceTier;

  // Issues that need review
  issues: QueryIssue[];
}

export interface QueryIssue {
  type: 'org_fuzzy_match' | 'user_fuzzy_match' | 'missing_org' | 'missing_user' | 'low_category_confidence' | 'validation_error';
  severity: 'warning' | 'error';
  message: string;
  field?: string;
  suggestedFix?: string;
}

// ============================================================================
// IMPORT SUMMARY TYPES
// ============================================================================

export interface ImportSummary {
  // Three-tier breakdown
  autoApprove: AnalyzedQuery[]; // Green tier (>90%)
  needsReview: AnalyzedQuery[]; // Yellow tier (70-90%)
  requiresFix: AnalyzedQuery[]; // Red tier (<70%)

  // Statistics
  stats: {
    total: number;
    autoApproveCount: number;
    needsReviewCount: number;
    requiresFixCount: number;
    newOrgsCount: number;
    newUsersCount: number;
    estimatedCost: number;
  };

  // Grouped issues for batch review
  groupedIssues: {
    orgFuzzyMatches: AnalyzedQuery[];
    userFuzzyMatches: AnalyzedQuery[];
    missingOrgs: AnalyzedQuery[];
    missingUsers: AnalyzedQuery[];
    lowCategoryConfidence: AnalyzedQuery[];
    validationErrors: AnalyzedQuery[];
  };
}

// ============================================================================
// IMPORT COMMIT TYPES
// ============================================================================

export interface ImportCommitRequest {
  // Queries approved for import
  approvedQueries: AnalyzedQuery[];

  // User overrides from review
  overrides?: {
    [rowNumber: number]: {
      org_id?: string;
      user_id?: string;
      category?: QueryCategory;
      query_topic?: string;
    };
  };
}

export interface ImportCommitResult {
  success: boolean;
  summary: {
    queriesImported: number;
    orgsCreated: number;
    usersCreated: number;
    totalCost: number;
    duration: number; // milliseconds
  };
  errors: Array<{
    rowNumber: number;
    error: string;
  }>;
  createdOrgs: Array<{
    orgId: string;
    orgName: string;
  }>;
  createdUsers: Array<{
    userId: string;
    userName: string;
    userEmail: string;
  }>;
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

export interface ValidationRule {
  field: keyof CSVRow;
  required: boolean;
  validator?: (value: any) => boolean;
  errorMessage: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: CSVParseError[];
  warnings: CSVParseError[];
}

// ============================================================================
// FUZZY MATCHING TYPES
// ============================================================================

export interface FuzzyMatchOptions {
  threshold: number; // Minimum similarity score (0-100)
  limit?: number; // Max number of suggestions
  scorer?: 'token_set_ratio' | 'token_sort_ratio' | 'partial_ratio';
}

export interface FuzzyMatchResult {
  item: any;
  score: number; // 0-100
  matches: boolean; // Whether score >= threshold
}

// ============================================================================
// PROGRESS TRACKING TYPES
// ============================================================================

export interface ImportProgress {
  status: ImportStatus;
  currentStep: string;
  progress: number; // 0-100
  processed: number;
  total: number;
  estimatedTimeRemaining?: number; // seconds
  errors: string[];
}
