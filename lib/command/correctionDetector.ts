/**
 * Correction Detector - Parse natural language corrections
 *
 * Detects when users want to correct/modify a previous action.
 * E.g., "actually it was $500k", "no, I meant BASF", "wrong user, it was Sarah"
 */

export type CorrectionType = 'value' | 'org' | 'user' | 'action' | 'field';

export interface CorrectionResult {
  detected: boolean;
  type: CorrectionType;
  field: string;
  newValue: string;
  originalText: string;
  confidence: number;
}

// Patterns that indicate a correction
const CORRECTION_PATTERNS = [
  // Value corrections
  {
    type: 'value' as CorrectionType,
    patterns: [
      /^(?:actually|no,?\s*)?(?:it\s+)?(?:was|should\s+be|is)\s+\$?([\d,]+k?)/i,
      /^(?:i\s+)?meant?\s+\$?([\d,]+k?)/i,
      /^change\s+(?:that|it)\s+to\s+\$?([\d,]+k?)/i,
      /^make\s+(?:that|it)\s+\$?([\d,]+k?)/i,
      /^(?:the\s+)?(?:deal|value|amount)\s+(?:is|was|should\s+be)\s+\$?([\d,]+k?)/i,
    ],
    field: 'deal_value',
    extractValue: (match: RegExpMatchArray) => {
      let value = match[1].replace(/,/g, '');
      if (value.toLowerCase().endsWith('k')) {
        value = String(parseInt(value) * 1000);
      }
      return value;
    },
  },

  // Organization corrections
  {
    type: 'org' as CorrectionType,
    patterns: [
      /^(?:no,?\s*)?(?:i\s+)?meant?\s+(\w+(?:\s+\w+)?)\s*$/i,
      /^(?:not\s+that,?\s*)?(?:i\s+)?meant?\s+(\w+(?:\s+\w+)?)/i,
      /^(?:actually\s+)?(?:it'?s?\s+)?(\w+(?:\s+\w+)?),?\s*not\s+/i,
      /^wrong\s+(?:org|company|organization),?\s*(?:it'?s?\s+|it\s+was\s+)?(\w+(?:\s+\w+)?)/i,
      /^(?:should\s+be|change\s+(?:to|it\s+to))\s+(\w+(?:\s+\w+)?)/i,
    ],
    field: 'org_name',
    extractValue: (match: RegExpMatchArray) => match[1].trim(),
  },

  // User corrections
  {
    type: 'user' as CorrectionType,
    patterns: [
      /^(?:no,?\s*)?(?:wrong\s+)?(?:user|person|contact),?\s*(?:it'?s?\s+|it\s+was\s+)?(\w+(?:\s+\w+)?)/i,
      /^(?:not\s+\w+,?\s*)?(?:it\s+was\s+)?(\w+)\s+(?:who|that)/i,
      /^(?:i\s+)?meant?\s+(\w+)\s+(?:not|instead)/i,
    ],
    field: 'user_name',
    extractValue: (match: RegExpMatchArray) => match[1].trim(),
  },

  // Stage/status corrections
  {
    type: 'field' as CorrectionType,
    patterns: [
      /^(?:no,?\s*)?(?:change\s+)?(?:to|should\s+be)\s+(trial_active|trial_pending|customer|churned|negotiating|onboarding)/i,
      /^(?:actually\s+)?(trial_active|trial_pending|customer|churned|negotiating|onboarding)/i,
    ],
    field: 'lifecycle_stage',
    extractValue: (match: RegExpMatchArray) => match[1].toLowerCase(),
  },

  // Activity type corrections
  {
    type: 'field' as CorrectionType,
    patterns: [
      /^(?:it\s+was\s+a\s+)?(demo|meeting|call|query|support|login|export)/i,
      /^(?:no,?\s*)?(?:a\s+)?(demo|meeting|call|query|support|login|export),?\s*not/i,
    ],
    field: 'activity_type',
    extractValue: (match: RegExpMatchArray) => match[1].toLowerCase(),
  },

  // Count corrections
  {
    type: 'value' as CorrectionType,
    patterns: [
      /^(?:no,?\s*)?(?:it\s+was\s+)?(\d+)\s+(?:times|queries|logins|exports)/i,
      /^(?:actually\s+)?(\d+),?\s*not\s+\d+/i,
    ],
    field: 'count',
    extractValue: (match: RegExpMatchArray) => match[1],
  },
];

// Phrases that strongly indicate correction intent
const CORRECTION_INDICATORS = [
  /^(?:no|nope|wrong|incorrect|actually|wait)/i,
  /(?:not\s+that|i\s+meant|should\s+be|change\s+(?:it|that)\s+to)/i,
  /(?:mistake|error|typo)/i,
];

/**
 * Detect if user input is a correction to a previous action
 */
export function detectCorrection(input: string): CorrectionResult | null {
  const trimmedInput = input.trim();

  // Quick check: does input contain correction indicators?
  const hasIndicator = CORRECTION_INDICATORS.some(pattern => pattern.test(trimmedInput));

  // If no indicators and input is too long, probably not a correction
  if (!hasIndicator && trimmedInput.length > 50) {
    return null;
  }

  // Try each correction pattern
  for (const rule of CORRECTION_PATTERNS) {
    for (const pattern of rule.patterns) {
      const match = trimmedInput.match(pattern);
      if (match) {
        const newValue = rule.extractValue(match);
        if (newValue) {
          return {
            detected: true,
            type: rule.type,
            field: rule.field,
            newValue,
            originalText: trimmedInput,
            confidence: hasIndicator ? 0.90 : 0.70,
          };
        }
      }
    }
  }

  // Special case: just a number with $ might be value correction
  const justValue = trimmedInput.match(/^\$?([\d,]+k?)$/i);
  if (justValue && hasIndicator) {
    let value = justValue[1].replace(/,/g, '');
    if (value.toLowerCase().endsWith('k')) {
      value = String(parseInt(value) * 1000);
    }
    return {
      detected: true,
      type: 'value',
      field: 'deal_value',
      newValue: value,
      originalText: trimmedInput,
      confidence: 0.60,
    };
  }

  return null;
}

/**
 * Check if input is likely a correction based on context
 */
export function isLikelyCorrection(
  input: string,
  hasPendingAction: boolean,
  lastActionTimestamp?: Date
): boolean {
  // No pending action = less likely to be correction
  if (!hasPendingAction) return false;

  // Check correction indicators
  const hasIndicator = CORRECTION_INDICATORS.some(pattern => pattern.test(input));
  if (hasIndicator) return true;

  // Short input after recent action might be correction
  if (lastActionTimestamp) {
    const secondsSinceAction = (Date.now() - lastActionTimestamp.getTime()) / 1000;
    if (secondsSinceAction < 30 && input.length < 30) {
      return true;
    }
  }

  return false;
}

/**
 * Apply correction to existing action fields
 */
export function applyCorrection(
  existingFields: Record<string, any>,
  correction: CorrectionResult
): Record<string, any> {
  return {
    ...existingFields,
    [correction.field]: correction.newValue,
  };
}

export default detectCorrection;
