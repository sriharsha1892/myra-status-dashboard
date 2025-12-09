/**
 * Progressive Data Enrichment - Type Definitions
 */

// ============================================
// CORE TYPES
// ============================================

export type EntityType = 'organization' | 'user';
export type FieldType = 'card-select' | 'currency-select' | 'text' | 'textarea';
export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type UserRole = 'sales' | 'account_manager' | 'support' | 'admin';
export type EnrichmentTrigger = 'post_import' | 'manual' | 'nudge';
export type AnswerStatus = 'answered' | 'skipped' | 'deferred';
export type AnswerSource = 'manual' | 'ai_suggested' | 'bulk_apply';

// Lucide icon names for type safety
export type IconName =
  | 'CheckCircle' | 'AlertTriangle' | 'AlertCircle' | 'XCircle'
  | 'Star' | 'Target' | 'Search' | 'Lightbulb' | 'ShieldX'
  | 'BarChart3' | 'Sparkles' | 'ChevronDown' | 'ChevronUp';

// Tailwind color names
export type ColorName = 'emerald' | 'amber' | 'orange' | 'red' | 'blue' | 'violet' | 'slate' | 'gray';

// ============================================
// QUESTION DEFINITION
// ============================================

export interface QuestionOption {
  value: string;
  label: string;
  icon?: IconName;
  color?: ColorName;
  description?: string;
}

export interface SkipCondition {
  field: string;
  equals?: string;
  notEquals?: string;
  exists?: boolean;
}

export interface EnrichmentQuestion {
  id: string;
  entityType: EntityType;
  targetField: string;
  targetTable: string;

  label: string;
  fieldType: FieldType;
  options?: QuestionOption[];
  placeholder?: string;

  relevantRoles: UserRole[];
  priority: Priority;
  weight: number; // Contribution to completeness score (0-100)

  skipIf?: SkipCondition;
}

// ============================================
// AI INFERENCE
// ============================================

export interface AISuggestion {
  value: string;
  confidence: number; // 0.0 - 1.0
  reasoning?: string;
}

export interface AIInference {
  field: string;
  value: string;
  confidence: number; // 0.0 - 1.0
  evidence: string;
  appliesTo: string; // entity_id
}

export interface HealthSignal {
  suggested: 'healthy' | 'warning' | 'at-risk' | 'critical';
  confidence: number;
  reasons: string[];
}

export interface EnrichmentInferenceResult {
  inferences: AIInference[];
  healthSignal?: HealthSignal;
}

// ============================================
// SESSION & ANSWERS
// ============================================

export interface EnrichmentSession {
  id: string;
  userEmail: string;
  userRole: UserRole;
  trigger: EnrichmentTrigger;

  entityIds: string[];
  questionsPresented: string[];
  answersGiven: number;
  answersSkipped: number;

  startedAt: string;
  completedAt: string | null;

  completenessBefore: number;
  completenessAfter: number;
}

export interface EnrichmentAnswer {
  id: string;
  sessionId: string;
  questionId: string;
  entityType: EntityType;
  entityId: string;

  status: AnswerStatus;
  value: unknown;
  previousValue: unknown | null;

  source: AnswerSource;
  aiConfidence: number | null;

  answeredBy: string;
  answeredAt: string;
}

// ============================================
// API REQUEST/RESPONSE
// ============================================

export interface AnalyzeRequest {
  entityIds: string[];
  entityType: EntityType;
  userRole: UserRole;
  includeAIInference?: boolean;
}

export interface QuestionWithContext extends EnrichmentQuestion {
  entities: Array<{
    id: string;
    name: string;
    currentValue: unknown | null;
  }>;
  aiSuggestion?: AISuggestion;
}

export interface AnalyzeResponse {
  questions: QuestionWithContext[];
  completenessScore: number;
  sessionId: string;
}

export interface AnswerRequest {
  sessionId: string;
  questionId: string;
  entityIds: string[];
  value: unknown;
  source: AnswerSource;
  aiConfidence?: number;
}

export interface AnswerResponse {
  success: boolean;
  updatedCount: number;
  newCompletenessScore: number;
}

export interface SkipRequest {
  sessionId: string;
  questionId: string;
  entityIds: string[];
}

// ============================================
// COMPLETENESS CALCULATION
// ============================================

export interface FieldCompleteness {
  field: string;
  filled: number;
  total: number;
  weight: number;
}

export interface CompletenessResult {
  score: number; // 0-100
  fieldBreakdown: FieldCompleteness[];
  missingCritical: string[];
}
