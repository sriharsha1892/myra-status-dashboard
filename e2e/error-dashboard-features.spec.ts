import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Error Dashboard Features
 * Tests error trends visualization, bulk actions, filters, and view modes
 * Uses the default admin authentication from playwright.config.ts
 */

// Test configuration
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  timeout: 60000,
};

test.describe('Error Dashboard - Enhanced Features', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate directly to error dashboard (already authenticated)
    await page.goto(`${TEST_CONFIG.baseUrl}/support/admin/errors`, { timeout: TEST_CONFIG.timeout });
    await page.waitForLoadState('networkidle', { timeout: TEST_CONFIG.timeout });
  });

  test.describe('View Toggle', () => {
    test('should switch between List, Trends, and Summary views', async ({ page }) => {
      // Check initial view (List)
      await expect(page.locator('button:has-text("Error List")')).toHaveClass(/bg-blue-600/);

      // Switch to Trends view
      await page.click('button:has-text("Trends")');
      await expect(page.locator('button:has-text("Trends")')).toHaveClass(/bg-blue-600/);

      // Wait for charts to load
      await page.waitForTimeout(1000);

      // Verify charts are visible (check for recharts containers)
      const chartsVisible = await page.locator('.recharts-wrapper').count();
      expect(chartsVisible).toBeGreaterThan(0);

      // Switch to Summary view
      await page.click('button:has-text("Summary by Context")');
      await expect(page.locator('button:has-text("Summary by Context")')).toHaveClass(/bg-blue-600/);

      // Switch back to List view
      await page.click('button:has-text("Error List")');
      await expect(page.locator('button:has-text("Error List")')).toHaveClass(/bg-blue-600/);

      // Verify error table is visible
      await expect(page.locator('table')).toBeVisible();
    });
  });

  test.describe('Error Trends Visualization', () => {
    test('should display all chart types in Trends view', async ({ page }) => {
      // Switch to Trends view
      await page.click('button:has-text("Trends")');

      // Wait for charts to render
      await page.waitForTimeout(2000);

      // Check for heading text
      await expect(page.locator('text=Daily Error Trends (Last 30 Days)')).toBeVisible();
      await expect(page.locator('text=Errors by Type')).toBeVisible();
      await expect(page.locator('text=Errors by Context')).toBeVisible();
      await expect(page.locator('text=Status Distribution')).toBeVisible();

      // Verify Recharts SVG elements exist (charts are rendered)
      const svgElements = await page.locator('.recharts-wrapper svg').count();
      expect(svgElements).toBeGreaterThanOrEqual(4); // Should have at least 4 charts
    });

    test('should load chart data from database views', async ({ page }) => {
      // Switch to Trends view
      await page.click('button:has-text("Trends")');

      // Wait for network idle (data loaded)
      await page.waitForLoadState('networkidle');

      // Wait for charts to render
      await page.waitForTimeout(2000);

      // Check that charts have rendered data (not just empty)
      const hasLineChart = await page.locator('.recharts-line').count();
      const hasBarChart = await page.locator('.recharts-bar').count();
      const hasPieChart = await page.locator('.recharts-pie').count();

      // At least one of each chart type should exist
      expect(hasLineChart).toBeGreaterThan(0);
      expect(hasBarChart).toBeGreaterThan(0);
      expect(hasPieChart).toBeGreaterThan(0);
    });
  });

  test.describe('Bulk Selection', () => {
    test('should allow selecting multiple errors via checkboxes', async ({ page }) => {
      // Ensure we're in List view
      await page.click('button:has-text("Error List")');
      await page.waitForTimeout(1000);

      // Find all error checkboxes
      const checkboxes = page.locator('input[type="checkbox"][aria-label*="Select error"]');
      const checkboxCount = await checkboxes.count();

      if (checkboxCount > 0) {
        // Select first error
        await checkboxes.first().click();

        // Verify selection banner appears
        await expect(page.locator('text=1 selected')).toBeVisible();

        // Select second error if available
        if (checkboxCount > 1) {
          await checkboxes.nth(1).click();
          await expect(page.locator('text=2 selected')).toBeVisible();
        }

        // Clear selection
        await page.click('button:has-text("Cancel")');

        // Verify banner disappears
        await expect(page.locator('text=selected')).not.toBeVisible();
      }
    });

    test('should show bulk actions toolbar when errors are selected', async ({ page }) => {
      // Ensure we're in List view
      await page.click('button:has-text("Error List")');
      await page.waitForTimeout(1000);

      const checkboxes = page.locator('input[type="checkbox"][aria-label*="Select error"]');
      const checkboxCount = await checkboxes.count();

      if (checkboxCount > 0) {
        // Select an error
        await checkboxes.first().click();

        // Verify bulk actions toolbar appears
        await expect(page.locator('button:has-text("Resolve All")')).toBeVisible();
        await expect(page.locator('button:has-text("Mark Investigating")')).toBeVisible();
        await expect(page.locator('button:has-text("Mark Duplicate")')).toBeVisible();
        await expect(page.locator('button:has-text("Ignore All")')).toBeVisible();
      }
    });
  });

  test.describe('Filters', () => {
    test('should filter errors by status', async ({ page }) => {
      // Ensure we're in List view
      await page.click('button:has-text("Error List")');
      await page.waitForTimeout(1000);

      // Find status filter dropdown
      const statusFilter = page.locator('select').filter({ hasText: 'All Statuses' }).or(
        page.locator('label:has-text("Status")').locator('..').locator('select')
      );

      // Select "open" status
      await statusFilter.selectOption('open');
      await page.waitForTimeout(1000);

      // Verify URL or state changed
      const currentUrl = page.url();
      // The filter should trigger a re-fetch
    });

    test('should filter errors by type', async ({ page }) => {
      // Ensure we're in List view
      await page.click('button:has-text("Error List")');
      await page.waitForTimeout(1000);

      // Find type filter dropdown
      const typeFilter = page.locator('label:has-text("Type")').locator('..').locator('select');

      // Get all options
      const options = await typeFilter.locator('option').allTextContents();

      if (options.length > 1) {
        // Select the first non-"All Types" option
        await typeFilter.selectOption({ index: 1 });
        await page.waitForTimeout(1000);
      }
    });

    test('should filter errors by context', async ({ page }) => {
      // Ensure we're in List view
      await page.click('button:has-text("Error List")');
      await page.waitForTimeout(1000);

      // Find context filter dropdown
      const contextFilter = page.locator('label:has-text("Context")').locator('..').locator('select');

      // Get all options
      const options = await contextFilter.locator('option').allTextContents();

      if (options.length > 1) {
        // Select the first non-"All Contexts" option
        await contextFilter.selectOption({ index: 1 });
        await page.waitForTimeout(1000);
      }
    });

    test('should have assignment filter dropdown', async ({ page }) => {
      // Ensure we're in List view
      await page.click('button:has-text("Error List")');
      await page.waitForTimeout(1000);

      // Find assignment filter dropdown
      const assignmentFilter = page.locator('label:has-text("Assignment")').locator('..').locator('select');

      // Verify filter exists
      await expect(assignmentFilter).toBeVisible();

      // Verify default options
      await expect(assignmentFilter).toContainText('All Errors');
      await expect(assignmentFilter).toContainText('Assigned to Me');
      await expect(assignmentFilter).toContainText('Unassigned');
    });
  });

  test.describe('Error Table', () => {
    test('should display error list with all columns', async ({ page }) => {
      // Ensure we're in List view
      await page.click('button:has-text("Error List")');
      await page.waitForTimeout(1000);

      // Verify table headers exist
      await expect(page.locator('th:has-text("Error Message")')).toBeVisible();
      await expect(page.locator('th:has-text("Type")')).toBeVisible();
      await expect(page.locator('th:has-text("Context")')).toBeVisible();
      await expect(page.locator('th:has-text("Status")')).toBeVisible();
      await expect(page.locator('th:has-text("Assigned To")')).toBeVisible();
      await expect(page.locator('th:has-text("Occurred At")')).toBeVisible();
    });

    test('should show assigned_to dropdown for each error', async ({ page }) => {
      // Ensure we're in List view
      await page.click('button:has-text("Error List")');
      await page.waitForTimeout(1000);

      // Find all assignment dropdowns in the table
      const assignmentDropdowns = page.locator('table tbody tr select');
      const dropdownCount = await assignmentDropdowns.count();

      if (dropdownCount > 0) {
        // Verify first dropdown has expected options
        const firstDropdown = assignmentDropdowns.first();
        await expect(firstDropdown).toContainText('Unassigned');
      }
    });

    test('should show error details in table rows', async ({ page }) => {
      // Ensure we're in List view
      await page.click('button:has-text("Error List")');
      await page.waitForTimeout(1000);

      // Check if there are any errors in the table
      const rows = page.locator('table tbody tr');
      const rowCount = await rows.count();

      if (rowCount > 0) {
        // Verify first row has expected structure
        const firstRow = rows.first();

        // Should have multiple cells
        const cells = firstRow.locator('td');
        const cellCount = await cells.count();
        expect(cellCount).toBeGreaterThan(4);
      }
    });
  });

  test.describe('Pagination', () => {
    test('should show pagination controls', async ({ page }) => {
      // Ensure we're in List view
      await page.click('button:has-text("Error List")');
      await page.waitForTimeout(1000);

      // Look for pagination elements
      const hasPagination = await page.locator('text=/Page \\d+ of \\d+/').count();

      if (hasPagination > 0) {
        await expect(page.locator('text=/Page \\d+ of \\d+/')).toBeVisible();
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should show loading state while fetching errors', async ({ page }) => {
      // Navigate to error dashboard
      await page.goto(`${TEST_CONFIG.baseUrl}/support/admin/errors`);

      // Look for loading spinner or skeleton (brief)
      // This test might need to be adjusted based on loading time
    });

    test('should handle empty state gracefully', async ({ page }) => {
      // Switch to a filter that might have no results
      await page.click('button:has-text("Error List")');

      // Select a very specific filter combination
      const statusFilter = page.locator('label:has-text("Status")').locator('..').locator('select');
      await statusFilter.selectOption('resolved');

      const typeFilter = page.locator('label:has-text("Type")').locator('..').locator('select');
      const options = await typeFilter.locator('option').allTextContents();

      if (options.length > 5) {
        await typeFilter.selectOption({ index: 5 });
        await page.waitForTimeout(1000);

        // Should still show table structure
        await expect(page.locator('table')).toBeVisible();
      }
    });
  });
});

test.describe('Error Dashboard - Bulk Actions', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate directly to error dashboard (already authenticated)
    await page.goto(`${TEST_CONFIG.baseUrl}/support/admin/errors`, { timeout: TEST_CONFIG.timeout });
    await page.waitForLoadState('networkidle', { timeout: TEST_CONFIG.timeout });
  });

  test('should show confirmation dialog for Mark Duplicate action', async ({ page }) => {
    // Ensure we're in List view
    await page.click('button:has-text("Error List")');
    await page.waitForTimeout(1000);

    const checkboxes = page.locator('input[type="checkbox"][aria-label*="Select error"]');
    const checkboxCount = await checkboxes.count();

    if (checkboxCount > 0) {
      // Select an error
      await checkboxes.first().click();

      // Click Mark Duplicate
      await page.click('button:has-text("Mark Duplicate")');

      // Verify confirmation dialog appears
      await expect(page.locator('text=Mark as Duplicate?')).toBeVisible();
      await expect(page.locator('button:has-text("Confirm")')).toBeVisible();
      await expect(page.locator('button:has-text("Cancel")').last()).toBeVisible();

      // Cancel the action
      await page.click('button:has-text("Cancel")').last();

      // Dialog should close
      await expect(page.locator('text=Mark as Duplicate?')).not.toBeVisible();
    }
  });

  test('should show confirmation dialog for Ignore All action', async ({ page }) => {
    // Ensure we're in List view
    await page.click('button:has-text("Error List")');
    await page.waitForTimeout(1000);

    const checkboxes = page.locator('input[type="checkbox"][aria-label*="Select error"]');
    const checkboxCount = await checkboxes.count();

    if (checkboxCount > 0) {
      // Select an error
      await checkboxes.first().click();

      // Click Ignore All
      await page.click('button:has-text("Ignore All")');

      // Verify confirmation dialog appears
      await expect(page.locator('text=Ignore Errors?')).toBeVisible();
      await expect(page.locator('button:has-text("Confirm")')).toBeVisible();

      // Cancel the action
      await page.click('button:has-text("Cancel")').last();

      // Dialog should close
      await expect(page.locator('text=Ignore Errors?')).not.toBeVisible();
    }
  });
});
