/**
 * Tests for Slash Command Parser
 */

import {
  isSlashCommand,
  parseSlashCommand,
  getSlashCommands,
  getSlashCommandSuggestions,
} from '../slashParser';

describe('slashParser', () => {
  describe('isSlashCommand', () => {
    it('returns true for slash commands', () => {
      expect(isSlashCommand('/log')).toBe(true);
      expect(isSlashCommand('/org Acme')).toBe(true);
      expect(isSlashCommand('  /ticket bug')).toBe(true);
    });

    it('returns false for non-slash commands', () => {
      expect(isSlashCommand('log activity')).toBe(false);
      expect(isSlashCommand('John at Acme ran query')).toBe(false);
      expect(isSlashCommand('')).toBe(false);
    });
  });

  describe('parseSlashCommand', () => {
    describe('/log command', () => {
      it('parses basic activity log', () => {
        const result = parseSlashCommand('/log query at Acme');
        expect(result).not.toBeNull();
        expect(result?.action).toBe('LOG_ACTIVITY');
        expect(result?.org_name).toBe('Acme');
        expect(result?.fields.activity_type).toBe('query');
        expect(result?.confidence).toBe(0.95);
      });

      it('parses demo activity', () => {
        const result = parseSlashCommand('/log demo at TechCo');
        expect(result?.action).toBe('LOG_ACTIVITY');
        expect(result?.org_name).toBe('TechCo');
        expect(result?.fields.activity_type).toBe('demo');
      });

      it('works with /activity alias', () => {
        const result = parseSlashCommand('/activity login at Acme');
        expect(result?.action).toBe('LOG_ACTIVITY');
        expect(result?.fields.activity_type).toBe('login');
      });

      it('works with /a alias', () => {
        const result = parseSlashCommand('/a query at Acme');
        expect(result?.action).toBe('LOG_ACTIVITY');
      });
    });

    describe('/org command', () => {
      it('parses basic org creation', () => {
        const result = parseSlashCommand('/org Acme Corp');
        expect(result).not.toBeNull();
        expect(result?.action).toBe('CREATE_ORG');
        expect(result?.org_name).toBe('Acme Corp');
      });

      it('parses org with quoted name', () => {
        const result = parseSlashCommand('/org "Acme Corporation Inc"');
        expect(result?.org_name).toBe('Acme Corporation Inc');
      });

      it('parses org with website', () => {
        const result = parseSlashCommand('/org Acme acme.com');
        expect(result?.org_name).toBe('Acme');
        expect(result?.fields.website).toBe('acme.com');
      });

      it('parses org with domain category', () => {
        const result = parseSlashCommand('/org TechStart tech');
        expect(result?.fields.domain_category).toBe('TMT');
      });

      it('parses org with team size', () => {
        const result = parseSlashCommand('/org "Acme Corp" acme.com 50 users');
        expect(result?.fields.team_size).toBe(50);
      });

      it('parses org with contract value', () => {
        const result = parseSlashCommand('/org "BigCo" bigco.com $100k');
        expect(result?.fields.contract_value).toBe(100000);
      });

      it('works with /trial alias', () => {
        const result = parseSlashCommand('/trial NewCompany');
        expect(result?.action).toBe('CREATE_ORG');
      });
    });

    describe('/user command', () => {
      it('parses user with email', () => {
        const result = parseSlashCommand('/user john@acme.com');
        expect(result?.action).toBe('CREATE_USER');
        expect(result?.fields.email).toBe('john@acme.com');
      });

      it('parses user with email and name', () => {
        const result = parseSlashCommand('/user john@acme.com "John Doe"');
        expect(result?.fields.email).toBe('john@acme.com');
        expect(result?.user_name).toBe('John Doe');
      });

      it('parses user with org', () => {
        const result = parseSlashCommand('/user john@acme.com at Acme');
        expect(result?.org_name).toBe('Acme');
      });

      it('works with /contact alias', () => {
        const result = parseSlashCommand('/contact sarah@tech.io');
        expect(result?.action).toBe('CREATE_USER');
      });
    });

    describe('/ticket command', () => {
      it('parses basic ticket', () => {
        const result = parseSlashCommand('/ticket "Login not working"');
        expect(result?.action).toBe('CREATE_TICKET');
        expect(result?.fields.ticket_title).toBe('Login not working');
      });

      it('parses ticket with priority', () => {
        const result = parseSlashCommand('/ticket "Bug" high');
        expect(result?.fields.ticket_priority).toBe('high');
      });

      it('parses ticket with category', () => {
        const result = parseSlashCommand('/ticket "Error" bug');
        expect(result?.fields.ticket_category).toBe('bug');
      });

      it('parses ticket with org', () => {
        const result = parseSlashCommand('/ticket "Issue" @Acme');
        expect(result?.org_name).toBe('Acme');
      });

      it('works with /bug alias', () => {
        const result = parseSlashCommand('/bug "Crash on load"');
        expect(result?.action).toBe('CREATE_TICKET');
      });
    });

    describe('/feature command', () => {
      it('parses basic feature request', () => {
        const result = parseSlashCommand('/feature "Dark mode"');
        expect(result?.action).toBe('CREATE_FEATURE_REQUEST');
        expect(result?.fields.feature_title).toBe('Dark mode');
      });

      it('parses feature with priority', () => {
        const result = parseSlashCommand('/feature "Export to CSV" high');
        expect(result?.fields.feature_priority).toBe('high');
      });

      it('works with /fr alias', () => {
        const result = parseSlashCommand('/fr "New feature"');
        expect(result?.action).toBe('CREATE_FEATURE_REQUEST');
      });
    });

    describe('/note command', () => {
      it('parses note with org', () => {
        const result = parseSlashCommand('/note "Great progress" @Acme');
        expect(result?.action).toBe('ADD_NOTE');
        expect(result?.fields.note_text).toBe('Great progress');
        expect(result?.org_name).toBe('Acme');
      });

      it('works with /n alias', () => {
        const result = parseSlashCommand('/n "Quick note" @TechCo');
        expect(result?.action).toBe('ADD_NOTE');
      });
    });

    describe('/stage command', () => {
      it('parses stage update', () => {
        const result = parseSlashCommand('/stage Acme customer');
        expect(result?.action).toBe('UPDATE_STAGE');
        expect(result?.org_name).toBe('Acme');
        expect(result?.fields.lifecycle_stage).toBe('customer');
      });

      it('parses various stages', () => {
        expect(parseSlashCommand('/stage Acme active')?.fields.lifecycle_stage).toBe('trial_active');
        expect(parseSlashCommand('/stage Acme lost')?.fields.lifecycle_stage).toBe('lost');
        expect(parseSlashCommand('/stage Acme churned')?.fields.lifecycle_stage).toBe('lost');
        expect(parseSlashCommand('/stage Acme converted')?.fields.lifecycle_stage).toBe('customer');
      });

      it('works with /status alias', () => {
        const result = parseSlashCommand('/status TechCo prospect');
        expect(result?.action).toBe('UPDATE_STAGE');
      });
    });

    describe('/deal command', () => {
      it('parses deal with value', () => {
        const result = parseSlashCommand('/deal Acme $50k');
        expect(result?.action).toBe('UPDATE_DEAL');
        expect(result?.org_name).toBe('Acme');
        expect(result?.fields.deal_value).toBe(50000);
      });

      it('parses deal with status', () => {
        const result = parseSlashCommand('/deal Acme $100k won');
        expect(result?.fields.deal_value).toBe(100000);
        expect(result?.fields.deal_status).toBe('won');
      });

      it('parses various deal values', () => {
        expect(parseSlashCommand('/deal Acme $1m')?.fields.deal_value).toBe(1000000);
        expect(parseSlashCommand('/deal Acme $500')?.fields.deal_value).toBe(500);
        expect(parseSlashCommand('/deal Acme $1,000')?.fields.deal_value).toBe(1000);
      });
    });

    describe('/am command', () => {
      it('parses AM assignment', () => {
        const result = parseSlashCommand('/am "Sarah Smith" at Acme');
        expect(result?.action).toBe('ASSIGN_ACCOUNT_MANAGER');
        expect(result?.org_name).toBe('Acme');
        expect(result?.fields.account_manager_name).toBe('Sarah Smith');
      });

      it('works with /assign alias', () => {
        const result = parseSlashCommand('/assign at TechCo "John Doe"');
        expect(result?.action).toBe('ASSIGN_ACCOUNT_MANAGER');
      });
    });

    describe('/event command', () => {
      it('parses timeline event', () => {
        const result = parseSlashCommand('/event demo "Quarterly Review" @Acme');
        expect(result?.action).toBe('CREATE_TIMELINE_EVENT');
        expect(result?.fields.event_type).toBe('demo_conducted');
        expect(result?.fields.event_title).toBe('Quarterly Review');
        expect(result?.org_name).toBe('Acme');
      });

      it('works with /timeline alias', () => {
        const result = parseSlashCommand('/timeline call "Check-in" @TechCo');
        expect(result?.action).toBe('CREATE_TIMELINE_EVENT');
        expect(result?.fields.event_type).toBe('call_completed');
      });
    });

    describe('/roadmap command', () => {
      it('parses basic roadmap item', () => {
        const result = parseSlashCommand('/roadmap "Q1 Feature Release"');
        expect(result).not.toBeNull();
        expect(result?.action).toBe('CREATE_ROADMAP_ITEM');
        expect(result?.fields.roadmap_title).toBe('Q1 Feature Release');
        expect(result?.fields.roadmap_status).toBe('planned');
        expect(result?.fields.roadmap_priority).toBe('medium');
      });

      it('parses roadmap with status', () => {
        const result = parseSlashCommand('/roadmap "API v2" progress');
        expect(result?.fields.roadmap_title).toBe('API v2');
        expect(result?.fields.roadmap_status).toBe('in_progress');
      });

      it('parses roadmap with priority', () => {
        const result = parseSlashCommand('/roadmap "Security Update" high');
        expect(result?.fields.roadmap_priority).toBe('high');
      });

      it('parses roadmap with status and priority', () => {
        const result = parseSlashCommand('/roadmap "Dashboard Redesign" planned high');
        expect(result?.fields.roadmap_status).toBe('planned');
        expect(result?.fields.roadmap_priority).toBe('high');
      });

      it('parses roadmap with org reference', () => {
        const result = parseSlashCommand('/roadmap "Custom Feature" @Acme');
        expect(result?.org_name).toBe('Acme');
        expect(result?.fields.roadmap_title).toBe('Custom Feature');
      });

      it('works with /task alias', () => {
        const result = parseSlashCommand('/task "Sprint Goal" planned');
        expect(result?.action).toBe('CREATE_ROADMAP_ITEM');
        expect(result?.fields.roadmap_title).toBe('Sprint Goal');
      });

      it('works with /milestone alias', () => {
        const result = parseSlashCommand('/milestone "Q2 Launch" done');
        expect(result?.action).toBe('CREATE_ROADMAP_ITEM');
        expect(result?.fields.roadmap_status).toBe('completed');
      });

      it('works with /rm alias', () => {
        const result = parseSlashCommand('/rm "Bug Fixes" wip');
        expect(result?.action).toBe('CREATE_ROADMAP_ITEM');
        expect(result?.fields.roadmap_status).toBe('in_progress');
      });

      it('parses various status aliases', () => {
        expect(parseSlashCommand('/roadmap "Test" plan')?.fields.roadmap_status).toBe('planned');
        expect(parseSlashCommand('/roadmap "Test" todo')?.fields.roadmap_status).toBe('planned');
        expect(parseSlashCommand('/roadmap "Test" doing')?.fields.roadmap_status).toBe('in_progress');
        expect(parseSlashCommand('/roadmap "Test" complete')?.fields.roadmap_status).toBe('completed');
        expect(parseSlashCommand('/roadmap "Test" blocked')?.fields.roadmap_status).toBe('blocked');
      });
    });

    describe('invalid commands', () => {
      it('returns null for unknown slash command', () => {
        expect(parseSlashCommand('/unknown')).toBeNull();
        expect(parseSlashCommand('/xyz test')).toBeNull();
      });

      it('returns null for non-slash input', () => {
        expect(parseSlashCommand('log activity')).toBeNull();
        expect(parseSlashCommand('')).toBeNull();
      });
    });
  });

  describe('getSlashCommands', () => {
    it('returns all available commands', () => {
      const commands = getSlashCommands();
      expect(commands.length).toBeGreaterThan(0);

      const commandNames = commands.map(c => c.command);
      expect(commandNames).toContain('/log');
      expect(commandNames).toContain('/org');
      expect(commandNames).toContain('/ticket');
      expect(commandNames).toContain('/stage');
      expect(commandNames).toContain('/roadmap');
    });

    it('includes usage and examples', () => {
      const commands = getSlashCommands();
      commands.forEach(cmd => {
        expect(cmd.usage).toBeTruthy();
        expect(cmd.example).toBeTruthy();
        expect(cmd.action).toBeTruthy();
      });
    });
  });

  describe('getSlashCommandSuggestions', () => {
    it('returns suggestions for partial input', () => {
      const suggestions = getSlashCommandSuggestions('/l');
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.command === '/log')).toBe(true);
    });

    it('returns empty for non-slash input', () => {
      expect(getSlashCommandSuggestions('log')).toEqual([]);
    });

    it('limits to 5 suggestions', () => {
      const suggestions = getSlashCommandSuggestions('/');
      expect(suggestions.length).toBeLessThanOrEqual(5);
    });
  });
});
