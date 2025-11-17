/**
 * Email notification types and interfaces
 */

export type NotificationEmailType =
  | 'mention'
  | 'trial_handoff'
  | 'account_manager_note'
  | 'daily_digest'
  | 'weekly_digest';

export interface BaseEmailData {
  to: string;
  toName?: string;
}

export interface MentionEmailData extends BaseEmailData {
  actorName: string;
  orgName: string;
  notePreview: string;
  actionUrl: string;
  notePriority: number;
}

export interface TrialHandoffEmailData extends BaseEmailData {
  orgName: string;
  previousAccountManager: string;
  newAccountManager: string;
  handoffReason: string;
  contextNotes?: string;
  actionUrl: string;
  actorName: string;
}

export interface AccountManagerNoteEmailData extends BaseEmailData {
  orgName: string;
  noteCategory: string;
  notePreview: string;
  actorName: string;
  actionUrl: string;
}

export interface DigestNotification {
  id: string;
  title: string;
  message: string;
  priority_score: number;
  entity_type: string;
  entity_title: string;
  action_url: string;
  created_at: string;
  notification_type: string;
}

export interface DailyDigestEmailData extends BaseEmailData {
  userName: string;
  notifications: {
    high: DigestNotification[];
    medium: DigestNotification[];
    low: DigestNotification[];
  };
  totalCount: number;
  period: string;
  digestDate: string;
}

export interface WeeklyDigestEmailData extends BaseEmailData {
  userName: string;
  notifications: {
    high: DigestNotification[];
    medium: DigestNotification[];
    low: DigestNotification[];
  };
  totalCount: number;
  period: string;
  weekStart: string;
  weekEnd: string;
  stats: {
    totalMentions: number;
    totalHandoffs: number;
    totalNotes: number;
    mostActiveOrg: string;
  };
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: any;
  reason?: string;
}

export interface BrevoEmailParams {
  to: { email: string; name?: string }[];
  sender: { email: string; name: string };
  subject: string;
  htmlContent: string;
  textContent?: string;
  tags?: string[];
  params?: Record<string, any>;
}
