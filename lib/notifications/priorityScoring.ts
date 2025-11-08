/**
 * Priority Scoring for Notifications
 * Calculates priority score (0-100) based on notification type and context
 * Score >= 65 = Priority category
 */

export interface NotificationContext {
  notificationType: 'mention' | 'assigned' | 'comment' | 'status_change' | 'issue_linked' | 'watching_update';
  entityType: 'note' | 'ticket' | 'roadmap_item' | 'meeting' | 'trial_org';
  actorId?: string;
  createdAt: Date;
  trialOrgData?: {
    trialEndDate?: Date;
    customFields?: Record<string, any>;
  };
  threadContext?: {
    mentionCount?: number;
    recentActivityCount?: number; // Activities in last 7 days
  };
}

/**
 * Base priority scores by notification type
 */
const BASE_PRIORITY: Record<NotificationContext['notificationType'], number> = {
  assigned: 70,      // Being assigned is high priority
  mention: 60,       // Direct mentions are important
  issue_linked: 55,  // Issue linking needs attention
  status_change: 50, // Status changes are informational
  comment: 45,       // Comments are lower priority
  watching_update: 40 // Background updates
};

/**
 * Calculate priority score for a notification
 */
export function calculatePriorityScore(context: NotificationContext): number {
  let score = BASE_PRIORITY[context.notificationType];

  // Modifier 1: Trial ending soon (+15)
  if (context.trialOrgData?.trialEndDate) {
    const daysRemaining = getDaysRemaining(context.trialOrgData.trialEndDate);
    if (daysRemaining <= 7 && daysRemaining > 0) {
      score += 15;
    }
  }

  // Modifier 2: High-value org (+10)
  // Check for custom field markers like "enterprise" or "high_value"
  if (context.trialOrgData?.customFields) {
    const fields = context.trialOrgData.customFields;
    if (
      fields.tier === 'enterprise' ||
      fields.priority === 'high' ||
      fields.high_value === true
    ) {
      score += 10;
    }
  }

  // Modifier 3: Mentioned by manager/admin (+10)
  // This would need to check actor role - placeholder for now
  // In production, you'd query user role from database
  // if (actorIsManager(context.actorId)) score += 10;

  // Modifier 4: Multiple mentions in thread (+5)
  if (context.threadContext?.mentionCount && context.threadContext.mentionCount >= 3) {
    score += 5;
  }

  // Modifier 5: Recent activity spike (+5)
  if (context.threadContext?.recentActivityCount && context.threadContext.recentActivityCount >= 5) {
    score += 5;
  }

  // Decay: Older notifications lose priority
  const ageHours = getAgeInHours(context.createdAt);
  if (ageHours > 72) {
    score -= 20; // Older than 3 days
  } else if (ageHours > 24) {
    score -= 10; // Older than 1 day
  }

  // Clamp score between 0 and 100
  return Math.max(0, Math.min(100, score));
}

/**
 * Get category based on priority score
 */
export function getCategoryFromScore(score: number): 'priority' | 'recent' | 'archived' {
  if (score >= 65) return 'priority';
  return 'recent';
}

/**
 * Helper: Calculate days remaining until date
 */
function getDaysRemaining(endDate: Date): number {
  const now = new Date();
  const end = new Date(endDate);
  const diffMs = end.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Helper: Calculate age in hours
 */
function getAgeInHours(createdAt: Date): number {
  const now = new Date();
  const created = new Date(createdAt);
  const diffMs = now.getTime() - created.getTime();
  return diffMs / (1000 * 60 * 60);
}

/**
 * Batch calculate priority scores
 */
export function batchCalculatePriority(
  notifications: Array<NotificationContext>
): Array<{ notification: NotificationContext; score: number; category: string }> {
  return notifications.map(notification => {
    const score = calculatePriorityScore(notification);
    const category = getCategoryFromScore(score);
    return { notification, score, category };
  });
}

/**
 * Example usage:
 *
 * const score = calculatePriorityScore({
 *   notificationType: 'mention',
 *   entityType: 'note',
 *   actorId: 'user-123',
 *   createdAt: new Date(),
 *   trialOrgData: {
 *     trialEndDate: new Date('2025-11-15'),
 *     customFields: { tier: 'enterprise' }
 *   },
 *   threadContext: {
 *     mentionCount: 2,
 *     recentActivityCount: 3
 *   }
 * });
 *
 * // score = 60 (mention) + 15 (trial ending) + 10 (enterprise) = 85
 * // category = 'priority'
 */
