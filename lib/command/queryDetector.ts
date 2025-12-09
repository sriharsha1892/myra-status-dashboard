/**
 * Query Detector - Identify questions vs actions
 *
 * Detects when users are asking questions about data rather than
 * requesting actions to be performed.
 */

export type QueryType =
  | 'count'           // How many demos?
  | 'value'           // What's the deal value?
  | 'status'          // What stage is ABB at?
  | 'list'            // List all users at ABB
  | 'recent'          // What was the last activity?
  | 'comparison'      // Compare ABB to BASF
  | 'summary';        // Give me a summary of ABB

export interface DetectedQuery {
  isQuery: boolean;
  type: QueryType | null;
  entity: 'org' | 'user' | 'activity' | 'deal' | 'ticket' | null;
  orgName: string | null;
  userName: string | null;
  metric: string | null;
  timeRange: 'today' | 'week' | 'month' | 'quarter' | 'all' | null;
  originalText: string;
  confidence: number;
}

// Question indicators
const QUESTION_STARTERS = [
  /^(?:how many|how much|what(?:'s| is| are| was| were)?|when|where|who|which|show me|tell me|get|find|list|display)/i,
  /\?$/,  // Ends with question mark
];

// Query patterns with extractors
const QUERY_PATTERNS: Array<{
  pattern: RegExp;
  type: QueryType;
  entity: DetectedQuery['entity'];
  extractors: {
    orgName?: number;  // Capture group index
    userName?: number;
    metric?: number;
    timeRange?: (match: RegExpMatchArray) => DetectedQuery['timeRange'];
  };
}> = [
  // Count queries
  {
    pattern: /how many (?:(\w+)s?\s+)?(?:at|for|from)\s+(\w+(?:\s+\w+)?)/i,
    type: 'count',
    entity: 'activity',
    extractors: { metric: 1, orgName: 2 },
  },
  {
    pattern: /how many (\w+)s?\s+(?:does|did|has|have)\s+(\w+(?:\s+\w+)?)/i,
    type: 'count',
    entity: 'activity',
    extractors: { metric: 1, orgName: 2 },
  },
  {
    pattern: /(?:count|number of)\s+(\w+)s?\s+(?:at|for)\s+(\w+(?:\s+\w+)?)/i,
    type: 'count',
    entity: 'activity',
    extractors: { metric: 1, orgName: 2 },
  },

  // Value queries
  {
    pattern: /what(?:'s| is| are)?\s+(?:the\s+)?(?:deal\s+)?(?:value|amount|size)\s+(?:for|of|at)\s+(\w+(?:\s+\w+)?)/i,
    type: 'value',
    entity: 'deal',
    extractors: { orgName: 1 },
  },
  {
    pattern: /(\w+(?:\s+\w+)?)\s+deal\s+(?:value|size|amount)/i,
    type: 'value',
    entity: 'deal',
    extractors: { orgName: 1 },
  },

  // Status queries
  {
    pattern: /what(?:'s| is)?\s+(?:the\s+)?(?:stage|status|phase)\s+(?:of|for|at)\s+(\w+(?:\s+\w+)?)/i,
    type: 'status',
    entity: 'org',
    extractors: { orgName: 1 },
  },
  {
    pattern: /(?:what|which)\s+stage\s+is\s+(\w+(?:\s+\w+)?)\s+(?:at|in|on)/i,
    type: 'status',
    entity: 'org',
    extractors: { orgName: 1 },
  },
  {
    pattern: /where\s+is\s+(\w+(?:\s+\w+)?)\s+(?:at|in)/i,
    type: 'status',
    entity: 'org',
    extractors: { orgName: 1 },
  },

  // List queries
  {
    pattern: /(?:list|show|get|find)\s+(?:all\s+)?(?:users?|contacts?|people)\s+(?:at|for|from)\s+(\w+(?:\s+\w+)?)/i,
    type: 'list',
    entity: 'user',
    extractors: { orgName: 1 },
  },
  {
    pattern: /who\s+(?:is|are)\s+(?:at|from|with)\s+(\w+(?:\s+\w+)?)/i,
    type: 'list',
    entity: 'user',
    extractors: { orgName: 1 },
  },
  {
    pattern: /(?:list|show|get)\s+(?:all\s+)?(?:activities?|events?)\s+(?:at|for|from)\s+(\w+(?:\s+\w+)?)/i,
    type: 'list',
    entity: 'activity',
    extractors: { orgName: 1 },
  },

  // Recent queries
  {
    pattern: /(?:what|when)\s+was\s+(?:the\s+)?(?:last|latest|recent)\s+(?:activity|event|interaction)\s+(?:at|for|from|with)\s+(\w+(?:\s+\w+)?)/i,
    type: 'recent',
    entity: 'activity',
    extractors: { orgName: 1 },
  },
  {
    pattern: /(?:last|latest|recent)\s+(?:activity|event|interaction)\s+(?:at|for|from|with)\s+(\w+(?:\s+\w+)?)/i,
    type: 'recent',
    entity: 'activity',
    extractors: { orgName: 1 },
  },

  // Summary queries
  {
    pattern: /(?:summary|overview|status|info|details?)\s+(?:of|for|about|on)\s+(\w+(?:\s+\w+)?)/i,
    type: 'summary',
    entity: 'org',
    extractors: { orgName: 1 },
  },
  {
    pattern: /tell me about\s+(\w+(?:\s+\w+)?)/i,
    type: 'summary',
    entity: 'org',
    extractors: { orgName: 1 },
  },
  {
    pattern: /(?:what|how)\s+(?:is|are)\s+(\w+(?:\s+\w+)?)\s+doing/i,
    type: 'summary',
    entity: 'org',
    extractors: { orgName: 1 },
  },
];

// Time range patterns
const TIME_PATTERNS: Array<{ pattern: RegExp; range: DetectedQuery['timeRange'] }> = [
  { pattern: /\btoday\b/i, range: 'today' },
  { pattern: /\bthis week\b/i, range: 'week' },
  { pattern: /\bthis month\b/i, range: 'month' },
  { pattern: /\bthis quarter\b/i, range: 'quarter' },
  { pattern: /\blast (?:7|seven) days?\b/i, range: 'week' },
  { pattern: /\blast (?:30|thirty) days?\b/i, range: 'month' },
  { pattern: /\ball time\b/i, range: 'all' },
];

/**
 * Detect if input is a query (question) rather than an action
 */
export function detectQuery(input: string): DetectedQuery {
  const trimmedInput = input.trim();

  // Check if it looks like a question
  const isLikelyQuestion = QUESTION_STARTERS.some(pattern => pattern.test(trimmedInput));

  if (!isLikelyQuestion) {
    return {
      isQuery: false,
      type: null,
      entity: null,
      orgName: null,
      userName: null,
      metric: null,
      timeRange: null,
      originalText: trimmedInput,
      confidence: 0,
    };
  }

  // Try to match query patterns
  for (const { pattern, type, entity, extractors } of QUERY_PATTERNS) {
    const match = trimmedInput.match(pattern);
    if (match) {
      // Extract time range
      let timeRange: DetectedQuery['timeRange'] = null;
      for (const { pattern: timePattern, range } of TIME_PATTERNS) {
        if (timePattern.test(trimmedInput)) {
          timeRange = range;
          break;
        }
      }

      return {
        isQuery: true,
        type,
        entity,
        orgName: extractors.orgName ? match[extractors.orgName]?.trim() || null : null,
        userName: extractors.userName ? match[extractors.userName]?.trim() || null : null,
        metric: extractors.metric ? match[extractors.metric]?.trim() || null : null,
        timeRange: extractors.timeRange ? extractors.timeRange(match) : timeRange,
        originalText: trimmedInput,
        confidence: 0.85,
      };
    }
  }

  // It looks like a question but we don't recognize the pattern
  return {
    isQuery: true,
    type: null,
    entity: null,
    orgName: null,
    userName: null,
    metric: null,
    timeRange: null,
    originalText: trimmedInput,
    confidence: 0.5,
  };
}

/**
 * Check if input is definitely a query
 */
export function isDefinitelyQuery(input: string): boolean {
  const result = detectQuery(input);
  return result.isQuery && result.confidence >= 0.7;
}

export default detectQuery;
