/**
 * Tests for Complexity Detector
 */

import {
  determineCreateFlow,
  getComplexityExplanation,
  getFormPrefillData,
  getFormType,
  supportsInlineExecution,
  getMinimumRequiredFields,
} from '../complexityDetector';
import type { ParsedCommand } from '../types';

describe('complexityDetector', () => {
  describe('determineCreateFlow', () => {
    it('returns inline for simple LOG_ACTIVITY', () => {
      const parsed: ParsedCommand = {
        action: 'LOG_ACTIVITY',
        confidence: 0.95,
        org_name: 'Acme',
        user_name: 'John',
        fields: {
          activity_type: 'query',
        },
      };

      const result = determineCreateFlow('LOG_ACTIVITY', parsed);
      expect(result.flow).toBe('inline');
      expect(result.reason).toContain('Simple action');
    });

    it('returns inline for ADD_NOTE', () => {
      const parsed: ParsedCommand = {
        action: 'ADD_NOTE',
        confidence: 0.90,
        org_name: 'TechCo',
        user_name: null,
        fields: {
          note_text: 'Great progress',
        },
      };

      const result = determineCreateFlow('ADD_NOTE', parsed);
      expect(result.flow).toBe('inline');
    });

    it('returns form for bulk actions', () => {
      const parsed: ParsedCommand = {
        action: 'BULK_UPDATE_STAGE',
        confidence: 0.95,
        org_name: null,
        user_name: null,
        fields: {},
      };

      const result = determineCreateFlow('BULK_UPDATE_STAGE', parsed);
      expect(result.flow).toBe('form');
      expect(result.reason).toContain('Bulk action');
    });

    it('returns form for low confidence', () => {
      const parsed: ParsedCommand = {
        action: 'CREATE_ORG',
        confidence: 0.65,
        org_name: 'Acme',
        user_name: null,
        fields: {},
      };

      const result = determineCreateFlow('CREATE_ORG', parsed);
      expect(result.flow).toBe('form');
      expect(result.reason).toContain('Low confidence');
    });

    it('returns form for missing required fields', () => {
      const parsed: ParsedCommand = {
        action: 'CREATE_TICKET',
        confidence: 0.90,
        org_name: 'Acme',
        user_name: null,
        fields: {
          // Missing ticket_title which is required
          ticket_priority: 'high',
        },
      };

      const result = determineCreateFlow('CREATE_TICKET', parsed);
      expect(result.flow).toBe('form');
      expect(result.missingRequired).toContain('ticket_title');
    });

    it('returns inline for CREATE_ORG with all required fields', () => {
      const parsed: ParsedCommand = {
        action: 'CREATE_ORG',
        confidence: 0.90,
        org_name: 'Acme Corp',
        user_name: null,
        fields: {
          website: 'acme.com',
        },
      };

      const result = determineCreateFlow('CREATE_ORG', parsed);
      expect(result.flow).toBe('inline');
    });

    it('returns form for many extracted fields', () => {
      const parsed: ParsedCommand = {
        action: 'CREATE_ORG',
        confidence: 0.95,
        org_name: 'Big Company',
        user_name: null,
        fields: {
          website: 'bigco.com',
          domain_category: 'TMT',
          team_size: 100,
          contract_value: 50000,
          description: 'A big company',
        },
      };

      const result = determineCreateFlow('CREATE_ORG', parsed);
      expect(result.flow).toBe('form');
      expect(result.reason).toContain('Many fields');
    });
  });

  describe('getComplexityExplanation', () => {
    it('returns ready message for inline', () => {
      const result = {
        flow: 'inline' as const,
        reason: 'All required fields present',
        missingRequired: [],
        extractedCount: 3,
        confidence: 0.95,
      };

      expect(getComplexityExplanation(result)).toContain('Ready to execute');
    });

    it('returns missing fields message for form', () => {
      const result = {
        flow: 'form' as const,
        reason: 'Missing required',
        missingRequired: ['title', 'description'],
        extractedCount: 1,
        confidence: 0.90,
      };

      expect(getComplexityExplanation(result)).toContain('title');
      expect(getComplexityExplanation(result)).toContain('description');
    });
  });

  describe('getFormPrefillData', () => {
    it('extracts prefill data from parsed command', () => {
      const parsed: ParsedCommand = {
        action: 'CREATE_TICKET',
        confidence: 0.85,
        org_name: 'Acme',
        user_name: 'John',
        fields: {
          ticket_title: 'Bug report',
          ticket_priority: 'high',
          ticket_category: 'bug',
        },
      };

      const prefill = getFormPrefillData('CREATE_TICKET', parsed);
      expect(prefill.org_name).toBe('Acme');
      expect(prefill.title).toBe('Bug report');
      expect(prefill.priority).toBe('high');
      expect(prefill.category).toBe('bug');
    });

    it('maps user_name to name', () => {
      const parsed: ParsedCommand = {
        action: 'CREATE_USER',
        confidence: 0.90,
        org_name: null,
        user_name: 'John Doe',
        fields: {
          email: 'john@acme.com',
        },
      };

      const prefill = getFormPrefillData('CREATE_USER', parsed);
      expect(prefill.name).toBe('John Doe');
      expect(prefill.email).toBe('john@acme.com');
    });
  });

  describe('getFormType', () => {
    it('returns correct form type for CREATE actions', () => {
      expect(getFormType('CREATE_ORG')).toBe('CreateOrganizationModal');
      expect(getFormType('CREATE_USER')).toBe('CreateUserModal');
      expect(getFormType('CREATE_TICKET')).toBe('CreateTicketModal');
    });

    it('returns null for non-form actions', () => {
      expect(getFormType('LOG_ACTIVITY')).toBeNull();
      expect(getFormType('ADD_NOTE')).toBeNull();
    });
  });

  describe('supportsInlineExecution', () => {
    it('returns true for most actions', () => {
      expect(supportsInlineExecution('LOG_ACTIVITY')).toBe(true);
      expect(supportsInlineExecution('CREATE_ORG')).toBe(true);
      expect(supportsInlineExecution('UPDATE_STAGE')).toBe(true);
    });

    it('returns false for bulk actions', () => {
      expect(supportsInlineExecution('BULK_UPDATE_STAGE')).toBe(false);
      expect(supportsInlineExecution('BULK_ASSIGN_AM')).toBe(false);
    });
  });

  describe('getMinimumRequiredFields', () => {
    it('returns required fields for CREATE_ORG', () => {
      const required = getMinimumRequiredFields('CREATE_ORG');
      expect(required).toContain('org_name');
    });

    it('returns required fields for CREATE_TICKET', () => {
      const required = getMinimumRequiredFields('CREATE_TICKET');
      expect(required).toContain('ticket_title');
    });
  });
});
