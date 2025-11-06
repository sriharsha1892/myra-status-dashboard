import { differenceInDays, differenceInHours, parseISO } from 'date-fns';

interface Organization {
  id: string;
  name: string;
  status: 'trial' | 'paid' | 'cancelled';
  trial_end_date?: string | null;
  created_at: string;
  last_activity?: string | null;
  account_manager?: string | null;
}

interface Ticket {
  id: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
  updated_at: string;
}

interface ActivityLog {
  date: string;
  login_count: number;
  actions_count: number;
}

export interface HealthMetrics {
  overall: number; // 0-100
  engagement: number; // 0-100
  support: number; // 0-100
  featureUsage: number; // 0-100
  responsiveness: number; // 0-100
  status: 'healthy' | 'warning' | 'at-risk' | 'critical';
  issues: string[];
  recommendations: string[];
}

export interface HealthAnalysis {
  metrics: HealthMetrics;
  trend: 'improving' | 'stable' | 'declining';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  daysUntilAction?: number; // Days until trial ends, ticket SLA breach, etc.
}

/**
 * Calculate engagement score based on activity patterns
 */
export function calculateEngagementScore(
  activityLogs: ActivityLog[],
  organization: Organization
): number {
  if (activityLogs.length === 0) return 0;

  const last7Days = activityLogs.slice(-7);
  const totalLogins = last7Days.reduce((sum, log) => sum + log.login_count, 0);
  const avgLoginsPerDay = totalLogins / 7;

  // Expected activity based on org type
  const expectedDaily = organization.status === 'trial' ? 2 : 3;

  // Calculate score (0-100)
  let score = Math.min((avgLoginsPerDay / expectedDaily) * 100, 100);

  // Check for concerning patterns
  const last3Days = last7Days.slice(-3);
  const recentLogins = last3Days.reduce((sum, log) => sum + log.login_count, 0);

  if (recentLogins === 0) {
    score = Math.max(score * 0.3, 0); // Major penalty for no recent activity
  } else if (recentLogins < 3) {
    score = Math.max(score * 0.6, 0); // Moderate penalty
  }

  // Check for declining trend
  const first3Days = last7Days.slice(0, 3);
  const first3Logins = first3Days.reduce((sum, log) => sum + log.login_count, 0);

  if (first3Logins > 0 && recentLogins < first3Logins * 0.5) {
    score = Math.max(score * 0.7, 0); // Penalty for 50%+ drop
  }

  return Math.round(score);
}

/**
 * Calculate support health score based on ticket status
 */
export function calculateSupportScore(tickets: Ticket[]): number {
  if (tickets.length === 0) return 100; // No tickets = perfect score

  const openTickets = tickets.filter(t => t.status === 'open' || t.status === 'in_progress');

  if (openTickets.length === 0) return 100;

  let score = 100;
  const now = new Date();

  openTickets.forEach(ticket => {
    const hoursOpen = differenceInHours(now, parseISO(ticket.created_at));

    // Deduct points based on priority and age
    if (ticket.priority === 'critical') {
      if (hoursOpen > 4) score -= 40;
      else if (hoursOpen > 2) score -= 25;
      else if (hoursOpen > 1) score -= 15;
    } else if (ticket.priority === 'high') {
      if (hoursOpen > 24) score -= 30;
      else if (hoursOpen > 12) score -= 20;
      else if (hoursOpen > 6) score -= 10;
    } else if (ticket.priority === 'medium') {
      if (hoursOpen > 48) score -= 20;
      else if (hoursOpen > 24) score -= 10;
    } else {
      if (hoursOpen > 72) score -= 10;
    }
  });

  return Math.max(Math.round(score), 0);
}

/**
 * Calculate feature usage score
 */
export function calculateFeatureUsageScore(
  featuresUsed: string[],
  totalFeatures: number = 10
): number {
  const usageRate = featuresUsed.length / totalFeatures;
  return Math.round(usageRate * 100);
}

/**
 * Calculate responsiveness score based on communication
 */
export function calculateResponsivenessScore(
  lastOutreach?: string | null,
  lastResponse?: string | null
): number {
  if (!lastOutreach) return 100; // No outreach yet

  const outreachDate = parseISO(lastOutreach);
  const now = new Date();
  const daysSinceOutreach = differenceInDays(now, outreachDate);

  // If they responded
  if (lastResponse) {
    const responseDate = parseISO(lastResponse);
    if (responseDate > outreachDate) {
      return 100; // Responded to latest outreach
    }
  }

  // No response - deduct based on days
  if (daysSinceOutreach > 7) return 0;
  if (daysSinceOutreach > 5) return 20;
  if (daysSinceOutreach > 3) return 50;
  if (daysSinceOutreach > 1) return 80;

  return 100;
}

/**
 * Calculate overall health score (weighted average)
 */
export function calculateOverallHealth(
  engagement: number,
  support: number,
  featureUsage: number,
  responsiveness: number
): number {
  const weighted =
    engagement * 0.35 +      // Most important
    support * 0.30 +         // Critical for satisfaction
    featureUsage * 0.20 +    // Indicates value
    responsiveness * 0.15;   // Early warning signal

  return Math.round(weighted);
}

/**
 * Determine health status from score
 */
export function getHealthStatus(score: number): HealthMetrics['status'] {
  if (score >= 80) return 'healthy';
  if (score >= 60) return 'warning';
  if (score >= 40) return 'at-risk';
  return 'critical';
}

/**
 * Generate issues list based on metrics
 */
export function generateIssues(
  organization: Organization,
  tickets: Ticket[],
  activityLogs: ActivityLog[],
  engagement: number,
  support: number,
  responsiveness: number
): string[] {
  const issues: string[] = [];
  const now = new Date();

  // Trial expiring
  if (organization.status === 'trial' && organization.trial_end_date) {
    const daysLeft = differenceInDays(parseISO(organization.trial_end_date), now);
    if (daysLeft <= 2) {
      issues.push(`Trial ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`);
    }
  }

  // Inactivity
  const last3Days = activityLogs.slice(-3);
  const recentLogins = last3Days.reduce((sum, log) => sum + log.login_count, 0);
  if (recentLogins === 0) {
    issues.push("No activity in last 3 days (usually active)");
  }

  // Critical tickets
  const criticalTickets = tickets.filter(
    t => (t.status === 'open' || t.status === 'in_progress') && t.priority === 'critical'
  );
  if (criticalTickets.length > 0) {
    const hoursOpen = differenceInHours(now, parseISO(criticalTickets[0].created_at));
    issues.push(`Critical ticket open for ${hoursOpen} hours`);
  }

  // High priority tickets
  const highTickets = tickets.filter(
    t => (t.status === 'open' || t.status === 'in_progress') && t.priority === 'high'
  );
  if (highTickets.length > 0) {
    issues.push(`${highTickets.length} high priority ticket${highTickets.length > 1 ? 's' : ''} open`);
  }

  // Low engagement
  if (engagement < 30) {
    issues.push("Very low engagement (using <30% of expected)");
  }

  // Not responding
  if (responsiveness < 30) {
    issues.push("Not responding to outreach attempts");
  }

  return issues;
}

/**
 * Generate recommendations based on analysis
 */
export function generateRecommendations(
  organization: Organization,
  tickets: Ticket[],
  engagement: number,
  support: number,
  responsiveness: number
): string[] {
  const recommendations: string[] = [];
  const now = new Date();

  // Trial ending soon
  if (organization.status === 'trial' && organization.trial_end_date) {
    const daysLeft = differenceInDays(parseISO(organization.trial_end_date), now);
    if (daysLeft <= 2 && engagement < 50) {
      recommendations.push("Call today to discuss trial experience and potential blockers");
      recommendations.push("Consider extending trial by 7 days to allow more time");
    }
  }

  // Critical tickets
  const criticalTickets = tickets.filter(
    t => (t.status === 'open' || t.status === 'in_progress') && t.priority === 'critical'
  );
  if (criticalTickets.length > 0) {
    recommendations.push("Escalate critical ticket to engineering immediately");
    recommendations.push("Call customer to acknowledge issue and provide timeline");
  }

  // Low engagement
  if (engagement < 40) {
    recommendations.push("Schedule onboarding call to ensure they understand features");
    recommendations.push("Send feature highlight email with specific use cases");
  }

  // Not responding
  if (responsiveness < 30) {
    recommendations.push("Try calling instead of email (may prefer phone)");
    recommendations.push("Check if primary contact is still at company");
  }

  // Declining trend
  if (engagement < 50 && support < 50) {
    recommendations.push("Schedule check-in call to understand concerns");
    recommendations.push("Review their use case - are they getting value?");
  }

  return recommendations;
}

/**
 * Main health analysis function
 */
export function analyzeOrganizationHealth(
  organization: Organization,
  tickets: Ticket[],
  activityLogs: ActivityLog[],
  featuresUsed: string[],
  lastOutreach?: string | null,
  lastResponse?: string | null
): HealthAnalysis {
  // Calculate individual scores
  const engagement = calculateEngagementScore(activityLogs, organization);
  const support = calculateSupportScore(tickets);
  const featureUsage = calculateFeatureUsageScore(featuresUsed);
  const responsiveness = calculateResponsivenessScore(lastOutreach, lastResponse);

  // Calculate overall
  const overall = calculateOverallHealth(engagement, support, featureUsage, responsiveness);
  const status = getHealthStatus(overall);

  // Generate issues and recommendations
  const issues = generateIssues(organization, tickets, activityLogs, engagement, support, responsiveness);
  const recommendations = generateRecommendations(organization, tickets, engagement, support, responsiveness);

  // Determine trend
  let trend: 'improving' | 'stable' | 'declining' = 'stable';
  if (activityLogs.length >= 7) {
    const firstHalf = activityLogs.slice(0, 3);
    const secondHalf = activityLogs.slice(-3);
    const firstLogins = firstHalf.reduce((sum, log) => sum + log.login_count, 0);
    const secondLogins = secondHalf.reduce((sum, log) => sum + log.login_count, 0);

    if (secondLogins > firstLogins * 1.3) trend = 'improving';
    else if (secondLogins < firstLogins * 0.7) trend = 'declining';
  }

  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
  if (overall < 40) riskLevel = 'critical';
  else if (overall < 60) riskLevel = 'high';
  else if (overall < 80) riskLevel = 'medium';

  // Calculate days until action needed
  let daysUntilAction: number | undefined;
  if (organization.status === 'trial' && organization.trial_end_date) {
    daysUntilAction = differenceInDays(parseISO(organization.trial_end_date), new Date());
  }

  return {
    metrics: {
      overall,
      engagement,
      support,
      featureUsage,
      responsiveness,
      status,
      issues,
      recommendations,
    },
    trend,
    riskLevel,
    daysUntilAction,
  };
}
