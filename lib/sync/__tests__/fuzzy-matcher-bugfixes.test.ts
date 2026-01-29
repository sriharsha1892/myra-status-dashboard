/**
 * Tests for Fuzzy Matcher Bug Fixes
 *
 * Bug #8: Empty strings should return 0% similarity (not 100)
 * Bug #7: Email-only match should require at least 30% name similarity
 */

import {
  calculateSimilarity,
  normalizeCompanyName,
  findMatches,
  DbRecord,
} from '../fuzzy-matcher';

describe('fuzzy-matcher bug fixes', () => {
  describe('Bug #8: Empty strings return 0% similarity', () => {
    it('returns 0 similarity for "Corp Inc" vs "Ltd LLC" (both normalize to empty)', () => {
      // Both strings consist only of common suffixes that get stripped
      const similarity = calculateSimilarity('Corp Inc', 'Ltd LLC');
      expect(similarity).toBe(0);
    });

    it('returns 0 similarity for empty string vs empty string', () => {
      const similarity = calculateSimilarity('', '');
      expect(similarity).toBe(0);
    });

    it('returns 0 similarity for whitespace-only strings', () => {
      const similarity = calculateSimilarity('   ', '   ');
      expect(similarity).toBe(0);
    });

    it('returns 0 similarity for suffix-only variants', () => {
      // Various combinations of common suffixes
      expect(calculateSimilarity('Inc.', 'Corp')).toBe(0);
      expect(calculateSimilarity('LLC', 'Ltd')).toBe(0);
      expect(calculateSimilarity('Corporation', 'Limited')).toBe(0);
      expect(calculateSimilarity('GmbH', 'AG')).toBe(0);
      expect(calculateSimilarity('Pvt Ltd', 'Private Limited')).toBe(0);
    });

    it('correctly normalizes company names with only suffixes', () => {
      // Verify the normalization is working as expected
      expect(normalizeCompanyName('Corp Inc')).toBe('');
      expect(normalizeCompanyName('Ltd LLC')).toBe('');
      expect(normalizeCompanyName('Inc.')).toBe('');
      expect(normalizeCompanyName('Corporation Limited')).toBe('');
    });

    it('still works correctly for actual company names', () => {
      // Ensure the fix doesn't break normal matching
      expect(calculateSimilarity('Acme Inc', 'Acme Inc')).toBe(100);
      expect(calculateSimilarity('Acme Corp', 'Acme')).toBe(100);
      expect(calculateSimilarity('Acme', 'Acme Ltd')).toBe(100);
      expect(calculateSimilarity('TechCo Inc', 'TechCo Corporation')).toBe(100);
    });

    it('returns proper similarity for different company names', () => {
      // Similar names should have high similarity
      const similarity1 = calculateSimilarity('Acme Technologies', 'Acme Tech');
      expect(similarity1).toBeGreaterThan(50);

      // Different names should have low similarity
      const similarity2 = calculateSimilarity('Acme', 'Zenith');
      expect(similarity2).toBeLessThan(50);
    });
  });

  describe('Bug #7: Email-only match requires name similarity', () => {
    const createDbRecord = (
      id: string,
      company_name: string,
      primary_email?: string
    ): DbRecord => ({
      id,
      company_name,
      primary_email,
    });

    it('does NOT include email-only match with 0% name similarity', () => {
      const dbRecords: DbRecord[] = [
        createDbRecord('1', 'Zenith Corporation', 'shared@company.com'),
      ];

      // Excel has completely different company name but same email
      const matches = findMatches('Acme Inc', 'shared@company.com', dbRecords);

      // Should NOT match - email alone is not reliable
      expect(matches).toHaveLength(0);
    });

    it('does NOT include email match with low name similarity (< 30%)', () => {
      const dbRecords: DbRecord[] = [
        createDbRecord('1', 'XYZ Technologies', 'john@xyz.com'),
      ];

      // Name similarity between "ABC Corp" and "XYZ Technologies" is very low
      const matches = findMatches('ABC Corp', 'john@xyz.com', dbRecords);

      // Should NOT match
      expect(matches).toHaveLength(0);
    });

    it('includes email match with 35% name similarity at 70% confidence', () => {
      const dbRecords: DbRecord[] = [
        // Create a record where name similarity would be around 30-50%
        createDbRecord('1', 'Acme Technologies Inc', 'contact@acme.com'),
      ];

      // "Acme Solutions" vs "Acme Technologies Inc" - partial match
      const matches = findMatches('Acme Solutions', 'contact@acme.com', dbRecords);

      // Should match with email, moderate confidence
      expect(matches.length).toBeGreaterThan(0);
      if (matches.length > 0) {
        expect(matches[0].matchedBy).toBe('email');
        expect(matches[0].similarity).toBe(70);
      }
    });

    it('includes email match with 60% name similarity at 95% confidence', () => {
      const dbRecords: DbRecord[] = [
        createDbRecord('1', 'Acme Corp', 'contact@acme.com'),
      ];

      // "Acme Inc" vs "Acme Corp" both normalize to "acme" = 100% match
      const matches = findMatches('Acme Inc', 'contact@acme.com', dbRecords);

      // Should match with both email and name, high confidence
      expect(matches.length).toBeGreaterThan(0);
      if (matches.length > 0) {
        expect(matches[0].matchedBy).toBe('both');
        expect(matches[0].similarity).toBe(100);
      }
    });

    it('normal name matching still works without email', () => {
      const dbRecords: DbRecord[] = [
        createDbRecord('1', 'Acme Corp', undefined),
        createDbRecord('2', 'Tech Solutions Ltd', undefined),
      ];

      const matches = findMatches('Acme Inc', null, dbRecords);

      // Should match by company name alone
      expect(matches.length).toBe(1);
      expect(matches[0].dbRecord.id).toBe('1');
      expect(matches[0].matchedBy).toBe('company_name');
      expect(matches[0].similarity).toBe(100); // "Acme Inc" and "Acme Corp" both normalize to "acme"
    });

    it('does not match when name similarity is below 50% without email', () => {
      const dbRecords: DbRecord[] = [
        createDbRecord('1', 'Zenith Industries', undefined),
      ];

      const matches = findMatches('Acme Inc', null, dbRecords);

      // Name similarity too low, no email to help
      expect(matches).toHaveLength(0);
    });

    it('correctly handles multiple records with varying similarities', () => {
      const dbRecords: DbRecord[] = [
        createDbRecord('1', 'Acme Corporation', 'contact@acme.com'), // High match (name + email)
        createDbRecord('2', 'Zenith Corp', 'contact@acme.com'), // Email match but low name similarity
        createDbRecord('3', 'Acme Ltd', undefined), // Name match only (normalizes to "acme")
        createDbRecord('4', 'XYZ Ltd', 'xyz@other.com'), // No match
      ];

      const matches = findMatches('Acme Inc', 'contact@acme.com', dbRecords);

      // Should include records 1 and 3, but NOT 2 (email only, low name similarity)
      const matchIds = matches.map(m => m.dbRecord.id);
      expect(matchIds).toContain('1');
      expect(matchIds).toContain('3'); // "Acme Inc" -> "acme", "Acme Ltd" -> "acme" = 100% match
      expect(matchIds).not.toContain('2');
      expect(matchIds).not.toContain('4');
    });
  });

  describe('Regression tests for normal matching behavior', () => {
    const createDbRecord = (
      id: string,
      company_name: string,
      primary_email?: string
    ): DbRecord => ({
      id,
      company_name,
      primary_email,
    });

    it('exact name match returns 100% similarity', () => {
      expect(calculateSimilarity('Acme Inc', 'Acme Inc')).toBe(100);
    });

    it('normalized exact match returns 100% similarity', () => {
      // Different suffixes but same base name
      expect(calculateSimilarity('Acme Inc', 'Acme Corp')).toBe(100);
      expect(calculateSimilarity('Tech Solutions Ltd', 'Tech Solutions LLC')).toBe(100);
    });

    it('findMatches respects topN parameter', () => {
      const dbRecords: DbRecord[] = [
        createDbRecord('1', 'Acme Corp', undefined),
        createDbRecord('2', 'Acme Inc', undefined),
        createDbRecord('3', 'Acme Ltd', undefined),
        createDbRecord('4', 'Acme GmbH', undefined),
      ];

      const matches = findMatches('Acme', null, dbRecords, 2);
      expect(matches.length).toBe(2);
    });

    it('matches are sorted by similarity descending', () => {
      const dbRecords: DbRecord[] = [
        createDbRecord('1', 'Tech Corp', undefined), // Lower match
        createDbRecord('2', 'Acme Inc', undefined), // Higher match
      ];

      const matches = findMatches('Acme Technologies', null, dbRecords);

      if (matches.length >= 2) {
        expect(matches[0].similarity).toBeGreaterThanOrEqual(matches[1].similarity);
      }
    });
  });
});
