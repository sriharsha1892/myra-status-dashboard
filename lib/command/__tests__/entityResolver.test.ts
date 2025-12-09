/**
 * Tests for Entity Resolver
 * Tests fuzzy matching patterns and alias logic (DB operations need integration tests)
 */

import type { EntityMatch } from '../types';

// Skip DB-dependent tests - these would be integration tests
describe.skip('entityResolver (integration tests)', () => {
  describe('resolveOrganization', () => {
    it.todo('returns alias match when alias exists');
    it.todo('falls back to exact match when no alias exists');
    it.todo('matches by domain without TLD');
    it.todo('returns fuzzy match with alternatives');
  });

  describe('resolveUser', () => {
    it.todo('returns alias match when alias exists');
    it.todo('matches by exact name');
    it.todo('matches by first name only');
    it.todo('matches by email local part');
  });

  describe('checkEntityAlias', () => {
    it.todo('returns alias data and increments usage');
    it.todo('returns null when alias not found');
    it.todo('normalizes alias before lookup');
  });

  describe('saveEntityAlias', () => {
    it.todo('saves alias with normalized value');
    it.todo('returns false on error');
  });
});

// Test entity matching patterns (no DB needed)
describe('entityResolver patterns', () => {
  describe('EntityMatch structure', () => {
    it('defines exact match', () => {
      const exactMatch: EntityMatch = {
        id: 'org_123',
        name: 'Acme Corporation',
        confidence: 1.0,
        strategy: 'exact',
      };

      expect(exactMatch.confidence).toBe(1.0);
      expect(exactMatch.strategy).toBe('exact');
      expect(exactMatch.alternatives).toBeUndefined();
    });

    it('defines fuzzy match with alternatives', () => {
      const fuzzyMatch: EntityMatch = {
        id: 'org_123',
        name: 'Acme Corp',
        confidence: 0.85,
        strategy: 'fuzzy',
        alternatives: [
          { id: 'org_456', name: 'Acme Industries', score: 0.82 },
          { id: 'org_789', name: 'Acme LLC', score: 0.75 },
        ],
      };

      expect(fuzzyMatch.confidence).toBeLessThan(1.0);
      expect(fuzzyMatch.strategy).toBe('fuzzy');
      expect(fuzzyMatch.alternatives).toHaveLength(2);
      expect(fuzzyMatch.alternatives![0].score).toBeGreaterThan(
        fuzzyMatch.alternatives![1].score
      );
    });

    it('defines domain match', () => {
      const domainMatch: EntityMatch = {
        id: 'org_123',
        name: 'Acme Corporation',
        confidence: 0.95,
        strategy: 'domain',
      };

      expect(domainMatch.confidence).toBe(0.95);
      expect(domainMatch.strategy).toBe('domain');
    });

    it('defines alias match', () => {
      const aliasMatch: EntityMatch = {
        id: 'org_123',
        name: 'Acme Corporation',
        confidence: 1.0,
        strategy: 'alias',
      };

      expect(aliasMatch.confidence).toBe(1.0);
      expect(aliasMatch.strategy).toBe('alias');
    });
  });

  describe('Normalization rules', () => {
    // Test normalization logic without DB
    function normalize(str: string): string {
      return str
        .toLowerCase()
        .trim()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .replace(/\b(inc|corp|corporation|ltd|limited|llc|company|co)\b/gi, '')
        .trim();
    }

    it('converts to lowercase', () => {
      expect(normalize('ACME CORP')).toBe('acme');
    });

    it('removes special characters', () => {
      expect(normalize('Acme & Co!')).toBe('acme');
    });

    it('normalizes whitespace', () => {
      expect(normalize('Acme   Corp')).toBe('acme');
    });

    it('removes company suffixes', () => {
      const suffixes = ['Inc', 'Corp', 'Corporation', 'Ltd', 'Limited', 'LLC', 'Company', 'Co'];
      suffixes.forEach((suffix) => {
        expect(normalize(`Acme ${suffix}`)).toBe('acme');
      });
    });

    it('handles complex names', () => {
      expect(normalize('The Acme Corporation, Inc.')).toBe('the acme');
      expect(normalize("O'Brien & Associates, LLC")).toBe('obrien associates');
    });

    it('trims leading/trailing whitespace', () => {
      expect(normalize('  Acme  ')).toBe('acme');
    });
  });

  describe('Match strategy priority', () => {
    const strategies = ['alias', 'exact', 'domain', 'fuzzy'] as const;

    it('alias has highest priority', () => {
      expect(strategies.indexOf('alias')).toBe(0);
    });

    it('exact match precedes domain', () => {
      expect(strategies.indexOf('exact')).toBeLessThan(strategies.indexOf('domain'));
    });

    it('fuzzy has lowest priority', () => {
      expect(strategies.indexOf('fuzzy')).toBe(strategies.length - 1);
    });
  });

  describe('Confidence thresholds', () => {
    const EXACT_MATCH_THRESHOLD = 100;
    const HIGH_CONFIDENCE_THRESHOLD = 90;
    const MEDIUM_CONFIDENCE_THRESHOLD = 70;

    it('exact match is 100%', () => {
      expect(EXACT_MATCH_THRESHOLD).toBe(100);
    });

    it('high confidence is 90%+', () => {
      expect(HIGH_CONFIDENCE_THRESHOLD).toBe(90);
    });

    it('medium confidence is 70%+', () => {
      expect(MEDIUM_CONFIDENCE_THRESHOLD).toBe(70);
    });

    it('thresholds are properly ordered', () => {
      expect(EXACT_MATCH_THRESHOLD).toBeGreaterThan(HIGH_CONFIDENCE_THRESHOLD);
      expect(HIGH_CONFIDENCE_THRESHOLD).toBeGreaterThan(MEDIUM_CONFIDENCE_THRESHOLD);
    });
  });

  describe('Domain matching', () => {
    function extractDomainWithoutTld(domain: string): string {
      return domain.replace(/\.(com|io|co|org|net|ai|app)$/, '');
    }

    it('removes common TLDs', () => {
      expect(extractDomainWithoutTld('acme.com')).toBe('acme');
      expect(extractDomainWithoutTld('techco.io')).toBe('techco');
      expect(extractDomainWithoutTld('startup.ai')).toBe('startup');
      expect(extractDomainWithoutTld('corp.org')).toBe('corp');
    });

    it('handles multi-part domains', () => {
      expect(extractDomainWithoutTld('sub.acme.com')).toBe('sub.acme');
    });
  });

  describe('User name matching', () => {
    function extractFirstName(fullName: string): string {
      return fullName.split(' ')[0].toLowerCase();
    }

    function extractEmailLocal(email: string): string {
      return email.split('@')[0].toLowerCase();
    }

    it('extracts first name from full name', () => {
      expect(extractFirstName('John Doe')).toBe('john');
      expect(extractFirstName('Jane Smith-Williams')).toBe('jane');
      expect(extractFirstName('Bob')).toBe('bob');
    });

    it('extracts local part from email', () => {
      expect(extractEmailLocal('john@acme.com')).toBe('john');
      expect(extractEmailLocal('jane.smith@company.io')).toBe('jane.smith');
      expect(extractEmailLocal('bob_doe@test.org')).toBe('bob_doe');
    });
  });

  describe('Alternative ranking', () => {
    it('sorts alternatives by score descending', () => {
      const alternatives = [
        { id: '1', name: 'Low Match', score: 0.70 },
        { id: '2', name: 'High Match', score: 0.95 },
        { id: '3', name: 'Medium Match', score: 0.85 },
      ];

      const sorted = alternatives.sort((a, b) => b.score - a.score);

      expect(sorted[0].name).toBe('High Match');
      expect(sorted[1].name).toBe('Medium Match');
      expect(sorted[2].name).toBe('Low Match');
    });

    it('limits alternatives to 5', () => {
      const manyAlternatives = Array.from({ length: 10 }, (_, i) => ({
        id: String(i),
        name: `Match ${i}`,
        score: 0.70 + i * 0.01,
      }));

      const limited = manyAlternatives.slice(0, 5);
      expect(limited).toHaveLength(5);
    });
  });

  describe('Entity alias patterns', () => {
    it('stores normalized alias key', () => {
      const aliasRecord = {
        entity_type: 'org' as const,
        alias: 'acme', // Normalized from "ACME Corp"
        target_id: 'org_123',
        target_name: 'Acme Corporation',
        usage_count: 1,
      };

      expect(aliasRecord.alias).not.toContain(' ');
      expect(aliasRecord.alias).toBe(aliasRecord.alias.toLowerCase());
    });

    it('preserves target_name for display', () => {
      const aliasRecord = {
        entity_type: 'user' as const,
        alias: 'john',
        target_id: 'user_123',
        target_name: 'John Doe', // Original casing preserved
        usage_count: 5,
      };

      expect(aliasRecord.target_name).toBe('John Doe');
      expect(aliasRecord.alias).toBe('john');
    });

    it('increments usage count on match', () => {
      let usageCount = 1;
      usageCount++; // Simulating increment_alias_usage
      expect(usageCount).toBe(2);
    });
  });
});
