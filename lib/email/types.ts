// Email Parsing Types

export type IngestionMethod = 'paste' | 'webhook' | 'forward';
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type Sentiment = 'positive' | 'neutral' | 'negative';
export type UrgencyLevel = 'low' | 'medium' | 'high' | 'urgent';
export type ActionItemType = 'follow_up' | 'meeting' | 'task' | 'deadline' | 'question' | 'other';
export type ActionItemStatus = 'pending' | 'in_progress' | 'completed' | 'dismissed';
export type ContactType = 'sender' | 'recipient' | 'mentioned' | 'cc';

export interface ParsedEmail {
  id: string;
  raw_content: string;
  message_id: string | null;
  from_email: string;
  from_name: string | null;
  to_emails: string[];
  cc_emails: string[];
  subject: string | null;
  email_date: string;
  body_text: string | null;
  org_id: string | null;
  extracted_entities: ExtractedEntities;
  extracted_actions: ExtractedAction[];
  sentiment: Sentiment | null;
  urgency_level: UrgencyLevel | null;
  summary: string | null;
  key_topics: string[];
  ingestion_method: IngestionMethod;
  processing_status: ProcessingStatus;
  processing_error: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailActionItem {
  id: string;
  parsed_email_id: string;
  action_text: string;
  action_type: ActionItemType | null;
  assignee: string | null;
  due_date: string | null;
  status: ActionItemStatus;
  converted_to_followup_id: string | null;
  converted_to_ticket_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailContact {
  id: string;
  parsed_email_id: string;
  name: string;
  email: string | null;
  role: string | null;
  company: string | null;
  matched_user_id: string | null;
  contact_type: ContactType;
  created_at: string;
}

// AI Extraction types
export interface ExtractedEntities {
  organizations?: Array<{
    name: string;
    confidence: number;
    matched_org_id?: string;
  }>;
  people?: Array<{
    name: string;
    email?: string;
    role?: string;
    company?: string;
  }>;
  competitors?: Array<{
    name: string;
    context?: string;
  }>;
  dates?: Array<{
    text: string;
    parsed_date?: string;
    context?: string;
  }>;
}

export interface ExtractedAction {
  text: string;
  type: ActionItemType;
  assignee?: string;
  due_date?: string;
  priority?: 'low' | 'medium' | 'high';
}

// Input types
export interface ParseEmailInput {
  raw_content: string;
  ingestion_method: IngestionMethod;
  org_id?: string;
}

export interface EmailParseResult {
  // Parsed headers
  from_email: string;
  from_name: string | null;
  to_emails: string[];
  cc_emails: string[];
  subject: string | null;
  email_date: Date;
  body_text: string;
  message_id: string | null;
}

export interface AIExtractionResult {
  entities: ExtractedEntities;
  actions: ExtractedAction[];
  sentiment: Sentiment;
  urgency: UrgencyLevel;
  summary: string;
  key_topics: string[];
  suggested_org_id?: string;
}

// Full email with relations
export interface ParsedEmailWithRelations extends ParsedEmail {
  action_items: EmailActionItem[];
  contacts: EmailContact[];
}

// Labels
export const SENTIMENT_LABELS: Record<Sentiment, string> = {
  positive: 'Positive',
  neutral: 'Neutral',
  negative: 'Negative',
};

export const URGENCY_LABELS: Record<UrgencyLevel, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

export const ACTION_TYPE_LABELS: Record<ActionItemType, string> = {
  follow_up: 'Follow-up',
  meeting: 'Meeting',
  task: 'Task',
  deadline: 'Deadline',
  question: 'Question',
  other: 'Other',
};

// Colors
export const SENTIMENT_COLORS: Record<Sentiment, string> = {
  positive: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  neutral: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  negative: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export const URGENCY_COLORS: Record<UrgencyLevel, string> = {
  low: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  urgent: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};
