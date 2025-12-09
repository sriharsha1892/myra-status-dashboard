/**
 * Multi-Action Extractor
 * Extracts multiple actionable items from natural language input
 *
 * Supports extraction of:
 * - Follow-ups with temporal references
 * - Stakeholder influence signals
 * - Competitive mentions
 * - Feature interest signals
 * - Deal momentum signals
 * - Status updates
 */

import { parseNaturalDate, extractDatesFromText, type ParsedDate } from '@/lib/utils/dateTime';
import type { CommandAction } from '@/lib/actions';

// ============ TYPES ============

export interface ExtractedAction {
  /** Action type to execute */
  action: CommandAction;
  /** Extracted fields for this action */
  fields: Record<string, any>;
  /** Confidence level */
  confidence: 'high' | 'medium' | 'low';
  /** Source text that triggered this extraction */
  sourceText: string;
  /** Original position in input */
  position: number;
}

export interface MultiActionResult {
  /** Primary action (if a slash command was used) */
  primaryAction?: ExtractedAction;
  /** Additional extracted actions */
  extractedActions: ExtractedAction[];
  /** Original input text */
  originalText: string;
  /** Entities mentioned */
  entities: {
    orgName?: string;
    userName?: string;
    dates: ParsedDate[];
    competitors: string[];
    features: string[];
    stakeholders: string[];
  };
}

// ============ PATTERNS ============

// Follow-up patterns
const FOLLOWUP_PATTERNS = [
  /(?:follow[- ]?up|call back|check[- ]?in|reach out|schedule|remind|touch base)(?:\s+(?:with\s+)?(?:them|him|her))?(?:\s+(?:on|by|before|next|in|tomorrow|this))?(?:\s+([^,.!?]+))?/gi,
  /(?:next|this)\s+(?:call|meeting|check[- ]?in)\s+(?:on|by|before)?\s*([^,.!?]+)?/gi,
  /(?:let'?s|we should|need to|will)\s+(?:follow[- ]?up|call|email|meet|schedule)(?:\s+(?:on|by|next|in|tomorrow))?(?:\s+([^,.!?]+))?/gi,
];

// Stakeholder patterns
const STAKEHOLDER_PATTERNS = {
  champion: [
    /(?:is|are|seems?|appears?)\s+(?:a\s+)?(?:huge\s+)?(?:fan|champion|advocate|supporter)/gi,
    /(?:pushing|advocating|championing)\s+(?:for\s+)?(?:us|our|the solution)/gi,
    /(?:really|very|super)\s+(?:excited|enthusiastic|positive)/gi,
    /(?:internal|strong)\s+champion/gi,
    /(?:definitely|clearly|obviously)\s+(?:a\s+)?(?:our\s+)?champion/gi,
  ],
  blocker: [
    /(?:is|are|seems?|appears?)\s+(?:a\s+)?(?:blocker|obstacle|resistant|skeptical)/gi,
    /(?:pushing back|blocking|opposing|against)/gi,
    /(?:doesn't|does not|won't|will not)\s+(?:like|want|support|approve)/gi,
    /(?:concerned|worried|hesitant|reluctant)\s+(?:about)?/gi,
  ],
  decision_maker: [
    /(?:is|are)\s+(?:the\s+)?(?:decision[- ]?maker|final authority|key decision)/gi,
    /(?:makes?|has)\s+(?:the\s+)?(?:final|buying|purchasing)\s+(?:decision|call)/gi,
    /(?:signs?|approves?)\s+(?:the\s+)?(?:contract|deal|purchase)/gi,
  ],
  evaluator: [
    /(?:is|are)\s+(?:evaluating|testing|reviewing|assessing)/gi,
    /(?:technical\s+)?(?:evaluator|reviewer)/gi,
    /(?:running|doing)\s+(?:a\s+)?(?:poc|pilot|evaluation|assessment)/gi,
  ],
};

// Competitor patterns
const COMPETITOR_PATTERNS = [
  /(?:using|considering|looking at|evaluating|compared to|comparing.*to|vs\.?|versus)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
  /(?:competitor|alternative|rival)\s+(?:is\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
  /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:is\s+)?(?:cheaper|faster|better|worse)/g,
  /(?:switching|migrating)\s+(?:from|to)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
  /comparing\s+(?:us|them|it)\s+(?:to|with|against)\s+([A-Z][a-z]+)/gi,
];

// Feature interest patterns
const FEATURE_PATTERNS = [
  /(?:need|want|require|looking for|interested in|asked about)\s+(?:a\s+)?([^,.!?]+?)(?:\s+(?:feature|capability|functionality))?(?:[,.!?]|$)/gi,
  /(?:can you|do you|does it|can we)\s+(?:support|have|offer|provide)\s+([^?]+)\?/gi,
  /(?:would be|would help|need|require)\s+(?:nice|great|helpful)\s+(?:to have|if)\s+([^,.!?]+)/gi,
  /(?:critical|important|must have|essential)\s+(?:feature\s+)?(?:is\s+)?([^,.!?]+)/gi,
  /asked\s+(?:about|if)\s+(?:we|you)\s+(?:have|support|can|could)\s+([^?]+)/gi,
  /do\s+you\s+(?:have|support|offer)\s+([^?]+)\?/gi,
];

// Momentum patterns
const MOMENTUM_PATTERNS = {
  positive: [
    /(?:deal|things?|progress)\s+(?:is|are|looking)\s+(?:going\s+)?(?:well|great|positive|good)/gi,
    /(?:moving|progressing|advancing)\s+(?:forward|quickly|fast)/gi,
    /(?:ready|close|near)\s+to\s+(?:close|sign|buy|convert)/gi,
    /(?:excited|enthusiastic|eager)\s+(?:to\s+)?(?:move|proceed|continue)/gi,
  ],
  stalled: [
    /(?:deal|things?|progress)\s+(?:is|are|has)\s+(?:stalled|stuck|slow|paused)/gi,
    /(?:no\s+)?(?:response|activity|movement|progress)/gi,
    /(?:went|gone|going)\s+(?:quiet|silent|dark)/gi,
    /(?:delayed|postponed|pushed back)/gi,
  ],
  at_risk: [
    /(?:deal|they|account)\s+(?:is|are)\s+(?:at\s+)?risk/gi,
    /(?:might|may|could)\s+(?:lose|churn|leave|cancel)/gi,
    /(?:competitor|alternative)\s+(?:is\s+)?(?:winning|ahead)/gi,
    /(?:budget|funding|project)\s+(?:cut|cancelled|on hold)/gi,
    /budget\s+(?:got\s+)?cut/gi,
    /project\s+(?:might|may|could)\s+be\s+cancelled/gi,
  ],
};

// Status/sentiment patterns
const SENTIMENT_PATTERNS = {
  positive: [
    /(?:great|awesome|excellent|fantastic|amazing|wonderful|love|happy|pleased|satisfied|impressed)/gi,
    /(?:really|very|super)\s+(?:good|positive|excited|impressed)/gi,
    /(?:went|going)\s+(?:really\s+)?well/gi,
  ],
  negative: [
    /(?:issue|problem|concern|frustrated|unhappy|disappointed|confused|struggling)/gi,
    /(?:not|don't|doesn't|didn't)\s+(?:work|like|understand|happy)/gi,
    /(?:bug|error|broken|failing|failed)/gi,
  ],
};

// ============ EXTRACTION FUNCTIONS ============

/**
 * Extract follow-up actions from text
 */
function extractFollowups(text: string): ExtractedAction[] {
  const actions: ExtractedAction[] = [];
  const normalizedText = text.toLowerCase();

  for (const pattern of FOLLOWUP_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const dateText = match[1] || '';
      const parsedDate = dateText ? parseNaturalDate(dateText.trim()) : null;

      // Try to extract from surrounding context if no date found
      const contextStart = Math.max(0, match.index - 50);
      const contextEnd = Math.min(text.length, match.index + match[0].length + 50);
      const context = text.substring(contextStart, contextEnd);
      const dates = extractDatesFromText(context);

      const dueDate = parsedDate?.date || (dates.length > 0 ? dates[0].date : null);

      // Try to determine follow-up type from context
      let followupType = 'general';
      if (/call/i.test(match[0])) followupType = 'call';
      else if (/email/i.test(match[0])) followupType = 'email';
      else if (/meet/i.test(match[0])) followupType = 'meeting';
      else if (/demo/i.test(match[0])) followupType = 'demo';

      // Extract title from surrounding context
      const titleMatch = context.match(/(?:about|regarding|for|to discuss|to review)\s+([^,.!?]+)/i);
      const title = titleMatch ? titleMatch[1].trim() : `Follow-up ${followupType}`;

      actions.push({
        action: 'SCHEDULE_FOLLOWUP',
        fields: {
          title,
          followup_type: followupType,
          due_date: dueDate ? dueDate.toISOString().split('T')[0] : null,
          description: match[0].trim(),
        },
        confidence: parsedDate ? 'high' : dueDate ? 'medium' : 'low',
        sourceText: match[0],
        position: match.index,
      });
    }
  }

  return actions;
}

/**
 * Extract stakeholder influence signals
 */
function extractStakeholderSignals(text: string): ExtractedAction[] {
  const actions: ExtractedAction[] = [];

  for (const [influence, patterns] of Object.entries(STAKEHOLDER_PATTERNS)) {
    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(text)) !== null) {
        // Look for a person name near the match
        const contextStart = Math.max(0, match.index - 100);
        const context = text.substring(contextStart, match.index);
        const nameMatch = context.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:is|are|seems?|was|were)/);

        actions.push({
          action: 'UPDATE_STAKEHOLDER',
          fields: {
            influence,
            influence_signal: match[0].trim(),
            user_name: nameMatch ? nameMatch[1] : null,
          },
          confidence: nameMatch ? 'high' : 'medium',
          sourceText: match[0],
          position: match.index,
        });
      }
    }
  }

  return actions;
}

/**
 * Extract competitor mentions
 */
function extractCompetitors(text: string): ExtractedAction[] {
  const actions: ExtractedAction[] = [];
  const foundCompetitors = new Set<string>();

  for (const pattern of COMPETITOR_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const competitor = match[1]?.trim();
      if (competitor && !foundCompetitors.has(competitor.toLowerCase())) {
        foundCompetitors.add(competitor.toLowerCase());

        // Determine our position
        let position: 'advantage' | 'neutral' | 'concern' | undefined;
        const contextStart = Math.max(0, match.index - 50);
        const contextEnd = Math.min(text.length, match.index + match[0].length + 50);
        const context = text.substring(contextStart, contextEnd).toLowerCase();

        if (/cheaper|faster|better|ahead|winning/.test(context) &&
            context.indexOf(competitor.toLowerCase()) < context.indexOf('we')) {
          position = 'concern';
        } else if (/we.*better|our.*advantage|beat|won/.test(context)) {
          position = 'advantage';
        }

        actions.push({
          action: 'LOG_COMPETITOR',
          fields: {
            competitor_name: competitor,
            comparison_context: match[0].trim(),
            position,
          },
          confidence: 'medium',
          sourceText: match[0],
          position: match.index,
        });
      }
    }
  }

  return actions;
}

/**
 * Extract feature interest signals
 */
function extractFeatureInterests(text: string): ExtractedAction[] {
  const actions: ExtractedAction[] = [];

  for (const pattern of FEATURE_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const feature = match[1]?.trim();
      if (feature && feature.length > 3 && feature.length < 100) {
        // Determine priority
        let priority = 'medium';
        if (/critical|must have|essential|deal[- ]?breaker/i.test(text)) {
          priority = 'critical';
        } else if (/important|need|require/i.test(text)) {
          priority = 'high';
        } else if (/nice to have|would be nice|helpful/i.test(text)) {
          priority = 'low';
        }

        actions.push({
          action: 'TRACK_FEATURE_INTEREST',
          fields: {
            feature_name: feature,
            context: match[0].trim(),
            priority,
          },
          confidence: 'medium',
          sourceText: match[0],
          position: match.index,
        });
      }
    }
  }

  return actions;
}

/**
 * Extract deal momentum signals
 */
function extractMomentumSignals(text: string): ExtractedAction[] {
  const actions: ExtractedAction[] = [];

  for (const [momentum, patterns] of Object.entries(MOMENTUM_PATTERNS)) {
    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(text)) !== null) {
        actions.push({
          action: 'UPDATE_MOMENTUM',
          fields: {
            momentum,
            momentum_signal: match[0].trim(),
          },
          confidence: 'medium',
          sourceText: match[0],
          position: match.index,
        });
        // Only one momentum signal per text
        return actions;
      }
    }
  }

  return actions;
}

/**
 * Extract sentiment for quick status update
 */
function extractSentiment(text: string): 'positive' | 'neutral' | 'negative' {
  for (const pattern of SENTIMENT_PATTERNS.positive) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) return 'positive';
  }
  for (const pattern of SENTIMENT_PATTERNS.negative) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) return 'negative';
  }
  return 'neutral';
}

// ============ MAIN EXTRACTION FUNCTION ============

/**
 * Extract all actionable items from natural language input
 * @param text - Input text to analyze
 * @param context - Optional context (org, user info)
 * @returns Multi-action result with all extracted actions
 */
export function extractMultipleActions(
  text: string,
  context?: {
    orgId?: string;
    orgName?: string;
    userId?: string;
    userName?: string;
  }
): MultiActionResult {
  const extractedActions: ExtractedAction[] = [];

  // Extract all types of actions
  extractedActions.push(...extractFollowups(text));
  extractedActions.push(...extractStakeholderSignals(text));
  extractedActions.push(...extractCompetitors(text));
  extractedActions.push(...extractFeatureInterests(text));
  extractedActions.push(...extractMomentumSignals(text));

  // Extract dates from text
  const dates = extractDatesFromText(text);

  // Sort by position to maintain order
  extractedActions.sort((a, b) => a.position - b.position);

  // Deduplicate similar actions
  const uniqueActions = deduplicateActions(extractedActions);

  // Add context to all actions
  for (const action of uniqueActions) {
    if (context?.orgId) {
      action.fields.org_id = context.orgId;
    }
    if (context?.userId && action.action === 'UPDATE_STAKEHOLDER') {
      action.fields.user_id = context.userId;
    }
  }

  // Extract entities
  const competitors: string[] = [];
  const features: string[] = [];
  const stakeholders: string[] = [];

  for (const action of uniqueActions) {
    if (action.action === 'LOG_COMPETITOR' && action.fields.competitor_name) {
      competitors.push(action.fields.competitor_name);
    }
    if (action.action === 'TRACK_FEATURE_INTEREST' && action.fields.feature_name) {
      features.push(action.fields.feature_name);
    }
    if (action.action === 'UPDATE_STAKEHOLDER' && action.fields.user_name) {
      stakeholders.push(action.fields.user_name);
    }
  }

  return {
    extractedActions: uniqueActions,
    originalText: text,
    entities: {
      orgName: context?.orgName,
      userName: context?.userName,
      dates,
      competitors,
      features,
      stakeholders,
    },
  };
}

/**
 * Remove duplicate or overlapping actions
 */
function deduplicateActions(actions: ExtractedAction[]): ExtractedAction[] {
  const seen = new Map<string, ExtractedAction>();

  for (const action of actions) {
    // Create a key based on action type and main field
    let key = action.action;
    if (action.action === 'LOG_COMPETITOR' && action.fields.competitor_name) {
      key += ':' + action.fields.competitor_name.toLowerCase();
    } else if (action.action === 'TRACK_FEATURE_INTEREST' && action.fields.feature_name) {
      key += ':' + action.fields.feature_name.toLowerCase().substring(0, 20);
    } else if (action.action === 'UPDATE_MOMENTUM') {
      key += ':' + action.fields.momentum;
    } else if (action.action === 'SCHEDULE_FOLLOWUP' && action.fields.due_date) {
      key += ':' + action.fields.due_date;
    }

    // Keep higher confidence version
    const existing = seen.get(key);
    if (!existing || getConfidenceScore(action.confidence) > getConfidenceScore(existing.confidence)) {
      seen.set(key, action);
    }
  }

  return Array.from(seen.values());
}

function getConfidenceScore(confidence: 'high' | 'medium' | 'low'): number {
  return confidence === 'high' ? 3 : confidence === 'medium' ? 2 : 1;
}

/**
 * Combine primary action from slash command with extracted actions
 */
export function combineWithPrimaryAction(
  primaryAction: ExtractedAction | undefined,
  extractedActions: ExtractedAction[]
): ExtractedAction[] {
  if (!primaryAction) {
    return extractedActions;
  }

  // Filter out extracted actions that duplicate the primary action
  const filtered = extractedActions.filter(action => {
    if (action.action === primaryAction.action) {
      return false;
    }
    return true;
  });

  return [primaryAction, ...filtered];
}

export default extractMultipleActions;
