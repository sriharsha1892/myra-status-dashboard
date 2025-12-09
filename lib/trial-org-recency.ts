/**
 * Trial Organization Recency Helper Functions
 * Provides utilities for calculating activity recency, aging status, and related metrics
 */

export type ActivityStatus = 'active' | 'quiet' | 'stale' | 'dormant' | 'never_active';
export type CompletenessStatus = 'complete' | 'partial' | 'incomplete';

export interface RecencyMetrics {
  daysSinceLastActivity: number | null;
  activityStatus: ActivityStatus;
  activityStatusLabel: string;
  activityStatusColor: string;
  activityStatusIcon: string;
}

export interface CompletenessMetrics {
  score: number;
  status: CompletenessStatus;
  statusLabel: string;
  statusColor: string;
  percentage: string;
}

export interface ExpiryMetrics {
  daysUntilExpiry: number | null;
  isExpiringSoon: boolean;
  isExpired: boolean;
  expiryLabel: string;
  expiryColor: string;
}

/**
 * Calculate days since last activity
 */
export function getDaysSinceLastActivity(lastActivityAt: string | null): number | null {
  if (!lastActivityAt) return null;

  const lastActivity = new Date(lastActivityAt);
  const now = new Date();
  const diffMs = now.getTime() - lastActivity.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Determine activity status based on last activity timestamp
 */
export function getActivityStatus(lastActivityAt: string | null): ActivityStatus {
  const days = getDaysSinceLastActivity(lastActivityAt);

  if (days === null) return 'never_active';
  if (days < 7) return 'active';
  if (days < 14) return 'quiet';
  if (days < 30) return 'stale';
  return 'dormant';
}

/**
 * Get activity status label
 */
export function getActivityStatusLabel(status: ActivityStatus): string {
  const labels: Record<ActivityStatus, string> = {
    active: 'Active',
    quiet: 'Quiet',
    stale: 'Stale',
    dormant: 'Dormant',
    never_active: 'No Activity',
  };
  return labels[status];
}

/**
 * Get activity status color (Tailwind classes)
 */
export function getActivityStatusColor(status: ActivityStatus): string {
  const colors: Record<ActivityStatus, string> = {
    active: 'text-green-600 bg-green-50 border-green-200',
    quiet: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    stale: 'text-orange-600 bg-orange-50 border-orange-200',
    dormant: 'text-red-600 bg-red-50 border-red-200',
    never_active: 'text-gray-600 bg-gray-50 border-gray-200',
  };
  return colors[status];
}

/**
 * Get activity status icon emoji
 */
export function getActivityStatusIcon(status: ActivityStatus): string {
  const icons: Record<ActivityStatus, string> = {
    active: '🟢',
    quiet: '🟡',
    stale: '🟠',
    dormant: '🔴',
    never_active: '⚪',
  };
  return icons[status];
}

/**
 * Get comprehensive recency metrics
 */
export function getRecencyMetrics(lastActivityAt: string | null): RecencyMetrics {
  const daysSinceLastActivity = getDaysSinceLastActivity(lastActivityAt);
  const activityStatus = getActivityStatus(lastActivityAt);

  return {
    daysSinceLastActivity,
    activityStatus,
    activityStatusLabel: getActivityStatusLabel(activityStatus),
    activityStatusColor: getActivityStatusColor(activityStatus),
    activityStatusIcon: getActivityStatusIcon(activityStatus),
  };
}

/**
 * Format last activity as relative time string
 */
export function formatLastActivity(lastActivityAt: string | null): string {
  if (!lastActivityAt) return 'No activity yet';

  const days = getDaysSinceLastActivity(lastActivityAt);
  if (days === null) return 'No activity yet';

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return `${Math.floor(days / 7)} week ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 60) return '1 month ago';
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} year${days >= 730 ? 's' : ''} ago`;
}

/**
 * Determine completeness status
 */
export function getCompletenessStatus(score: number): CompletenessStatus {
  if (score >= 70) return 'complete';
  if (score >= 40) return 'partial';
  return 'incomplete';
}

/**
 * Get completeness status label
 */
export function getCompletenessStatusLabel(status: CompletenessStatus): string {
  const labels: Record<CompletenessStatus, string> = {
    complete: 'Complete',
    partial: 'Partial',
    incomplete: 'Incomplete',
  };
  return labels[status];
}

/**
 * Get completeness status color (Tailwind classes)
 */
export function getCompletenessStatusColor(status: CompletenessStatus): string {
  const colors: Record<CompletenessStatus, string> = {
    complete: 'text-green-700 bg-green-100 border-green-300',
    partial: 'text-yellow-700 bg-yellow-100 border-yellow-300',
    incomplete: 'text-red-700 bg-red-100 border-red-300',
  };
  return colors[status];
}

/**
 * Get comprehensive completeness metrics
 */
export function getCompletenessMetrics(score: number): CompletenessMetrics {
  const status = getCompletenessStatus(score);

  return {
    score,
    status,
    statusLabel: getCompletenessStatusLabel(status),
    statusColor: getCompletenessStatusColor(status),
    percentage: `${score}%`,
  };
}

/**
 * Calculate days until trial expiry
 */
export function getDaysUntilExpiry(trialEndDate: string | null): number | null {
  if (!trialEndDate) return null;

  const endDate = new Date(trialEndDate);
  const now = new Date();
  const diffMs = endDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Check if trial is expiring soon (within threshold days)
 */
export function isExpiringSoon(trialEndDate: string | null, thresholdDays: number = 7): boolean {
  const days = getDaysUntilExpiry(trialEndDate);
  if (days === null) return false;
  return days > 0 && days <= thresholdDays;
}

/**
 * Check if trial has expired
 */
export function isExpired(trialEndDate: string | null): boolean {
  const days = getDaysUntilExpiry(trialEndDate);
  if (days === null) return false;
  return days <= 0;
}

/**
 * Get comprehensive expiry metrics
 */
export function getExpiryMetrics(trialEndDate: string | null): ExpiryMetrics {
  const daysUntilExpiry = getDaysUntilExpiry(trialEndDate);
  const expiringSoon = isExpiringSoon(trialEndDate);
  const expired = isExpired(trialEndDate);

  let expiryLabel = 'No end date';
  let expiryColor = 'text-gray-600 bg-gray-50 border-gray-200';

  if (daysUntilExpiry !== null) {
    if (expired) {
      expiryLabel = daysUntilExpiry === 0 ? 'Expires today' : `Expired ${Math.abs(daysUntilExpiry)} day${Math.abs(daysUntilExpiry) !== 1 ? 's' : ''} ago`;
      expiryColor = 'text-red-700 bg-red-100 border-red-300';
    } else if (expiringSoon) {
      expiryLabel = daysUntilExpiry === 1 ? 'Expires tomorrow' : `${daysUntilExpiry} days left`;
      expiryColor = 'text-orange-700 bg-orange-100 border-orange-300';
    } else {
      expiryLabel = `${daysUntilExpiry} days left`;
      expiryColor = 'text-blue-600 bg-blue-50 border-blue-200';
    }
  }

  return {
    daysUntilExpiry,
    isExpiringSoon: expiringSoon,
    isExpired: expired,
    expiryLabel,
    expiryColor,
  };
}

/**
 * Check if org is at risk (active trial with stale activity)
 */
export function isAtRiskStale(
  currentStage: string,
  lastActivityAt: string | null,
  staleDaysThreshold: number = 7
): boolean {
  if (currentStage !== 'trial_active') return false;

  const days = getDaysSinceLastActivity(lastActivityAt);
  if (days === null) return true; // No activity at all for active trial is risky

  return days > staleDaysThreshold;
}

/**
 * Check if org is at risk (expiring soon with little recent engagement)
 */
export function isAtRiskExpiringSoon(
  trialEndDate: string | null,
  lastActivityAt: string | null,
  expiryThresholdDays: number = 7,
  activityThresholdDays: number = 3
): boolean {
  if (!isExpiringSoon(trialEndDate, expiryThresholdDays)) return false;

  const daysSinceActivity = getDaysSinceLastActivity(lastActivityAt);
  if (daysSinceActivity === null) return true; // No activity and expiring soon

  return daysSinceActivity > activityThresholdDays;
}

/**
 * Get overall risk assessment
 */
export interface RiskAssessment {
  isAtRisk: boolean;
  riskLevel: 'none' | 'low' | 'medium' | 'high';
  riskReasons: string[];
  riskColor: string;
}

export function getRiskAssessment(
  currentStage: string,
  lastActivityAt: string | null,
  trialEndDate: string | null,
  completenessScore: number
): RiskAssessment {
  const reasons: string[] = [];
  let riskLevel: RiskAssessment['riskLevel'] = 'none';

  // Check activity staleness
  if (isAtRiskStale(currentStage, lastActivityAt)) {
    reasons.push('Stale activity');
    riskLevel = 'medium';
  }

  // Check expiry risk
  if (isAtRiskExpiringSoon(trialEndDate, lastActivityAt)) {
    reasons.push('Expiring soon with low engagement');
    riskLevel = 'high';
  }

  // Check completeness
  if (completenessScore < 40) {
    reasons.push('Incomplete profile');
    if (riskLevel === 'none') riskLevel = 'low';
  }

  // Check for never active trials
  if (currentStage === 'trial_active' && lastActivityAt === null) {
    reasons.push('No activity recorded');
    riskLevel = 'high';
  }

  const colors: Record<RiskAssessment['riskLevel'], string> = {
    none: 'text-green-700 bg-green-100 border-green-300',
    low: 'text-yellow-700 bg-yellow-100 border-yellow-300',
    medium: 'text-orange-700 bg-orange-100 border-orange-300',
    high: 'text-red-700 bg-red-100 border-red-300',
  };

  return {
    isAtRisk: riskLevel !== 'none',
    riskLevel,
    riskReasons: reasons,
    riskColor: colors[riskLevel],
  };
}

/**
 * Sort comparator for last activity (most recent first)
 */
export function compareByLastActivity(
  a: { last_activity_at: string | null },
  b: { last_activity_at: string | null }
): number {
  // Nulls last
  if (!a.last_activity_at && !b.last_activity_at) return 0;
  if (!a.last_activity_at) return 1;
  if (!b.last_activity_at) return -1;

  // More recent first
  return new Date(b.last_activity_at).getTime() - new Date(a.last_activity_at).getTime();
}

/**
 * Sort comparator for completeness score (highest first)
 */
export function compareByCompleteness(
  a: { completeness_score: number },
  b: { completeness_score: number }
): number {
  return b.completeness_score - a.completeness_score;
}

/**
 * Filter orgs by activity status
 */
export function filterByActivityStatus(
  orgs: Array<{ last_activity_at: string | null }>,
  status: ActivityStatus | ActivityStatus[]
): Array<{ last_activity_at: string | null }> {
  const statusArray = Array.isArray(status) ? status : [status];

  return orgs.filter((org) => {
    const orgStatus = getActivityStatus(org.last_activity_at);
    return statusArray.includes(orgStatus);
  });
}

/**
 * Filter orgs by completeness status
 */
export function filterByCompletenessStatus(
  orgs: Array<{ completeness_score: number }>,
  status: CompletenessStatus | CompletenessStatus[]
): Array<{ completeness_score: number }> {
  const statusArray = Array.isArray(status) ? status : [status];

  return orgs.filter((org) => {
    const orgStatus = getCompletenessStatus(org.completeness_score);
    return statusArray.includes(orgStatus);
  });
}

/**
 * Filter orgs by days since last activity
 */
export function filterByDaysSinceActivity(
  orgs: Array<{ last_activity_at: string | null }>,
  minDays?: number,
  maxDays?: number
): Array<{ last_activity_at: string | null }> {
  return orgs.filter((org) => {
    const days = getDaysSinceLastActivity(org.last_activity_at);

    if (days === null) {
      // Never active - consider as infinite days
      return minDays !== undefined;
    }

    if (minDays !== undefined && days < minDays) return false;
    if (maxDays !== undefined && days > maxDays) return false;

    return true;
  });
}

/**
 * Get activity summary statistics
 */
export interface ActivitySummary {
  total: number;
  active: number;
  quiet: number;
  stale: number;
  dormant: number;
  neverActive: number;
  atRisk: number;
}

export function getActivitySummary(
  orgs: Array<{
    last_activity_at: string | null;
    current_stage: string;
    trial_end_date: string | null;
    completeness_score: number;
  }>
): ActivitySummary {
  const summary: ActivitySummary = {
    total: orgs.length,
    active: 0,
    quiet: 0,
    stale: 0,
    dormant: 0,
    neverActive: 0,
    atRisk: 0,
  };

  orgs.forEach((org) => {
    const status = getActivityStatus(org.last_activity_at);
    switch (status) {
      case 'active':
        summary.active++;
        break;
      case 'quiet':
        summary.quiet++;
        break;
      case 'stale':
        summary.stale++;
        break;
      case 'dormant':
        summary.dormant++;
        break;
      case 'never_active':
        summary.neverActive++;
        break;
    }

    const risk = getRiskAssessment(
      org.current_stage,
      org.last_activity_at,
      org.trial_end_date,
      org.completeness_score
    );
    if (risk.isAtRisk) {
      summary.atRisk++;
    }
  });

  return summary;
}
