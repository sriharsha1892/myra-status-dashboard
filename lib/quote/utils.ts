import type { OrgStatus } from './pipeline-types';
import { ORG_STATUS_LABELS, ORG_STATUS_COLORS } from './pipeline-types';

/**
 * Organization statistics interface
 */
export interface OrgStats {
  total: number;
  byStatus: Record<string, number>;
  byTrialStatus: Record<string, number>;
  totalDealValue: number;
}

/**
 * Organization status configuration for UI rendering
 */
export interface OrgStatusConfig {
  id: OrgStatus;
  label: string;
  color: string;
}

/**
 * Array of organization statuses for iteration in UI components
 */
export const ORG_STATUSES: OrgStatusConfig[] = [
  { id: 'prospect', label: ORG_STATUS_LABELS.prospect, color: ORG_STATUS_COLORS.prospect },
  { id: 'demo_done', label: ORG_STATUS_LABELS.demo_done, color: ORG_STATUS_COLORS.demo_done },
  { id: 'trial_access', label: ORG_STATUS_LABELS.trial_access, color: ORG_STATUS_COLORS.trial_access },
  { id: 'negotiation', label: ORG_STATUS_LABELS.negotiation, color: ORG_STATUS_COLORS.negotiation },
  { id: 'onboarded', label: ORG_STATUS_LABELS.onboarded, color: ORG_STATUS_COLORS.onboarded },
  { id: 'rejected', label: ORG_STATUS_LABELS.rejected, color: ORG_STATUS_COLORS.rejected },
];

/**
 * Format a numeric value as currency with appropriate suffix (K, M)
 */
export function formatValue(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value}`;
}

/**
 * Format a date string as a relative time (e.g., "2h", "3d", "2w")
 */
export function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;

  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format a date for display (e.g., "Dec 15, 2024")
 */
export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format a time for display (e.g., "10:30 AM")
 */
export function formatTime(timeStr: string | null): string {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}
