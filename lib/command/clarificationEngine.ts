/**
 * Clarification Engine
 *
 * Detects ambiguity in parsed commands and generates clarification questions
 * to help users refine their intent before action execution.
 */

import type { CommandAction } from './types';

// ============ TYPES ============

export interface ClarificationOption {
  id: string;
  label: string;
  description?: string;
  resultingAction?: CommandAction;
  resultingFields?: Record<string, any>;
}

export interface ClarificationQuestion {
  id: string;
  question: string;
  options: ClarificationOption[];
  allowFreeText?: boolean;
  freeTextPlaceholder?: string;
  freeTextField?: string; // Which field the free text maps to
}

export interface AmbiguityResult {
  isAmbiguous: boolean;
  ambiguityType?: 'action_unclear' | 'missing_field' | 'multiple_interpretations' | 'low_confidence';
  questions: ClarificationQuestion[];
  suggestedAction?: CommandAction;
}

export interface ParsedCommandForClarification {
  action: CommandAction;
  confidence: number;
  fields: Record<string, any>;
  org_name?: string;
  user_name?: string;
}

// ============ AMBIGUITY DETECTION RULES ============

/**
 * Patterns that indicate potential ambiguity
 */
const AMBIGUITY_PATTERNS = {
  // "won" without value could be UPDATE_DEAL or UPDATE_STAGE
  wonWithoutValue: {
    test: (input: string, parsed: ParsedCommandForClarification) => {
      const lowerInput = input.toLowerCase();
      return (
        (lowerInput.includes(' won') || lowerInput.includes('won ') || lowerInput.includes('as won')) &&
        !parsed.fields.deal_value &&
        (parsed.action === 'UPDATE_DEAL' || parsed.action === 'UPDATE_STAGE')
      );
    },
    question: {
      id: 'clarify_won',
      question: 'What would you like to update?',
      options: [
        {
          id: 'deal_only',
          label: 'Deal status to "won"',
          description: 'Mark the deal as won without changing stage',
          resultingAction: 'UPDATE_DEAL' as CommandAction,
          resultingFields: { deal_status: 'won' },
        },
        {
          id: 'stage_to_customer',
          label: 'Stage to "customer"',
          description: 'Convert from trial to paying customer',
          resultingAction: 'UPDATE_STAGE' as CommandAction,
          resultingFields: { lifecycle_stage: 'customer' },
        },
        {
          id: 'both',
          label: 'Both - deal won AND became customer',
          description: 'Update both deal status and lifecycle stage',
          resultingAction: 'UPDATE_DEAL' as CommandAction,
          resultingFields: { deal_status: 'won', lifecycle_stage: 'customer' },
        },
      ],
      allowFreeText: true,
      freeTextPlaceholder: 'Deal value (optional)',
      freeTextField: 'deal_value',
    },
  },

  // "lost" could be UPDATE_DEAL (lost deal) or UPDATE_STAGE (churned)
  lostAmbiguity: {
    test: (input: string, parsed: ParsedCommandForClarification) => {
      const lowerInput = input.toLowerCase();
      return (
        (lowerInput.includes(' lost') || lowerInput.includes('lost ') || lowerInput.includes('as lost')) &&
        (parsed.action === 'UPDATE_DEAL' || parsed.action === 'UPDATE_STAGE')
      );
    },
    question: {
      id: 'clarify_lost',
      question: 'What happened with this organization?',
      options: [
        {
          id: 'deal_lost',
          label: 'Deal was lost',
          description: 'They decided not to purchase',
          resultingAction: 'UPDATE_DEAL' as CommandAction,
          resultingFields: { deal_status: 'lost' },
        },
        {
          id: 'churned',
          label: 'Customer churned',
          description: 'Existing customer has left',
          resultingAction: 'UPDATE_STAGE' as CommandAction,
          resultingFields: { lifecycle_stage: 'churned' },
        },
        {
          id: 'trial_ended',
          label: 'Trial ended without conversion',
          description: 'Trial period ended, they did not convert',
          resultingAction: 'UPDATE_STAGE' as CommandAction,
          resultingFields: { trial_status: 'ended', lifecycle_stage: 'lost' },
        },
      ],
    },
  },

  // "remove" or "delete" could be destructive or just stage update
  deleteAmbiguity: {
    test: (input: string, parsed: ParsedCommandForClarification) => {
      const lowerInput = input.toLowerCase();
      return (
        (lowerInput.includes('remove') || lowerInput.includes('delete')) &&
        parsed.action.startsWith('DELETE_') &&
        parsed.confidence < 0.85
      );
    },
    question: {
      id: 'clarify_delete',
      question: 'Are you sure you want to permanently delete this?',
      options: [
        {
          id: 'yes_delete',
          label: 'Yes, delete permanently',
          description: 'This action can be undone for 30 seconds',
          resultingAction: undefined, // Keep current action
        },
        {
          id: 'mark_lost',
          label: 'No, just mark as lost',
          description: 'Keep the record but mark deal/stage as lost',
          resultingAction: 'UPDATE_STAGE' as CommandAction,
          resultingFields: { lifecycle_stage: 'lost' },
        },
        {
          id: 'add_note',
          label: 'No, just add a note',
          description: 'Keep everything and add a note instead',
          resultingAction: 'ADD_NOTE' as CommandAction,
        },
      ],
    },
  },

  // No org mentioned in command
  missingOrg: {
    test: (input: string, parsed: ParsedCommandForClarification) => {
      return !parsed.org_name && !parsed.fields.org_id && parsed.action !== 'CREATE_ORG';
    },
    question: {
      id: 'clarify_org',
      question: 'Which organization is this for?',
      options: [], // Will be populated dynamically with recent orgs
      allowFreeText: true,
      freeTextPlaceholder: 'Type organization name',
      freeTextField: 'org_name',
    },
  },
};

// ============ DETECTION FUNCTIONS ============

/**
 * Detect ambiguity in a parsed command
 */
export function detectAmbiguity(
  input: string,
  parsed: ParsedCommandForClarification,
  context?: {
    recentOrgs?: string[];
    focusedOrgName?: string | null;
  }
): AmbiguityResult {
  const questions: ClarificationQuestion[] = [];

  // Check each ambiguity pattern
  for (const [key, pattern] of Object.entries(AMBIGUITY_PATTERNS)) {
    if (pattern.test(input, parsed)) {
      const question = { ...pattern.question };

      // For missing org, populate with recent orgs
      if (key === 'missingOrg' && context?.recentOrgs?.length) {
        question.options = context.recentOrgs.slice(0, 4).map((orgName, i) => ({
          id: `org_${i}`,
          label: orgName,
          resultingFields: { org_name: orgName },
        }));
      }

      questions.push(question);
    }
  }

  // Low confidence is always ambiguous
  if (parsed.confidence < 0.6 && questions.length === 0) {
    questions.push({
      id: 'low_confidence',
      question: `I'm not confident about this. Did you mean to ${parsed.action.replace(/_/g, ' ').toLowerCase()}?`,
      options: [
        {
          id: 'yes_correct',
          label: 'Yes, that\'s correct',
          description: 'Proceed with this action',
        },
        {
          id: 'no_different',
          label: 'No, I meant something else',
          description: 'Let me rephrase',
        },
      ],
      allowFreeText: true,
      freeTextPlaceholder: 'What did you mean?',
    });
  }

  return {
    isAmbiguous: questions.length > 0,
    ambiguityType: questions.length > 0
      ? (parsed.confidence < 0.6 ? 'low_confidence' : 'multiple_interpretations')
      : undefined,
    questions,
    suggestedAction: parsed.action,
  };
}

/**
 * Apply user's clarification answers to refine the parsed command
 */
export function applyClarification(
  parsed: ParsedCommandForClarification,
  answers: Record<string, string | ClarificationOption>
): ParsedCommandForClarification {
  let refined = { ...parsed, fields: { ...parsed.fields } };

  for (const [questionId, answer] of Object.entries(answers)) {
    if (typeof answer === 'object' && answer !== null) {
      // It's a ClarificationOption
      if (answer.resultingAction) {
        refined.action = answer.resultingAction;
      }
      if (answer.resultingFields) {
        refined.fields = { ...refined.fields, ...answer.resultingFields };
      }
    } else if (typeof answer === 'string' && answer.trim()) {
      // It's a free text answer - find the corresponding field
      const question = Object.values(AMBIGUITY_PATTERNS)
        .map(p => p.question)
        .find(q => q.id === questionId);

      // Type guard: check if freeTextField exists on this question
      const freeTextField = question && 'freeTextField' in question ? question.freeTextField : undefined;

      if (freeTextField) {
        // Parse value if it's a number field
        if (freeTextField === 'deal_value') {
          const numValue = parseFloat(answer.replace(/[$,kKmM]/g, ''));
          if (!isNaN(numValue)) {
            let multiplier = 1;
            if (answer.toLowerCase().includes('k')) multiplier = 1000;
            if (answer.toLowerCase().includes('m')) multiplier = 1000000;
            refined.fields[freeTextField] = Math.round(numValue * multiplier);
          }
        } else {
          refined.fields[freeTextField] = answer;
        }
      }
    }
  }

  // Boost confidence after clarification
  refined.confidence = Math.min(0.95, refined.confidence + 0.2);

  return refined;
}

/**
 * Check if command needs clarification based on confidence and patterns
 */
export function needsClarification(
  input: string,
  parsed: ParsedCommandForClarification,
  context?: {
    recentOrgs?: string[];
    focusedOrgName?: string | null;
  }
): boolean {
  // Very low confidence always needs clarification
  if (parsed.confidence < 0.5) return true;

  // Check for ambiguous patterns
  const result = detectAmbiguity(input, parsed, context);
  return result.isAmbiguous;
}

export default {
  detectAmbiguity,
  applyClarification,
  needsClarification,
};
