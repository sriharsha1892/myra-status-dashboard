/**
 * Context Inference - Smart defaults from session context
 *
 * Makes the system truly conversational by inferring missing details
 * from what the user has been doing in the session.
 */

export interface SessionContext {
  focusedOrgId: string | null;
  focusedOrgName: string | null;
  recentOrgs: Array<{ id: string; name: string }>;
  recentUsers: Array<{ id: string; name: string; orgId: string }>;
  lastAction?: {
    type: string;
    orgId?: string;
    orgName?: string;
    userId?: string;
    userName?: string;
    fields?: Record<string, any>;
    timestamp: Date;
  };
  conversationTopics: string[]; // Keywords mentioned in conversation
}

export interface InferredContext {
  orgId?: string;
  orgName?: string;
  userId?: string;
  userName?: string;
  inferredFields: Record<string, any>;
  confidence: number;
  reasoning: string;
}

/**
 * Infer missing context from session state
 */
export function inferContext(
  parsedInput: {
    action: string;
    org_name?: string | null;
    user_name?: string | null;
    fields?: Record<string, any>;
  },
  session: SessionContext
): InferredContext {
  const inferred: InferredContext = {
    inferredFields: {},
    confidence: 0,
    reasoning: '',
  };

  const reasons: string[] = [];

  // 1. Infer organization if not specified
  if (!parsedInput.org_name) {
    // First priority: focused org (user is viewing/working with this org)
    if (session.focusedOrgId && session.focusedOrgName) {
      inferred.orgId = session.focusedOrgId;
      inferred.orgName = session.focusedOrgName;
      inferred.confidence = 0.85;
      reasons.push(`Using focused org "${session.focusedOrgName}"`);
    }
    // Second priority: last action's org (if recent - within 2 minutes)
    else if (session.lastAction?.orgId && session.lastAction.timestamp) {
      const minutesSinceLastAction = (Date.now() - session.lastAction.timestamp.getTime()) / 60000;
      if (minutesSinceLastAction < 2) {
        inferred.orgId = session.lastAction.orgId;
        inferred.orgName = session.lastAction.orgName;
        inferred.confidence = 0.75;
        reasons.push(`Using org from previous action "${session.lastAction.orgName}"`);
      }
    }
    // Third priority: most recent org mentioned
    else if (session.recentOrgs.length > 0) {
      const recent = session.recentOrgs[0];
      inferred.orgId = recent.id;
      inferred.orgName = recent.name;
      inferred.confidence = 0.60;
      reasons.push(`Using recently mentioned org "${recent.name}"`);
    }
  }

  // 2. Infer user if not specified (and we have org context)
  const orgContext = inferred.orgId || parsedInput.org_name;
  if (!parsedInput.user_name && orgContext) {
    // Check if there's a recent user for this org
    const recentUserForOrg = session.recentUsers.find(
      u => u.orgId === inferred.orgId || u.name.toLowerCase().includes(String(parsedInput.org_name || '').toLowerCase())
    );
    if (recentUserForOrg) {
      inferred.userId = recentUserForOrg.id;
      inferred.userName = recentUserForOrg.name;
      inferred.confidence = Math.min(inferred.confidence, 0.70);
      reasons.push(`Using recent user "${recentUserForOrg.name}"`);
    }
  }

  // 3. Infer fields from last action (for "same" or "another" patterns)
  if (session.lastAction && parsedInput.action === session.lastAction.type) {
    // Copy fields that aren't specified in current input
    if (session.lastAction.fields) {
      for (const [key, value] of Object.entries(session.lastAction.fields)) {
        if (!parsedInput.fields?.[key]) {
          inferred.inferredFields[key] = value;
          reasons.push(`Using ${key} from previous action`);
        }
      }
    }
  }

  inferred.reasoning = reasons.length > 0
    ? reasons.join('; ')
    : 'No context inferred';

  return inferred;
}

/**
 * Detect if input is a follow-up to previous action
 */
export function detectFollowUp(
  input: string,
  session: SessionContext
): { isFollowUp: boolean; type: 'same_action' | 'different_org' | 'add_more' | null; targetOrg?: string } {
  const lowerInput = input.toLowerCase().trim();

  // "same for X" or "do the same for X"
  const sameForMatch = lowerInput.match(/^(?:same|do the same|repeat)(?: (?:for|at|with))?\s+(\w+(?:\s+\w+)?)/i);
  if (sameForMatch) {
    return {
      isFollowUp: true,
      type: 'different_org',
      targetOrg: sameForMatch[1],
    };
  }

  // "another one" or "add another"
  if (/^(?:another|add another|one more|do another)/.test(lowerInput)) {
    return {
      isFollowUp: true,
      type: 'add_more',
    };
  }

  // "same" or "again"
  if (/^(?:same|again|repeat|do it again)$/.test(lowerInput)) {
    return {
      isFollowUp: true,
      type: 'same_action',
    };
  }

  return { isFollowUp: false, type: null };
}

/**
 * Detect natural confirmations
 */
export function isConfirmation(input: string): boolean {
  const confirmPatterns = [
    /^(?:yes|yeah|yep|yup|sure|ok|okay|confirm|do it|go ahead|proceed|execute|run it|looks good|correct|right|affirmative)$/i,
    /^(?:yes|yeah),?\s*(?:do it|go ahead|please|that'?s? (?:right|correct))$/i,
    /^(?:lgtm|ship it|send it)$/i,
  ];

  const trimmed = input.trim();
  return confirmPatterns.some(pattern => pattern.test(trimmed));
}

/**
 * Detect natural rejections
 */
export function isRejection(input: string): boolean {
  const rejectPatterns = [
    /^(?:no|nope|nah|cancel|skip|nevermind|never mind|forget it|don'?t|stop)$/i,
    /^(?:no,?\s*)?(?:cancel|skip|don'?t do (?:it|that)|forget (?:it|that))$/i,
  ];

  const trimmed = input.trim();
  return rejectPatterns.some(pattern => pattern.test(trimmed));
}

/**
 * Extract time expressions and convert to dates
 */
export function parseTimeExpression(input: string): { date: Date; original: string } | null {
  const now = new Date();
  const lowerInput = input.toLowerCase();

  const patterns: Array<{ pattern: RegExp; getDate: () => Date }> = [
    {
      pattern: /\byesterday(?:'s)?\b/,
      getDate: () => {
        const d = new Date(now);
        d.setDate(d.getDate() - 1);
        return d;
      },
    },
    {
      pattern: /\btoday(?:'s)?\b/,
      getDate: () => new Date(now),
    },
    {
      pattern: /\blast week(?:'s)?\b/,
      getDate: () => {
        const d = new Date(now);
        d.setDate(d.getDate() - 7);
        return d;
      },
    },
    {
      pattern: /\bthis morning(?:'s)?\b/,
      getDate: () => {
        const d = new Date(now);
        d.setHours(9, 0, 0, 0);
        return d;
      },
    },
    {
      pattern: /\b(\d+)\s*(?:days?|d)\s*ago\b/,
      getDate: () => {
        const match = lowerInput.match(/(\d+)\s*(?:days?|d)\s*ago/);
        const days = match ? parseInt(match[1]) : 0;
        const d = new Date(now);
        d.setDate(d.getDate() - days);
        return d;
      },
    },
    {
      pattern: /\b(\d+)\s*(?:hours?|hrs?|h)\s*ago\b/,
      getDate: () => {
        const match = lowerInput.match(/(\d+)\s*(?:hours?|hrs?|h)\s*ago/);
        const hours = match ? parseInt(match[1]) : 0;
        const d = new Date(now);
        d.setHours(d.getHours() - hours);
        return d;
      },
    },
    {
      pattern: /\blast month(?:'s)?\b/,
      getDate: () => {
        const d = new Date(now);
        d.setMonth(d.getMonth() - 1);
        return d;
      },
    },
    {
      pattern: /\b(?:on\s+)?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/,
      getDate: () => {
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const match = lowerInput.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/);
        if (!match) return now;
        const targetDay = days.indexOf(match[1]);
        const currentDay = now.getDay();
        let daysBack = currentDay - targetDay;
        if (daysBack <= 0) daysBack += 7; // Go to previous week
        const d = new Date(now);
        d.setDate(d.getDate() - daysBack);
        return d;
      },
    },
  ];

  for (const { pattern, getDate } of patterns) {
    const match = lowerInput.match(pattern);
    if (match) {
      return {
        date: getDate(),
        original: match[0],
      };
    }
  }

  return null;
}

/**
 * Extract sentiment from natural language
 */
export function extractSentiment(input: string): 'positive' | 'negative' | 'neutral' | null {
  const lowerInput = input.toLowerCase();

  const positiveWords = [
    'great', 'good', 'excellent', 'amazing', 'awesome', 'fantastic', 'wonderful',
    'perfect', 'love', 'happy', 'excited', 'impressed', 'successful', 'productive',
    'smooth', 'easy', 'helpful', 'valuable', 'interested', 'enthusiastic'
  ];

  const negativeWords = [
    'bad', 'poor', 'terrible', 'awful', 'horrible', 'frustrating', 'disappointed',
    'confused', 'difficult', 'hard', 'problem', 'issue', 'bug', 'broken', 'stuck',
    'unhappy', 'concerned', 'worried', 'upset', 'angry', 'annoyed'
  ];

  let positiveCount = 0;
  let negativeCount = 0;

  for (const word of positiveWords) {
    if (lowerInput.includes(word)) positiveCount++;
  }

  for (const word of negativeWords) {
    if (lowerInput.includes(word)) negativeCount++;
  }

  if (positiveCount > negativeCount && positiveCount > 0) return 'positive';
  if (negativeCount > positiveCount && negativeCount > 0) return 'negative';
  if (positiveCount > 0 || negativeCount > 0) return 'neutral';

  return null;
}

export default {
  inferContext,
  detectFollowUp,
  isConfirmation,
  isRejection,
  parseTimeExpression,
  extractSentiment,
};
