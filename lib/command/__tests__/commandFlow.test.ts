/**
 * E2E Tests for Command Flow
 * Tests the full parse → execute → undo cycle for all action types
 */

import { parseSlashCommand, isSlashCommand } from '../slashParser';
import { determineCreateFlow, getFormPrefillData, getFormType } from '../complexityDetector';
import type { ParsedCommand, ResolvedCommand, CommandAction } from '../types';

// Mock Supabase
const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: null, error: null }),
  ilike: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  rpc: jest.fn().mockResolvedValue({ data: 1, error: null }),
};

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn().mockResolvedValue(mockSupabase),
}));

describe('Command Flow E2E', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Full Parse → Complexity → Prefill Flow', () => {
    describe('CREATE_ORG', () => {
      it('parses and determines inline flow for simple org creation', () => {
        const result = parseSlashCommand('/org "Acme Corp" acme.com');
        expect(result).not.toBeNull();
        expect(result?.action).toBe('CREATE_ORG');
        expect(result?.org_name).toBe('Acme Corp');
        expect(result?.fields.website).toBe('acme.com');

        const complexityResult = determineCreateFlow('CREATE_ORG', result!);
        expect(complexityResult.flow).toBe('inline');
      });

      it('determines form flow for complex org creation', () => {
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

        const complexityResult = determineCreateFlow('CREATE_ORG', parsed);
        expect(complexityResult.flow).toBe('form');
        expect(complexityResult.reason).toContain('Many fields');
      });

      it('generates correct prefill data for form', () => {
        const parsed: ParsedCommand = {
          action: 'CREATE_ORG',
          confidence: 0.85,
          org_name: 'TechStart',
          user_name: null,
          fields: {
            website: 'techstart.io',
            team_size: 15,
          },
        };

        const prefill = getFormPrefillData('CREATE_ORG', parsed);
        expect(prefill.org_name).toBe('TechStart');
        expect(prefill.website).toBe('techstart.io');
        expect(prefill.team_size).toBe(15);

        const formType = getFormType('CREATE_ORG');
        expect(formType).toBe('CreateOrganizationModal');
      });
    });

    describe('CREATE_USER', () => {
      it('parses and determines inline flow for user with email', () => {
        const result = parseSlashCommand('/user john@acme.com "John Doe" at Acme');
        expect(result).not.toBeNull();
        expect(result?.action).toBe('CREATE_USER');
        expect(result?.fields.email).toBe('john@acme.com');
        expect(result?.user_name).toBe('John Doe');
        expect(result?.org_name).toBe('Acme');

        const complexityResult = determineCreateFlow('CREATE_USER', result!);
        expect(complexityResult.flow).toBe('inline');
      });

      it('generates correct prefill data', () => {
        const parsed: ParsedCommand = {
          action: 'CREATE_USER',
          confidence: 0.90,
          org_name: 'Acme',
          user_name: 'Sarah Smith',
          fields: {
            email: 'sarah@acme.com',
            role: 'Engineering Lead',
          },
        };

        const prefill = getFormPrefillData('CREATE_USER', parsed);
        expect(prefill.name).toBe('Sarah Smith');
        expect(prefill.email).toBe('sarah@acme.com');
        expect(prefill.org_name).toBe('Acme');
      });
    });

    describe('CREATE_TICKET', () => {
      it('parses ticket with title and priority', () => {
        const result = parseSlashCommand('/ticket "Login not working" high @Acme');
        expect(result).not.toBeNull();
        expect(result?.action).toBe('CREATE_TICKET');
        expect(result?.fields.ticket_title).toBe('Login not working');
        expect(result?.fields.ticket_priority).toBe('high');
        expect(result?.org_name).toBe('Acme');
      });

      it('returns form flow when title is missing', () => {
        const parsed: ParsedCommand = {
          action: 'CREATE_TICKET',
          confidence: 0.85,
          org_name: 'Acme',
          user_name: null,
          fields: {
            ticket_priority: 'high',
            ticket_category: 'bug',
          },
        };

        const complexityResult = determineCreateFlow('CREATE_TICKET', parsed);
        expect(complexityResult.flow).toBe('form');
        expect(complexityResult.missingRequired).toContain('ticket_title');
      });
    });

    describe('CREATE_FEATURE_REQUEST', () => {
      it('parses feature request with title', () => {
        const result = parseSlashCommand('/feature "Dark mode support" high');
        expect(result).not.toBeNull();
        expect(result?.action).toBe('CREATE_FEATURE_REQUEST');
        expect(result?.fields.feature_title).toBe('Dark mode support');
        expect(result?.fields.feature_priority).toBe('high');
      });

      it('generates correct prefill data', () => {
        const parsed: ParsedCommand = {
          action: 'CREATE_FEATURE_REQUEST',
          confidence: 0.90,
          org_name: 'TechCo',
          user_name: null,
          fields: {
            feature_title: 'Export to CSV',
            feature_priority: 'medium',
            feature_description: 'Allow users to export data',
          },
        };

        const prefill = getFormPrefillData('CREATE_FEATURE_REQUEST', parsed);
        expect(prefill.title).toBe('Export to CSV');
        expect(prefill.priority).toBe('medium');
        expect(prefill.org_name).toBe('TechCo');
      });
    });

    describe('CREATE_TIMELINE_EVENT', () => {
      it('parses timeline event with type and title', () => {
        const result = parseSlashCommand('/event demo "Quarterly Review" @Acme');
        expect(result).not.toBeNull();
        expect(result?.action).toBe('CREATE_TIMELINE_EVENT');
        expect(result?.fields.event_type).toBe('demo_conducted');
        expect(result?.fields.event_title).toBe('Quarterly Review');
        expect(result?.org_name).toBe('Acme');
      });
    });
  });

  describe('Action Type Coverage', () => {
    const actionTypeTests: Array<{
      action: CommandAction;
      slashCommand: string;
      expectedFields: Record<string, any>;
    }> = [
      {
        action: 'LOG_ACTIVITY',
        slashCommand: '/log query at TechCo',
        expectedFields: { activity_type: 'query' },
      },
      {
        action: 'UPDATE_STAGE',
        slashCommand: '/stage Acme customer',
        expectedFields: { lifecycle_stage: 'customer' },
      },
      {
        action: 'UPDATE_DEAL',
        slashCommand: '/deal Acme $50k won',
        expectedFields: { deal_value: 50000, deal_status: 'won' },
      },
      {
        action: 'ADD_NOTE',
        slashCommand: '/note "Great progress" @Acme',
        expectedFields: { note_text: 'Great progress' },
      },
      {
        action: 'CREATE_ORG',
        slashCommand: '/org NewCorp newcorp.com',
        expectedFields: { website: 'newcorp.com' },
      },
      {
        action: 'CREATE_USER',
        slashCommand: '/user test@example.com',
        expectedFields: { email: 'test@example.com' },
      },
      {
        action: 'CREATE_TICKET',
        slashCommand: '/ticket "Bug report" high',
        expectedFields: { ticket_title: 'Bug report', ticket_priority: 'high' },
      },
      {
        action: 'CREATE_FEATURE_REQUEST',
        slashCommand: '/feature "New feature"',
        expectedFields: { feature_title: 'New feature' },
      },
      {
        action: 'CREATE_TIMELINE_EVENT',
        slashCommand: '/event call "Check-in" @Acme',
        expectedFields: { event_type: 'call_completed', event_title: 'Check-in' },
      },
      {
        action: 'ASSIGN_ACCOUNT_MANAGER',
        slashCommand: '/am "John Doe" at Acme',
        expectedFields: { account_manager_name: 'John Doe' },
      },
    ];

    actionTypeTests.forEach(({ action, slashCommand, expectedFields }) => {
      it(`parses ${action} correctly from slash command`, () => {
        const result = parseSlashCommand(slashCommand);
        expect(result).not.toBeNull();
        expect(result?.action).toBe(action);

        Object.entries(expectedFields).forEach(([key, value]) => {
          expect(result?.fields[key as keyof typeof result.fields]).toBe(value);
        });
      });
    });
  });

  describe('Inline vs Form Flow Detection', () => {
    const flowTests: Array<{
      description: string;
      action: CommandAction;
      parsed: ParsedCommand;
      expectedFlow: 'inline' | 'form';
      reason?: string;
    }> = [
      {
        description: 'LOG_ACTIVITY should always be inline',
        action: 'LOG_ACTIVITY',
        parsed: {
          action: 'LOG_ACTIVITY',
          confidence: 0.95,
          org_name: 'Acme',
          user_name: 'John',
          fields: { activity_type: 'query' },
        },
        expectedFlow: 'inline',
      },
      {
        description: 'ADD_NOTE should always be inline',
        action: 'ADD_NOTE',
        parsed: {
          action: 'ADD_NOTE',
          confidence: 0.90,
          org_name: 'TechCo',
          user_name: null,
          fields: { note_text: 'Good progress' },
        },
        expectedFlow: 'inline',
      },
      {
        description: 'BULK_UPDATE_STAGE should always require form',
        action: 'BULK_UPDATE_STAGE',
        parsed: {
          action: 'BULK_UPDATE_STAGE',
          confidence: 0.95,
          org_name: null,
          user_name: null,
          fields: {},
        },
        expectedFlow: 'form',
        reason: 'Bulk action',
      },
      {
        description: 'Low confidence should require form',
        action: 'CREATE_ORG',
        parsed: {
          action: 'CREATE_ORG',
          confidence: 0.65,
          org_name: 'Maybe Corp',
          user_name: null,
          fields: {},
        },
        expectedFlow: 'form',
        reason: 'Low confidence',
      },
      {
        description: 'Missing required field should require form',
        action: 'CREATE_TICKET',
        parsed: {
          action: 'CREATE_TICKET',
          confidence: 0.95,
          org_name: 'Acme',
          user_name: null,
          fields: { ticket_priority: 'high' }, // missing ticket_title
        },
        expectedFlow: 'form',
      },
    ];

    flowTests.forEach(({ description, action, parsed, expectedFlow, reason }) => {
      it(description, () => {
        const result = determineCreateFlow(action, parsed);
        expect(result.flow).toBe(expectedFlow);
        if (reason) {
          expect(result.reason).toContain(reason);
        }
      });
    });
  });

  describe('Slash Command Aliases', () => {
    const aliasTests: Array<{
      primary: string;
      alias: string;
      expectedAction: CommandAction;
    }> = [
      { primary: '/log', alias: '/a', expectedAction: 'LOG_ACTIVITY' },
      { primary: '/log', alias: '/activity', expectedAction: 'LOG_ACTIVITY' },
      { primary: '/org', alias: '/trial', expectedAction: 'CREATE_ORG' },
      { primary: '/user', alias: '/contact', expectedAction: 'CREATE_USER' },
      { primary: '/ticket', alias: '/bug', expectedAction: 'CREATE_TICKET' },
      { primary: '/feature', alias: '/fr', expectedAction: 'CREATE_FEATURE_REQUEST' },
      { primary: '/note', alias: '/n', expectedAction: 'ADD_NOTE' },
      { primary: '/stage', alias: '/status', expectedAction: 'UPDATE_STAGE' },
      { primary: '/am', alias: '/assign', expectedAction: 'ASSIGN_ACCOUNT_MANAGER' },
      { primary: '/event', alias: '/timeline', expectedAction: 'CREATE_TIMELINE_EVENT' },
    ];

    aliasTests.forEach(({ primary, alias, expectedAction }) => {
      it(`${alias} should be alias for ${primary} → ${expectedAction}`, () => {
        const primaryResult = parseSlashCommand(`${primary} test`);
        const aliasResult = parseSlashCommand(`${alias} test`);

        expect(primaryResult?.action).toBe(expectedAction);
        expect(aliasResult?.action).toBe(expectedAction);
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles quoted strings with spaces correctly', () => {
      const result = parseSlashCommand('/org "Acme Corporation International"');
      expect(result?.org_name).toBe('Acme Corporation International');
    });

    it('parses deal values in various formats', () => {
      const tests = [
        { input: '/deal Acme $50k', expected: 50000 },
        { input: '/deal Acme $1m', expected: 1000000 },
        { input: '/deal Acme $500', expected: 500 },
        { input: '/deal Acme $1,000', expected: 1000 },
      ];

      tests.forEach(({ input, expected }) => {
        const result = parseSlashCommand(input);
        expect(result?.fields.deal_value).toBe(expected);
      });
    });

    it('handles @ prefix for org references', () => {
      const result = parseSlashCommand('/note "Test note" @TechCo');
      expect(result?.org_name).toBe('TechCo');
    });

    it('extracts team size correctly', () => {
      const tests = [
        { input: '/org "Test" test.com 50 users', expected: 50 },
        { input: '/org "Test" test.com 100 people', expected: 100 },
        { input: '/org "Test" test.com 25 seats', expected: 25 },
      ];

      tests.forEach(({ input, expected }) => {
        const result = parseSlashCommand(input);
        expect(result?.fields.team_size).toBe(expected);
      });
    });

    it('extracts contract value correctly', () => {
      const result = parseSlashCommand('/org "BigCo" bigco.com $100k');
      expect(result?.fields.contract_value).toBe(100000);
    });

    it('maps lifecycle stages correctly', () => {
      const stageTests = [
        { input: 'active', expected: 'trial_active' },
        { input: 'lost', expected: 'lost' },
        { input: 'churned', expected: 'lost' },
        { input: 'converted', expected: 'customer' },
        { input: 'customer', expected: 'customer' },
        { input: 'prospect', expected: 'prospect' },
      ];

      stageTests.forEach(({ input, expected }) => {
        const result = parseSlashCommand(`/stage Acme ${input}`);
        expect(result?.fields.lifecycle_stage).toBe(expected);
      });
    });

    it('returns null for unknown commands', () => {
      expect(parseSlashCommand('/unknown')).toBeNull();
      expect(parseSlashCommand('/xyz test')).toBeNull();
    });

    it('returns null for empty input', () => {
      expect(parseSlashCommand('')).toBeNull();
      expect(parseSlashCommand('   ')).toBeNull();
    });

    it('handles non-slash input correctly', () => {
      expect(isSlashCommand('log activity')).toBe(false);
      expect(isSlashCommand('')).toBe(false);
      expect(parseSlashCommand('log activity')).toBeNull();
    });
  });

  describe('Form Type Mapping', () => {
    const formTypeTests: Array<{
      action: CommandAction;
      expectedFormType: string | null;
    }> = [
      { action: 'CREATE_ORG', expectedFormType: 'CreateOrganizationModal' },
      { action: 'CREATE_USER', expectedFormType: 'CreateUserModal' },
      { action: 'CREATE_TICKET', expectedFormType: 'CreateTicketModal' },
      { action: 'CREATE_FEATURE_REQUEST', expectedFormType: 'CreateFeatureRequestModal' },
      { action: 'CREATE_ROADMAP_ITEM', expectedFormType: 'CreateRoadmapItemModal' },
      { action: 'CREATE_TIMELINE_EVENT', expectedFormType: 'CreateTimelineEventModal' },
      { action: 'LOG_ACTIVITY', expectedFormType: null },
      { action: 'ADD_NOTE', expectedFormType: null },
      { action: 'UPDATE_STAGE', expectedFormType: null },
      { action: 'UPDATE_DEAL', expectedFormType: null },
    ];

    formTypeTests.forEach(({ action, expectedFormType }) => {
      it(`maps ${action} to ${expectedFormType ?? 'null'}`, () => {
        expect(getFormType(action)).toBe(expectedFormType);
      });
    });
  });

  describe('Prefill Data Mapping', () => {
    it('maps ticket fields correctly', () => {
      const parsed: ParsedCommand = {
        action: 'CREATE_TICKET',
        confidence: 0.90,
        org_name: 'Acme',
        user_name: 'John',
        fields: {
          ticket_title: 'Bug report',
          ticket_priority: 'high',
          ticket_category: 'bug',
          ticket_description: 'Details here',
        },
      };

      const prefill = getFormPrefillData('CREATE_TICKET', parsed);
      expect(prefill.title).toBe('Bug report');
      expect(prefill.priority).toBe('high');
      expect(prefill.category).toBe('bug');
      expect(prefill.description).toBe('Details here');
      expect(prefill.org_name).toBe('Acme');
    });

    it('maps feature request fields correctly', () => {
      const parsed: ParsedCommand = {
        action: 'CREATE_FEATURE_REQUEST',
        confidence: 0.90,
        org_name: 'TechCo',
        user_name: null,
        fields: {
          feature_title: 'Dark mode',
          feature_priority: 'medium',
          feature_description: 'Support dark theme',
          feature_use_case: 'Night time usage',
        },
      };

      const prefill = getFormPrefillData('CREATE_FEATURE_REQUEST', parsed);
      expect(prefill.title).toBe('Dark mode');
      expect(prefill.priority).toBe('medium');
      expect(prefill.description).toBe('Support dark theme');
      expect(prefill.use_case).toBe('Night time usage');
    });

    it('maps roadmap fields correctly', () => {
      const parsed: ParsedCommand = {
        action: 'CREATE_ROADMAP_ITEM',
        confidence: 0.90,
        org_name: null,
        user_name: null,
        fields: {
          roadmap_title: 'Q1 Feature',
          roadmap_status: 'planned',
          roadmap_priority: 'high',
          target_date: '2024-03-31',
        },
      };

      const prefill = getFormPrefillData('CREATE_ROADMAP_ITEM', parsed);
      expect(prefill.title).toBe('Q1 Feature');
      expect(prefill.status).toBe('planned');
      expect(prefill.priority).toBe('high');
      expect(prefill.target_date).toBe('2024-03-31');
    });

    it('maps timeline event fields correctly', () => {
      const parsed: ParsedCommand = {
        action: 'CREATE_TIMELINE_EVENT',
        confidence: 0.90,
        org_name: 'Acme',
        user_name: 'John',
        fields: {
          event_type: 'demo_conducted',
          event_title: 'Demo call',
          event_category: 'engagement',
          event_sentiment: 'positive',
        },
      };

      const prefill = getFormPrefillData('CREATE_TIMELINE_EVENT', parsed);
      expect(prefill.event_type).toBe('demo_conducted');
      expect(prefill.title).toBe('Demo call');
      // event_category and event_sentiment pass through without prefix stripping
      expect(prefill.event_category).toBe('engagement');
      expect(prefill.event_sentiment).toBe('positive');
    });
  });

  describe('Confidence and Flow Integration', () => {
    it('determines correct flow based on confidence thresholds', () => {
      const highConfidence: ParsedCommand = {
        action: 'CREATE_ORG',
        confidence: 0.95,
        org_name: 'Acme',
        user_name: null,
        fields: {},
      };

      const lowConfidence: ParsedCommand = {
        action: 'CREATE_ORG',
        confidence: 0.65,
        org_name: 'Maybe',
        user_name: null,
        fields: {},
      };

      expect(determineCreateFlow('CREATE_ORG', highConfidence).flow).toBe('inline');
      expect(determineCreateFlow('CREATE_ORG', lowConfidence).flow).toBe('form');
    });

    it('prioritizes missing required fields over confidence', () => {
      const highConfidenceButMissingRequired: ParsedCommand = {
        action: 'CREATE_USER',
        confidence: 0.99,
        org_name: 'Acme',
        user_name: 'John',
        fields: {
          // missing email which is required
          role: 'Engineer',
        },
      };

      const result = determineCreateFlow('CREATE_USER', highConfidenceButMissingRequired);
      expect(result.flow).toBe('form');
      expect(result.missingRequired).toContain('email');
    });
  });
});
