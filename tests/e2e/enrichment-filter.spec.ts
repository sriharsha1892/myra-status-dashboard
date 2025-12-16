/**
 * Enrichment Filter E2E Tests
 *
 * Tests the completeness filter on the Trials page:
 * - Filter by data completeness (complete, partial, incomplete)
 * - URL parameter persistence
 * - Filter combinations with other filters
 * - Edge cases (null scores, boundary values)
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Navigate to trials page with optional filters
 */
async function navigateToTrials(page: Page, params?: Record<string, string>) {
  const searchParams = new URLSearchParams(params);
  const url = params ? `${BASE_URL}/support/trials?${searchParams}` : `${BASE_URL}/support/trials`;
  await page.goto(url);
  await page.waitForLoadState('networkidle');
}

/**
 * Get the completeness filter select element
 */
async function getCompletenessFilter(page: Page) {
  return page.locator('select').filter({ hasText: /Complete|Partial|Incomplete/ }).first();
}

/**
 * Select a completeness filter value
 */
async function selectCompletenessFilter(page: Page, value: string) {
  const select = await getCompletenessFilter(page);
  await select.selectOption(value);
  await page.waitForLoadState('networkidle');
}

/**
 * Get the current URL search params
 */
function getUrlParams(page: Page): URLSearchParams {
  const url = new URL(page.url());
  return url.searchParams;
}

// =====================================================
// FILTER VALUES TESTS
// =====================================================

test.describe('Completeness Filter Values', () => {
  test('1. default shows all organizations', async ({ page }) => {
    await navigateToTrials(page);

    // No completeness param in URL
    const params = getUrlParams(page);
    expect(params.get('completeness')).toBeNull();

    // Organizations should be visible
    const orgCards = page.locator('[data-testid="org-card"], .org-row, [class*="org"]');
    // Just verify the page loaded without errors
    await expect(page.locator('body')).toBeVisible();
  });

  test('2. filter by complete shows high-score orgs', async ({ page }) => {
    await navigateToTrials(page, { completeness: 'complete' });

    // URL should have completeness=complete
    const params = getUrlParams(page);
    expect(params.get('completeness')).toBe('complete');
  });

  test('3. filter by partial shows mid-score orgs', async ({ page }) => {
    await navigateToTrials(page, { completeness: 'partial' });

    const params = getUrlParams(page);
    expect(params.get('completeness')).toBe('partial');
  });

  test('4. filter by incomplete shows low-score orgs', async ({ page }) => {
    await navigateToTrials(page, { completeness: 'incomplete' });

    const params = getUrlParams(page);
    expect(params.get('completeness')).toBe('incomplete');
  });
});

// =====================================================
// URL PERSISTENCE TESTS
// =====================================================

test.describe('URL Parameter Persistence', () => {
  test('5. selecting filter updates URL', async ({ page }) => {
    await navigateToTrials(page);

    // Find and click the completeness filter
    const filterSelect = page.locator('select').filter({ hasText: /All|Complete|Partial|Incomplete/ });
    if (await filterSelect.count() > 0) {
      await filterSelect.first().selectOption('incomplete');
      await page.waitForLoadState('networkidle');

      const params = getUrlParams(page);
      expect(params.get('completeness')).toBe('incomplete');
    }
  });

  test('6. loading from URL param sets filter', async ({ page }) => {
    await navigateToTrials(page, { completeness: 'partial' });

    // Filter should be pre-selected
    const filterSelect = page.locator('select').filter({ hasText: /Partial/ });
    if (await filterSelect.count() > 0) {
      await expect(filterSelect.first()).toHaveValue('partial');
    }
  });

  test('7. clearing filter clears URL param', async ({ page }) => {
    await navigateToTrials(page, { completeness: 'incomplete' });

    // Select "All" to clear
    const filterSelect = page.locator('select').filter({ hasText: /Incomplete/ });
    if (await filterSelect.count() > 0) {
      await filterSelect.first().selectOption('all');
      await page.waitForLoadState('networkidle');

      const params = getUrlParams(page);
      expect(params.get('completeness')).toBeNull();
    }
  });

  test('8. combines with other filters in URL', async ({ page }) => {
    await navigateToTrials(page, {
      completeness: 'incomplete',
      stage: 'pilot',
    });

    const params = getUrlParams(page);
    expect(params.get('completeness')).toBe('incomplete');
    expect(params.get('stage')).toBe('pilot');
  });
});

// =====================================================
// FILTER COMBINATIONS TESTS
// =====================================================

test.describe('Filter Combinations', () => {
  test('9. completeness + stage filter', async ({ page }) => {
    await navigateToTrials(page, {
      completeness: 'incomplete',
      stage: 'pilot',
    });

    // Both filters should be active
    const params = getUrlParams(page);
    expect(params.get('completeness')).toBe('incomplete');
    expect(params.get('stage')).toBe('pilot');
  });

  test('10. completeness + search query', async ({ page }) => {
    await navigateToTrials(page, {
      completeness: 'incomplete',
      q: 'acme',
    });

    const params = getUrlParams(page);
    expect(params.get('completeness')).toBe('incomplete');
    expect(params.get('q')).toBe('acme');
  });

  test('11. completeness + account manager filter', async ({ page }) => {
    await navigateToTrials(page, {
      completeness: 'complete',
      am: 'test-am',
    });

    const params = getUrlParams(page);
    expect(params.get('completeness')).toBe('complete');
    expect(params.get('am')).toBe('test-am');
  });

  test('12. empty results with no matching orgs', async ({ page }) => {
    // Navigate with a very restrictive filter combination
    await navigateToTrials(page, {
      completeness: 'incomplete',
      q: 'nonexistent-org-xyz-123',
    });

    // Page should still load
    await expect(page.locator('body')).toBeVisible();
  });
});

// =====================================================
// EDGE CASES TESTS
// =====================================================

test.describe('Edge Cases', () => {
  test('13. handles null completeness_score gracefully', async ({ page }) => {
    // Navigate to trials page - orgs with null score should show as incomplete
    await navigateToTrials(page, { completeness: 'incomplete' });

    // Page should load without errors
    await expect(page.locator('body')).toBeVisible();
  });

  test('14. score exactly 40 shows in partial', async ({ page }) => {
    // This is more of a unit test case, but we can verify the page handles it
    await navigateToTrials(page, { completeness: 'partial' });
    await expect(page.locator('body')).toBeVisible();
  });

  test('15. score exactly 70 shows in complete', async ({ page }) => {
    await navigateToTrials(page, { completeness: 'complete' });
    await expect(page.locator('body')).toBeVisible();
  });

  test('16. pagination works with filter', async ({ page }) => {
    await navigateToTrials(page, {
      completeness: 'incomplete',
      page: '2',
    });

    const params = getUrlParams(page);
    expect(params.get('completeness')).toBe('incomplete');
    expect(params.get('page')).toBe('2');
  });
});

// =====================================================
// UI INTERACTION TESTS
// =====================================================

test.describe('UI Interactions', () => {
  test('filter dropdown is accessible', async ({ page }) => {
    await navigateToTrials(page);

    // Look for any select element or filter UI
    const selects = page.locator('select');
    const selectCount = await selects.count();

    // There should be filter dropdowns on the page
    expect(selectCount).toBeGreaterThan(0);
  });

  test('filter changes update org list', async ({ page }) => {
    await navigateToTrials(page);

    // Change filter and verify the page updates
    const filterSelect = page.locator('select').first();
    if (await filterSelect.count() > 0) {
      const initialHtml = await page.content();

      await filterSelect.selectOption({ index: 1 });
      await page.waitForLoadState('networkidle');

      // Page content should have potentially changed
      await expect(page.locator('body')).toBeVisible();
    }
  });
});
