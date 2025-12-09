// AI Prompt Template Types

export type PromptCategory =
  | 'extraction'      // Data extraction from text
  | 'analysis'        // Analysis and classification
  | 'generation'      // Content generation
  | 'summarization';  // Summarization tasks

export interface PromptTemplate {
  id: string;
  template_key: string;
  template_name: string;
  description: string | null;
  category: PromptCategory;
  system_prompt: string;
  user_prompt_template: string | null;
  model: string;
  temperature: number;
  max_tokens: number;
  available_variables: string[];
  version: number;
  is_active: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PromptOverride {
  id: string;
  template_id: string;
  org_id: string;
  system_prompt_override: string | null;
  user_prompt_template_override: string | null;
  model_override: string | null;
  temperature_override: number | null;
  max_tokens_override: number | null;
  additional_instructions: string | null;
  custom_examples: Array<{ input: string; output: string }>;
  is_active: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PromptExecution {
  id: string;
  template_id: string | null;
  override_id: string | null;
  org_id: string | null;
  model_used: string;
  input_tokens: number | null;
  output_tokens: number | null;
  duration_ms: number | null;
  success: boolean;
  confidence_score: number | null;
  error_message: string | null;
  user_feedback: 'positive' | 'negative' | 'neutral' | null;
  feedback_notes: string | null;
  executed_at: string;
}

// Resolved prompt with overrides applied
export interface ResolvedPrompt {
  template_key: string;
  template_name: string;
  system_prompt: string;
  user_prompt_template: string | null;
  model: string;
  temperature: number;
  max_tokens: number;
  available_variables: string[];
  // Tracking
  template_id: string;
  override_id: string | null;
  has_override: boolean;
}

// Input for creating/updating templates
export interface PromptTemplateInput {
  template_key: string;
  template_name: string;
  description?: string;
  category: PromptCategory;
  system_prompt: string;
  user_prompt_template?: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  available_variables?: string[];
  is_active?: boolean;
}

// Input for creating/updating overrides
export interface PromptOverrideInput {
  template_id: string;
  org_id: string;
  system_prompt_override?: string;
  user_prompt_template_override?: string;
  model_override?: string;
  temperature_override?: number;
  max_tokens_override?: number;
  additional_instructions?: string;
  custom_examples?: Array<{ input: string; output: string }>;
  is_active?: boolean;
}

// Template with its overrides
export interface TemplateWithOverrides extends PromptTemplate {
  overrides: PromptOverride[];
}

// Available models
export const AVAILABLE_MODELS = [
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B (Default)', provider: 'Groq' },
  { id: 'llama-3.1-70b-versatile', name: 'Llama 3.1 70B', provider: 'Groq' },
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B (Fast)', provider: 'Groq' },
  { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', provider: 'Groq' },
] as const;

// Category labels
export const CATEGORY_LABELS: Record<PromptCategory, string> = {
  extraction: 'Data Extraction',
  analysis: 'Analysis & Classification',
  generation: 'Content Generation',
  summarization: 'Summarization',
};

// Category colors
export const CATEGORY_COLORS: Record<PromptCategory, string> = {
  extraction: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  analysis: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  generation: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  summarization: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
};
