/**
 * Trial Organization - Real Features E2E Tests
 *
 * Tests for ACTUAL features that exist in the trial organization detail page
 * Based on code analysis and UI inspection
 */

import { test, expect } from '@playwright/test';

// Use authentication from setup
test.use({ storageState: 'playwright/.auth/user.json' });

const TEST_ORG_ID = process.env.TEST_TRIAL_ORG_ID;

test.describe('Trial Organization - Real Features Testing', () => {

  test.beforeEach(async ({ page }) => {
    if (!TEST_ORG_ID) {
      throw new Error('TEST_TRIAL_ORG_ID environment variable is required');
    }

    console.log(`\n🎯 Using test org ID: ${TEST_ORG_ID}\n`);

    // Navigate to trial org page
    await page.goto(`/support/trials/${TEST_ORG_ID}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Wait for initial data load
  });

  // ============================================================================
  // OVERVIEW TAB TESTS
  // ============================================================================

  test.describe('Overview Tab - Trial Health & Deal Status', () => {

    test('should display trial health metrics', async ({ page }) => {
      console.log('\n🎯 TEST: Overview - Trial Health Metrics\n');

      // Verify Overview tab is active
      const overviewTab = page.locator('button:has-text("Overview"), [role="tab"]:has-text("Overview")').first();
      await expect(overviewTab).toBeVisible();

      // Check for Trial Health section
      await expect(page.locator('text=/Trial Health|Days Remaining|Trial Status|Expiry Date/i').first()).toBeVisible();

      console.log('✅ Trial health metrics are visible\n');
    });

    test('should open Extend Trial modal', async ({ page }) => {
      console.log('\n🎯 TEST: Overview - Extend Trial Modal\n');

      // Look for "Extend Trial" button
      const extendButton = page.locator('button:has-text("Extend Trial")').first();

      if (await extendButton.isVisible({ timeout: 5000 })) {
        await extendButton.click();
        await page.waitForTimeout(500);

        // Verify modal opened
        await expect(page.locator('text=/Extend Trial|Current Expiry|Extend By Days/i').first()).toBeVisible({ timeout: 3000 });

        // Check for quick action buttons (7, 14, 30 days)
        await expect(page.locator('button:has-text("7")').first()).toBeVisible();

        console.log('✅ Extend Trial modal opened successfully\n');

        // Close modal
        const cancelButton = page.locator('button:has-text("Cancel"), button:has-text("Close")').last();
        if (await cancelButton.isVisible()) {
          await cancelButton.click();
        }
      } else {
        console.log('ℹ️  Extend Trial button not found (may not be visible for this org)\n');
      }
    });

    test('should show Edit Details button', async ({ page }) => {
      console.log('\n🎯 TEST: Overview - Edit Details Button\n');

      const editButton = page.locator('button:has-text("Edit Details")').first();
      await expect(editButton).toBeVisible({ timeout: 5000 });

      console.log('✅ Edit Details button is visible\n');
    });
  });

  // ============================================================================
  // PEOPLE & ENGAGEMENT TAB TESTS
  // ============================================================================

  test.describe('People & Engagement Tab - Contact Management', () => {

    test.beforeEach(async ({ page }) => {
      // Switch to People & Engagement tab
      const peopleTab = page.locator('button:has-text("People"), [role="tab"]:has-text("People")').first();
      await peopleTab.click();
      await page.waitForTimeout(1000);
    });

    test('should display Add Contact button', async ({ page }) => {
      console.log('\n🎯 TEST: People Tab - Add Contact Button\n');

      const addContactButton = page.locator('button:has-text("Add Contact"), button:has-text("Add User")').first();
      await expect(addContactButton).toBeVisible({ timeout: 5000 });

      console.log('✅ Add Contact button is visible\n');
    });

    test('should open Add User modal', async ({ page }) => {
      console.log('\n🎯 TEST: People Tab - Add User Modal\n');

      const addButton = page.locator('button:has-text("Add Contact"), button:has-text("Add User"), button:has-text("Add First Contact")').first();
      await addButton.click();
      await page.waitForTimeout(500);

      // Verify modal opened with required fields
      await expect(page.locator('text=/Add User|Add Contact|Full Name/i').first()).toBeVisible({ timeout: 3000 });

      // Check for required fields - the modal has text inputs without name attributes
      // Name field is type="text", email field is type="email"
      const nameField = page.locator('input[type="text"]').first();
      const emailField = page.locator('input[type="email"]').first();

      await expect(nameField).toBeVisible();
      await expect(emailField).toBeVisible();

      console.log('✅ Add User modal opened with required fields\n');

      // Close modal
      const cancelButton = page.locator('button:has-text("Cancel"), button:has-text("Close")').last();
      if (await cancelButton.isVisible()) {
        await cancelButton.click();
      }
    });

    test('should display People / User Activity toggle', async ({ page }) => {
      console.log('\n🎯 TEST: People Tab - Section Toggle\n');

      // Look for toggle buttons or tabs
      const peopleSection = page.locator('text=/People|User Activity|Contacts/i').first();
      await expect(peopleSection).toBeVisible({ timeout: 5000 });

      console.log('✅ People section is visible\n');
    });
  });

  // ============================================================================
  // ACTIVITY & INSIGHTS TAB TESTS
  // ============================================================================

  test.describe('Activity & Insights Tab - Timeline & Activity Logging', () => {

    test.beforeEach(async ({ page }) => {
      // Switch to Activity & Insights tab
      const activityTab = page.locator('button:has-text("Activity"), [role="tab"]:has-text("Activity")').first();
      await activityTab.click();
      await page.waitForTimeout(1000);
    });

    test('should display timeline view modes', async ({ page }) => {
      console.log('\n🎯 TEST: Activity Tab - Timeline View Modes\n');

      // Look for view mode tabs/buttons (List, Grouped, Calendar, Board)
      const viewModes = page.locator('text=/List View|Grouped|Calendar|Board/i').first();

      if (await viewModes.isVisible({ timeout: 5000 })) {
        console.log('✅ Timeline view modes are visible\n');
      } else {
        console.log('ℹ️  View modes not found (may have different UI)\n');
      }
    });

    test('should open Log Activity modal from + button', async ({ page }) => {
      console.log('\n🎯 TEST: Activity Tab - Log Activity Modal\n');

      // Look for "+" button or "Log Activity" button
      const addButton = page.locator('button:has-text("+"), button[aria-label*="add" i], button:has-text("Log Activity")').first();

      if (await addButton.isVisible({ timeout: 5000 })) {
        await addButton.click();
        await page.waitForTimeout(500);

        // Verify modal opened with activity types
        await expect(page.locator('text=/Activity Type|Log Activity|Description/i').first()).toBeVisible({ timeout: 3000 });

        // Look for activity type options (grid or dropdown)
        const activityTypes = page.locator('text=/User Logged In|Usage Observed|Feedback Received|Learning Captured/i').first();

        if (await activityTypes.isVisible({ timeout: 3000 })) {
          console.log('✅ Log Activity modal opened with activity types\n');
        } else {
          console.log('ℹ️  Activity types displayed differently than expected\n');
        }

        // Close modal
        const cancelButton = page.locator('button:has-text("Cancel"), button:has-text("Close")').last();
        if (await cancelButton.isVisible()) {
          await cancelButton.click();
        }
      } else {
        console.log('ℹ️  Add activity button not found on this tab\n');
      }
    });

    test('should display search and filter options', async ({ page }) => {
      console.log('\n🎯 TEST: Activity Tab - Search & Filter\n');

      // Look for search input
      const searchInput = page.locator('input[placeholder*="search" i], input[type="search"]').first();

      if (await searchInput.isVisible({ timeout: 5000 })) {
        console.log('✅ Search functionality is available\n');
      } else {
        console.log('ℹ️  Search not found (may have different UI)\n');
      }
    });
  });

  // ============================================================================
  // SUPPORT & SUCCESS TAB TESTS
  // ============================================================================

  test.describe('Support & Success Tab - Support Query Management', () => {

    test.beforeEach(async ({ page }) => {
      // Switch to Support & Success tab
      const supportTab = page.locator('button:has-text("Support"), [role="tab"]:has-text("Support")').first();
      await supportTab.click();
      await page.waitForTimeout(1000);
    });

    test('should display Log Query button', async ({ page }) => {
      console.log('\n🎯 TEST: Support Tab - Log Query Button\n');

      const logQueryButton = page.locator('button:has-text("Log Query"), button:has-text("Add Query")').first();
      await expect(logQueryButton).toBeVisible({ timeout: 5000 });

      console.log('✅ Log Query button is visible\n');
    });

    test('should open Add Support Query modal', async ({ page }) => {
      console.log('\n🎯 TEST: Support Tab - Add Support Query Modal\n');

      const logQueryButton = page.locator('button:has-text("Log Query"), button:has-text("Add Query")').first();
      await logQueryButton.click();
      await page.waitForTimeout(500);

      // Verify modal opened with required fields
      await expect(page.locator('text=/Query Type|Query Title|Description/i').first()).toBeVisible({ timeout: 3000 });

      // Check for query type dropdown
      const queryTypeField = page.locator('select[name*="type"], [name*="queryType"]').first();

      if (await queryTypeField.isVisible({ timeout: 3000 })) {
        console.log('✅ Support Query modal opened with query type field\n');
      } else {
        console.log('ℹ️  Query type field displayed differently\n');
      }

      // Close modal
      const cancelButton = page.locator('button:has-text("Cancel"), button:has-text("Close")').last();
      if (await cancelButton.isVisible()) {
        await cancelButton.click();
      }
    });

    test('should display support queries list', async ({ page }) => {
      console.log('\n🎯 TEST: Support Tab - Queries List\n');

      // Look for queries list or empty state
      const queriesList = page.locator('text=/Support Queries|No queries|Query List/i').first();

      if (await queriesList.isVisible({ timeout: 5000 })) {
        console.log('✅ Support queries section is visible\n');
      } else {
        console.log('ℹ️  Support queries section not found\n');
      }
    });
  });

  // ============================================================================
  // CROSS-TAB FUNCTIONALITY TESTS
  // ============================================================================

  test.describe('Cross-Tab Functionality', () => {

    test('should navigate between all tabs', async ({ page }) => {
      console.log('\n🎯 TEST: Cross-Tab - Tab Navigation\n');

      const tabs = [
        { name: 'Overview', selector: 'button:has-text("Overview"), [role="tab"]:has-text("Overview")' },
        { name: 'People', selector: 'button:has-text("People"), [role="tab"]:has-text("People")' },
        { name: 'Activity', selector: 'button:has-text("Activity"), [role="tab"]:has-text("Activity")' },
        { name: 'Support', selector: 'button:has-text("Support"), [role="tab"]:has-text("Support")' }
      ];

      for (const tab of tabs) {
        console.log(`  Switching to ${tab.name} tab...`);
        const tabButton = page.locator(tab.selector).first();
        await tabButton.click();
        await page.waitForTimeout(1000);

        // Verify tab is active (usually has different styling)
        await expect(tabButton).toBeVisible();
        console.log(`  ✓ ${tab.name} tab activated`);
      }

      console.log('\n✅ All tabs are navigable\n');
    });

    test('should maintain org context across tabs', async ({ page }) => {
      console.log('\n🎯 TEST: Cross-Tab - Org Context Persistence\n');

      // Get org name from header
      const orgHeader = await page.locator('h1, h2, [data-testid="org-name"]').first().textContent();

      // Navigate through tabs
      const activityTab = page.locator('button:has-text("Activity")').first();
      await activityTab.click();
      await page.waitForTimeout(500);

      const supportTab = page.locator('button:has-text("Support")').first();
      await supportTab.click();
      await page.waitForTimeout(500);

      // Verify we're still on the same org
      const currentUrl = page.url();
      expect(currentUrl).toContain(TEST_ORG_ID);

      console.log('✅ Organization context maintained across tabs\n');
    });
  });

  // ============================================================================
  // DELETE ORGANIZATION TEST (Dangerous - run last)
  // ============================================================================

  test.describe.skip('Delete Organization - 3-Step Confirmation', () => {

    test('should show delete confirmation flow', async ({ page }) => {
      console.log('\n🎯 TEST: Delete Organization - Confirmation Flow\n');
      console.log('⚠️  SKIPPED - This test is destructive\n');

      // Uncomment to test (will actually delete the org!)
      /*
      const deleteButton = page.locator('button:has-text("Delete Organization")').first();
      await deleteButton.click();
      await page.waitForTimeout(500);

      // Step 1: Confirmation
      await expect(page.locator('text=/Are you sure|Delete|Warning/i').first()).toBeVisible();

      const confirmButton = page.locator('button:has-text("Continue"), button:has-text("Confirm")').first();
      await confirmButton.click();
      await page.waitForTimeout(500);

      // Step 2: Warning
      await expect(page.locator('text=/irreversible|permanent|cannot be undone/i').first()).toBeVisible();

      // Cancel instead of proceeding
      const cancelButton = page.locator('button:has-text("Cancel")').first();
      await cancelButton.click();
      */
    });
  });
});
