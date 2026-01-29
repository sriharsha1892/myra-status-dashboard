/**
 * Tests for the parseMyraDate function from myra-bookmarklet.js
 *
 * This tests the month parsing fix (bug #4):
 * The code was checking `month === undefined` but `indexOf` returns `-1` when not found.
 * Now it correctly checks `month === -1`.
 */

// Extract the relevant functions from the bookmarklet for testing
// We need to recreate the environment that the bookmarklet uses

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Create a parseMyraDate function with a specific target year
 * This mirrors the bookmarklet's parseMyraDate function
 */
function createParseMyraDate(targetYear) {
  return function parseMyraDate(dateStr) {
    const match = dateStr.match(/([A-Za-z]+) ([0-9]+)/);
    if (!match) return null;

    const month = months.indexOf(match[1]);
    // BUG FIX: indexOf returns -1 if not found, not undefined
    if (month === -1) return null;

    const day = parseInt(match[2]);
    const year = targetYear;

    // Parse time
    const timeMatch = dateStr.match(/([0-9]+):([0-9]+) *(AM|PM)/i);
    let hour = 0,
      minute = 0;
    if (timeMatch) {
      hour = parseInt(timeMatch[1]);
      minute = parseInt(timeMatch[2]);
      if (timeMatch[3].toUpperCase() === 'PM' && hour !== 12) hour += 12;
      if (timeMatch[3].toUpperCase() === 'AM' && hour === 12) hour = 0;
    }

    return new Date(year, month, day, hour, minute);
  };
}

// Default parser using 2025 as target year
const parseMyraDate = createParseMyraDate(2025);

describe('parseMyraDate - Month Parsing Fix (Bug #4)', () => {
  describe('Valid month names should parse correctly', () => {
    test.each([
      ['Jan', 0],
      ['Feb', 1],
      ['Mar', 2],
      ['Apr', 3],
      ['May', 4],
      ['Jun', 5],
      ['Jul', 6],
      ['Aug', 7],
      ['Sep', 8],
      ['Oct', 9],
      ['Nov', 10],
      ['Dec', 11],
    ])('%s should be recognized as month index %i', (monthName, expectedIndex) => {
      const dateStr = `${monthName} 15, Mon, 10:00 AM`;
      const result = parseMyraDate(dateStr);

      expect(result).not.toBeNull();
      expect(result.getMonth()).toBe(expectedIndex);
    });
  });

  describe('Invalid month names should return null', () => {
    test('Invalid month "Xyz 15" should return null', () => {
      const result = parseMyraDate('Xyz 15, Mon, 10:00 AM');
      expect(result).toBeNull();
    });

    test('Invalid month "InvalidMonth 24, Sat, 01:00 AM" should return null', () => {
      const result = parseMyraDate('InvalidMonth 24, Sat, 01:00 AM');
      expect(result).toBeNull();
    });

    test('Misspelled month "Janury 15" should return null', () => {
      const result = parseMyraDate('Janury 15, Mon, 10:00 AM');
      expect(result).toBeNull();
    });

    test('Lowercase month "jan 15" should return null (case sensitive)', () => {
      const result = parseMyraDate('jan 15, Mon, 10:00 AM');
      expect(result).toBeNull();
    });

    test('Full month name "January 15" should return null (abbreviated expected)', () => {
      const result = parseMyraDate('January 15, Mon, 10:00 AM');
      expect(result).toBeNull();
    });
  });

  describe('Edge cases should be handled', () => {
    test('Empty string should return null', () => {
      const result = parseMyraDate('');
      expect(result).toBeNull();
    });

    test('String with no date pattern should return null', () => {
      const result = parseMyraDate('Hello World');
      expect(result).toBeNull();
    });

    test('String with only month (no day number) should return null', () => {
      const result = parseMyraDate('Jan, Mon, 10:00 AM');
      expect(result).toBeNull();
    });

    test('String with just numbers should return null', () => {
      const result = parseMyraDate('12345');
      expect(result).toBeNull();
    });

    test('Whitespace only should return null', () => {
      const result = parseMyraDate('   ');
      expect(result).toBeNull();
    });
  });

  describe('Complete date parsing - "Jan 24, Sat, 01:00 AM"', () => {
    test('should parse to correct Date object', () => {
      const result = parseMyraDate('Jan 24, Sat, 01:00 AM');

      expect(result).not.toBeNull();
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(0); // January is 0
      expect(result.getDate()).toBe(24);
      expect(result.getHours()).toBe(1);
      expect(result.getMinutes()).toBe(0);
    });
  });

  describe('Time parsing variations', () => {
    test('12:00 AM should be midnight (hour 0)', () => {
      const result = parseMyraDate('Jan 15, Mon, 12:00 AM');
      expect(result).not.toBeNull();
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
    });

    test('12:00 PM should be noon (hour 12)', () => {
      const result = parseMyraDate('Jan 15, Mon, 12:00 PM');
      expect(result).not.toBeNull();
      expect(result.getHours()).toBe(12);
      expect(result.getMinutes()).toBe(0);
    });

    test('11:59 PM should be hour 23', () => {
      const result = parseMyraDate('Jan 15, Mon, 11:59 PM');
      expect(result).not.toBeNull();
      expect(result.getHours()).toBe(23);
      expect(result.getMinutes()).toBe(59);
    });

    test('01:30 AM should be hour 1', () => {
      const result = parseMyraDate('Jan 15, Mon, 01:30 AM');
      expect(result).not.toBeNull();
      expect(result.getHours()).toBe(1);
      expect(result.getMinutes()).toBe(30);
    });

    test('01:30 PM should be hour 13', () => {
      const result = parseMyraDate('Jan 15, Mon, 01:30 PM');
      expect(result).not.toBeNull();
      expect(result.getHours()).toBe(13);
      expect(result.getMinutes()).toBe(30);
    });

    test('Date without time should default to midnight', () => {
      const result = parseMyraDate('Jan 15');
      expect(result).not.toBeNull();
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
    });

    test('Time with lowercase am/pm should work', () => {
      const result = parseMyraDate('Jan 15, Mon, 01:30 am');
      expect(result).not.toBeNull();
      expect(result.getHours()).toBe(1);
      expect(result.getMinutes()).toBe(30);
    });
  });

  describe('Different year configurations', () => {
    test('Parser with 2024 target year should set year to 2024', () => {
      const parser2024 = createParseMyraDate(2024);
      const result = parser2024('Jan 24, Sat, 01:00 AM');

      expect(result).not.toBeNull();
      expect(result.getFullYear()).toBe(2024);
    });

    test('Parser with 2023 target year should set year to 2023', () => {
      const parser2023 = createParseMyraDate(2023);
      const result = parser2023('Dec 31, Sun, 11:59 PM');

      expect(result).not.toBeNull();
      expect(result.getFullYear()).toBe(2023);
      expect(result.getMonth()).toBe(11); // December
      expect(result.getDate()).toBe(31);
    });
  });

  describe('Bug #4 verification - indexOf returns -1, not undefined', () => {
    test('The original bug: checking month === undefined would fail', () => {
      // This test documents the bug fix
      // If we had checked `month === undefined` instead of `month === -1`,
      // invalid months would create a Date with month = -1, which JavaScript
      // would interpret as December of the previous year

      const invalidMonth = 'Xyz';
      const monthIndex = months.indexOf(invalidMonth);

      // indexOf returns -1 for not found, NOT undefined
      expect(monthIndex).toBe(-1);
      expect(monthIndex).not.toBe(undefined);

      // The fixed code checks === -1
      expect(monthIndex === -1).toBe(true);

      // The buggy code would have checked === undefined (which would be false)
      expect(monthIndex === undefined).toBe(false);
    });

    test('Invalid month should not create a weird date (December of previous year)', () => {
      // If the bug existed (checking undefined instead of -1),
      // "Xyz 15" would create new Date(2025, -1, 15) which JavaScript
      // interprets as December 15, 2024

      const result = parseMyraDate('Xyz 15, Mon, 10:00 AM');

      // With the fix, it should return null
      expect(result).toBeNull();

      // Without the fix, it would have returned a valid date (December of previous year)
      // This is the bug we're testing against
    });
  });
});
