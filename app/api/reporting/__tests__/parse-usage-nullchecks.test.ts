/**
 * Tests for null check fixes in parse-usage route
 *
 * Bug #5: Null pointer on user_name.toLowerCase() - entries with null/undefined user_name should not crash
 * Bug #6: Null pointer on database results - when mappingsResult.data is null/undefined, code should handle gracefully
 *
 * These tests verify the null check logic patterns used in the route handler.
 * Since testing Next.js API routes directly requires Node.js environment polyfills,
 * we test the core logic patterns that handle null values.
 */

import {
  parseMyraUsageText,
  fuzzyMatchUser,
  aggregateByUser,
  aggregateByDate,
  type ParsedUsageEntry,
} from '@/lib/parsers/myra-usage-parser';

interface UserMapping {
  user_name: string | null | undefined;
  org_id: string;
  user_id: string | null;
}

/**
 * Simulates the mapping cache building logic from route.ts lines 92-100
 * This is the code we're testing for Bug #5 and #6
 */
function buildMappingsCache(mappingsData: UserMapping[] | null | undefined): Map<string, UserMapping> {
  const cachedMappings = new Map<string, UserMapping>();
  if (mappingsData) {
    for (const m of mappingsData) {
      // Skip entries with null/undefined user_name (Bug #5 fix)
      if (m.user_name) {
        cachedMappings.set(m.user_name.toLowerCase(), m as UserMapping & { user_name: string });
      }
    }
  }
  return cachedMappings;
}

/**
 * Simulates the cached lookup logic from route.ts lines 105-118
 * This is the code we're testing for null user_name in usage entries
 */
function lookupCachedMapping(
  entry: { user_name: string | null | undefined },
  cachedMappings: Map<string, UserMapping>
): UserMapping | undefined {
  // First check cached mappings (with null check) - Bug #5 fix
  const cached = entry.user_name
    ? cachedMappings.get(entry.user_name.toLowerCase())
    : undefined;
  return cached;
}

describe('parse-usage null checks (Bug #5 and #6)', () => {
  describe('Bug #5: Mapping entries with null/undefined user_name', () => {
    it('should skip mapping entries with null user_name without error', () => {
      const mappingsData: UserMapping[] = [
        { user_name: null, org_id: 'org_1', user_id: 'user_1' },
        { user_name: 'valid.user@example.com', org_id: 'org_2', user_id: 'user_2' },
      ];

      const cache = buildMappingsCache(mappingsData);

      // Only valid entry should be in cache
      expect(cache.size).toBe(1);
      expect(cache.has('valid.user@example.com')).toBe(true);
      expect(cache.has('null')).toBe(false);
    });

    it('should skip mapping entries with undefined user_name without error', () => {
      const mappingsData: UserMapping[] = [
        { user_name: undefined, org_id: 'org_1', user_id: 'user_1' },
        { user_name: 'valid.user@example.com', org_id: 'org_2', user_id: 'user_2' },
      ];

      const cache = buildMappingsCache(mappingsData);

      expect(cache.size).toBe(1);
      expect(cache.has('valid.user@example.com')).toBe(true);
    });

    it('should skip mapping entries with empty string user_name', () => {
      const mappingsData: UserMapping[] = [
        { user_name: '', org_id: 'org_1', user_id: 'user_1' },
        { user_name: 'valid.user@example.com', org_id: 'org_2', user_id: 'user_2' },
      ];

      const cache = buildMappingsCache(mappingsData);

      // Empty string is falsy, so it should be skipped
      expect(cache.size).toBe(1);
      expect(cache.has('valid.user@example.com')).toBe(true);
      expect(cache.has('')).toBe(false);
    });

    it('should correctly process valid user_name entries alongside null ones', () => {
      const mappingsData: UserMapping[] = [
        { user_name: null, org_id: 'org_1', user_id: 'user_1' },
        { user_name: undefined, org_id: 'org_2', user_id: 'user_2' },
        { user_name: '', org_id: 'org_3', user_id: 'user_3' },
        { user_name: 'john.doe@example.com', org_id: 'org_4', user_id: 'user_4' },
        { user_name: 'Jane Smith', org_id: 'org_5', user_id: 'user_5' },
      ];

      const cache = buildMappingsCache(mappingsData);

      expect(cache.size).toBe(2);
      expect(cache.has('john.doe@example.com')).toBe(true);
      expect(cache.has('jane smith')).toBe(true); // Lowercase
      expect(cache.get('jane smith')?.org_id).toBe('org_5');
    });

    it('should handle case-insensitive matching for valid user_names', () => {
      const mappingsData: UserMapping[] = [
        { user_name: 'John.Doe@Example.COM', org_id: 'org_1', user_id: 'user_1' },
      ];

      const cache = buildMappingsCache(mappingsData);

      expect(cache.has('john.doe@example.com')).toBe(true);
      expect(cache.has('JOHN.DOE@EXAMPLE.COM')).toBe(false); // Map key is lowercased
    });
  });

  describe('Bug #6: Empty mappingsResult.data (null/undefined)', () => {
    it('should handle null mappingsResult.data gracefully', () => {
      const cache = buildMappingsCache(null);

      expect(cache.size).toBe(0);
      expect(() => cache.get('anyuser')).not.toThrow();
    });

    it('should handle undefined mappingsResult.data gracefully', () => {
      const cache = buildMappingsCache(undefined);

      expect(cache.size).toBe(0);
      expect(() => cache.get('anyuser')).not.toThrow();
    });

    it('should handle empty array mappingsResult.data', () => {
      const cache = buildMappingsCache([]);

      expect(cache.size).toBe(0);
    });
  });

  describe('Usage entries with null user_name (cached lookup)', () => {
    const validCache = new Map<string, UserMapping>([
      ['john.doe@example.com', { user_name: 'john.doe@example.com', org_id: 'org_1', user_id: 'user_1' }],
    ]);

    it('should return undefined for entry with null user_name', () => {
      const entry = { user_name: null as unknown as string };

      const result = lookupCachedMapping(entry, validCache);

      expect(result).toBeUndefined();
    });

    it('should return undefined for entry with undefined user_name', () => {
      const entry = { user_name: undefined as unknown as string };

      const result = lookupCachedMapping(entry, validCache);

      expect(result).toBeUndefined();
    });

    it('should return undefined for entry with empty string user_name', () => {
      const entry = { user_name: '' };

      const result = lookupCachedMapping(entry, validCache);

      expect(result).toBeUndefined();
    });

    it('should not throw when looking up null user_name', () => {
      const entry = { user_name: null as unknown as string };

      expect(() => lookupCachedMapping(entry, validCache)).not.toThrow();
    });
  });

  describe('Normal entries with valid user_name', () => {
    const validCache = new Map<string, UserMapping>([
      ['john.doe@example.com', { user_name: 'john.doe@example.com', org_id: 'org_1', user_id: 'user_1' }],
      ['jane smith', { user_name: 'Jane Smith', org_id: 'org_2', user_id: 'user_2' }],
    ]);

    it('should find cached mapping for valid user_name', () => {
      const entry = { user_name: 'john.doe@example.com' };

      const result = lookupCachedMapping(entry, validCache);

      expect(result).toBeDefined();
      expect(result?.org_id).toBe('org_1');
    });

    it('should find cached mapping case-insensitively', () => {
      const entry = { user_name: 'JOHN.DOE@EXAMPLE.COM' };

      const result = lookupCachedMapping(entry, validCache);

      expect(result).toBeDefined();
      expect(result?.org_id).toBe('org_1');
    });

    it('should find cached mapping for name with spaces', () => {
      const entry = { user_name: 'Jane Smith' };

      const result = lookupCachedMapping(entry, validCache);

      expect(result).toBeDefined();
      expect(result?.org_id).toBe('org_2');
    });

    it('should return undefined for user not in cache', () => {
      const entry = { user_name: 'unknown.user@example.com' };

      const result = lookupCachedMapping(entry, validCache);

      expect(result).toBeUndefined();
    });
  });

  describe('Integration: fuzzyMatchUser with null handling', () => {
    const knownUsers = [
      { id: 'user_1', name: 'John Doe', org_id: 'org_1', org_name: 'Acme Corp' },
      { id: 'user_2', name: 'Jane Smith', org_id: 'org_2', org_name: 'Beta Inc' },
    ];

    it('should match exact user name', () => {
      const result = fuzzyMatchUser('John Doe', knownUsers);

      expect(result.match).toBeDefined();
      expect(result.match?.id).toBe('user_1');
      expect(result.confidence).toBe('high');
    });

    it('should match case-insensitively', () => {
      const result = fuzzyMatchUser('john doe', knownUsers);

      expect(result.match).toBeDefined();
      expect(result.match?.id).toBe('user_1');
      expect(result.confidence).toBe('high');
    });

    it('should return no match for unknown user', () => {
      const result = fuzzyMatchUser('Unknown Person', knownUsers);

      expect(result.match).toBeNull();
      expect(result.confidence).toBe('none');
    });

    it('should handle empty string user name', () => {
      const result = fuzzyMatchUser('', knownUsers);

      // Empty string should not match anyone
      expect(result.confidence).toBe('none');
    });
  });

  describe('Edge cases: combined null scenarios', () => {
    it('should handle empty everything gracefully', () => {
      const cache = buildMappingsCache(null);
      const entry = { user_name: null as unknown as string };

      const result = lookupCachedMapping(entry, cache);

      expect(result).toBeUndefined();
    });

    it('should handle array with all null/undefined user_names', () => {
      const mappingsData: UserMapping[] = [
        { user_name: null, org_id: 'org_1', user_id: 'user_1' },
        { user_name: undefined, org_id: 'org_2', user_id: 'user_2' },
        { user_name: '', org_id: 'org_3', user_id: 'user_3' },
      ];

      const cache = buildMappingsCache(mappingsData);

      expect(cache.size).toBe(0);
    });

    it('should maintain data integrity for valid entries amidst nulls', () => {
      const mappingsData: UserMapping[] = [
        { user_name: null, org_id: 'org_null', user_id: 'user_null' },
        { user_name: 'test@example.com', org_id: 'org_valid', user_id: 'user_valid' },
        { user_name: undefined, org_id: 'org_undefined', user_id: 'user_undefined' },
      ];

      const cache = buildMappingsCache(mappingsData);
      const entry = { user_name: 'test@example.com' };

      const result = lookupCachedMapping(entry, cache);

      expect(result).toBeDefined();
      expect(result?.org_id).toBe('org_valid');
      expect(result?.user_id).toBe('user_valid');
    });
  });
});

describe('Parser utility functions handle edge cases', () => {
  describe('parseMyraUsageText', () => {
    it('should return empty entries for empty input', () => {
      const result = parseMyraUsageText('');

      expect(result.entries).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should parse valid entry correctly', () => {
      const input = `Test Conversation
myRA AI
John Doe
Jan 15, 10:00 AM
$5.25`;

      const result = parseMyraUsageText(input);

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].user_name).toBe('John Doe');
      expect(result.entries[0].cost).toBe(5.25);
    });
  });

  describe('aggregateByUser', () => {
    it('should handle empty entries array', () => {
      const result = aggregateByUser([]);

      expect(result).toHaveLength(0);
    });

    it('should aggregate entries by user', () => {
      const entries: ParsedUsageEntry[] = [
        {
          conversation_title: 'Conv 1',
          subtitle: null,
          user_name: 'John Doe',
          timestamp: new Date('2024-01-15'),
          cost: 5.25,
          raw_text: '',
        },
        {
          conversation_title: 'Conv 2',
          subtitle: null,
          user_name: 'John Doe',
          timestamp: new Date('2024-01-16'),
          cost: 3.50,
          raw_text: '',
        },
      ];

      const result = aggregateByUser(entries);

      expect(result).toHaveLength(1);
      expect(result[0].user_name).toBe('John Doe');
      expect(result[0].conversation_count).toBe(2);
      expect(result[0].total_cost).toBe(8.75);
    });
  });

  describe('aggregateByDate', () => {
    it('should handle empty entries array', () => {
      const result = aggregateByDate([]);

      expect(result).toHaveLength(0);
    });

    it('should aggregate entries by date', () => {
      const entries: ParsedUsageEntry[] = [
        {
          conversation_title: 'Conv 1',
          subtitle: null,
          user_name: 'John Doe',
          timestamp: new Date('2024-01-15T10:00:00Z'),
          cost: 5.25,
          raw_text: '',
        },
        {
          conversation_title: 'Conv 2',
          subtitle: null,
          user_name: 'Jane Smith',
          timestamp: new Date('2024-01-15T14:00:00Z'),
          cost: 3.50,
          raw_text: '',
        },
      ];

      const result = aggregateByDate(entries);

      expect(result).toHaveLength(1);
      expect(result[0].date).toBe('2024-01-15');
      expect(result[0].conversation_count).toBe(2);
      expect(result[0].unique_users).toBe(2);
    });
  });
});
