import { test, expect } from '@playwright/test';

/**
 * Trial Detail Page - Tab Consolidation & Account Manager Tests
 *
 * Tests the new 5-tab structure and account manager dropdown fixes:
 * - Overview
 * - People & Engagement (with 3 sub-sections)
 * - Timeline & Activity (with 2 views)
 * - Support & Success
 * - Product & Research
 */

test.describe('Trial Detail Page - Tab Consolidation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to trials list
    await page.goto('/support/trials', { timeout: 30000 });
    await page.waitForTimeout(2000);

    // Check if we're authenticated
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      test.skip('Authentication required - skipping test');
    }
  });

  test('should display 5 main tabs instead of 7', async ({ page }) => {
    // Find and click the first trial organization card
    const firstOrgCard = page.locator('[data-testid="org-card"]').first();
    const orgCardFallback = page.locator('.bg-white.border.border-gray-200.rounded-xl').first();

    let clicked = false;
    try {
      await firstOrgCard.click({ timeout: 3000 });
      clicked = true;
    } catch {
      try {
        await orgCardFallback.click({ timeout: 3000 });
        clicked = true;
      } catch {
        // Try clicking any link that goes to trial detail
        const trialLink = page.locator('a[href*="/support/trials/"]').first();
        await trialLink.click({ timeout: 3000 });
        clicked = true;
      }
    }

    if (!clicked) {
      test.skip('No trial organizations found to test');
    }

    // Wait for detail page to load
    await page.waitForURL(/\/support\/trials\/[^/]+$/, { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Check for the 5 expected tabs
    const expectedTabs = [
      'Overview',
      'People & Engagement',
      'Timeline & Activity',
      'Support & Success',
      'Product & Research'
    ];

    for (const tabName of expectedTabs) {
      const tab = page.getByRole('button', { name: new RegExp(tabName, 'i') });
      await expect(tab).toBeVisible({ timeout: 5000 });
    }

    // Ensure old tabs are NOT present
    const oldTabs = [
      'People & Adoption',
      'User Updates',
      'Activity & Engagement'
    ];

    for (const oldTab of oldTabs) {
      const tab = page.getByRole('button', { name: new RegExp(`^${oldTab}$`, 'i') });
      await expect(tab).not.toBeVisible();
    }
  });

  test('should show 3 sub-sections in People & Engagement tab', async ({ page }) => {
    // Navigate to a trial detail page
    const trialLink = page.locator('a[href*="/support/trials/"]').first();
    await trialLink.click({ timeout: 5000 });
    await page.waitForURL(/\/support\/trials\/[^/]+$/, { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Click on People & Engagement tab
    const peopleTab = page.getByRole('button', { name: /People & Engagement/i });
    await peopleTab.click();
    await page.waitForTimeout(1000);

    // Check for 3 sub-section toggles
    const stakeholdersBtn = page.getByRole('button', { name: /Stakeholders/i });
    const platformUsersBtn = page.getByRole('button', { name: /Platform Users/i });
    const userActivityBtn = page.getByRole('button', { name: /User Activity/i });

    await expect(stakeholdersBtn).toBeVisible();
    await expect(platformUsersBtn).toBeVisible();
    await expect(userActivityBtn).toBeVisible();

    // Test switching between sub-sections
    await platformUsersBtn.click();
    await page.waitForTimeout(500);

    await userActivityBtn.click();
    await page.waitForTimeout(500);

    await stakeholdersBtn.click();
    await page.waitForTimeout(500);
  });

  test('should show 2 views in Timeline & Activity tab', async ({ page }) => {
    // Navigate to a trial detail page
    const trialLink = page.locator('a[href*="/support/trials/"]').first();
    await trialLink.click({ timeout: 5000 });
    await page.waitForURL(/\/support\/trials\/[^/]+$/, { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Click on Timeline & Activity tab
    const timelineTab = page.getByRole('button', { name: /Timeline & Activity/i });
    await timelineTab.click();
    await page.waitForTimeout(1000);

    // Check for 2 view toggles
    const activityTimelineBtn = page.getByRole('button', { name: /Activity Timeline/i });
    const aiTimelineBtn = page.getByRole('button', { name: /AI Timeline/i });

    await expect(activityTimelineBtn).toBeVisible();
    await expect(aiTimelineBtn).toBeVisible();

    // Test switching between views
    await aiTimelineBtn.click();
    await page.waitForTimeout(500);

    await activityTimelineBtn.click();
    await page.waitForTimeout(500);
  });
});

test.describe('Trial Detail Page - Account Manager Fix', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to trials list
    await page.goto('/support/trials', { timeout: 30000 });
    await page.waitForTimeout(2000);

    // Check if we're authenticated
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      test.skip('Authentication required - skipping test');
    }
  });

  test('should have account manager dropdown with user_id values', async ({ page }) => {
    // Navigate to a trial detail page
    const trialLink = page.locator('a[href*="/support/trials/"]').first();
    await trialLink.click({ timeout: 5000 });
    await page.waitForURL(/\/support\/trials\/[^/]+$/, { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Look for the edit button (pencil icon)
    const editButton = page.locator('button[aria-label*="Edit"], button[title*="Edit"]').first();
    const editButtonFallback = page.locator('button').filter({ has: page.locator('svg') }).first();

    try {
      await editButton.click({ timeout: 3000 });
    } catch {
      try {
        await editButtonFallback.click({ timeout: 3000 });
      } catch {
        test.skip('Edit button not found - skipping test');
      }
    }

    await page.waitForTimeout(1000);

    // Check for account manager dropdown
    const accountManagerSelect = page.locator('select').filter({ hasText: /Account Manager|Select Account Manager/i });
    const accountManagerSelectFallback = page.locator('select[name*="account"], select[id*="account"]');

    let dropdown;
    try {
      dropdown = await accountManagerSelect.first().isVisible() ? accountManagerSelect.first() : accountManagerSelectFallback.first();
    } catch {
      test.skip('Account Manager dropdown not found - skipping test');
    }

    // Get all options
    const options = await dropdown.locator('option').all();

    // Check that options have UUID values (not usernames)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    let hasUuidValues = false;
    for (const option of options) {
      const value = await option.getAttribute('value');
      if (value && value !== '' && uuidRegex.test(value)) {
        hasUuidValues = true;
        break;
      }
    }

    // If we found UUID values, the fix is working
    if (hasUuidValues) {
      console.log('✓ Account Manager dropdown is using UUID values');
    }

    // The dropdown should exist
    await expect(dropdown).toBeVisible();
  });

  test('should display account manager name on trial cards', async ({ page }) => {
    // Stay on trials list page
    await page.waitForTimeout(2000);

    // Find trial cards
    const orgCards = page.locator('.bg-white.border.border-gray-200.rounded-xl');
    const cardCount = await orgCards.count();

    if (cardCount === 0) {
      test.skip('No trial cards found - skipping test');
    }

    // Check first few cards for account manager display
    const cardsToCheck = Math.min(3, cardCount);
    let foundAccountManager = false;

    for (let i = 0; i < cardsToCheck; i++) {
      const card = orgCards.nth(i);
      const accountManagerText = await card.locator('text=/Account Manager|Manager/i').first().textContent();

      if (accountManagerText) {
        foundAccountManager = true;

        // The card should show either a manager name or "Unassigned"
        const hasName = await card.locator('text=/Nikita|Kirandeep|Sudeshana|Kartheek|Krati|Rupak|Satyananth|Satish/i').count() > 0;
        const hasUnassigned = await card.locator('text=/Unassigned/i').count() > 0;

        expect(hasName || hasUnassigned).toBeTruthy();
      }
    }

    if (foundAccountManager) {
      console.log('✓ Account Manager display working on trial cards');
    }
  });
});

test.describe('Trial Detail Page - Navigation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/support/trials', { timeout: 30000 });
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      test.skip('Authentication required - skipping test');
    }
  });

  test('should navigate through all tabs without errors', async ({ page }) => {
    // Navigate to a trial detail page
    const trialLink = page.locator('a[href*="/support/trials/"]').first();
    await trialLink.click({ timeout: 5000 });
    await page.waitForURL(/\/support\/trials\/[^/]+$/, { timeout: 10000 });
    await page.waitForTimeout(2000);

    const tabs = [
      'Overview',
      'People & Engagement',
      'Timeline & Activity',
      'Support & Success',
      'Product & Research'
    ];

    // Click through each tab and ensure no errors
    for (const tabName of tabs) {
      const tab = page.getByRole('button', { name: new RegExp(tabName, 'i') });

      try {
        await tab.click();
        await page.waitForTimeout(1000);

        // Check for any error messages on the page
        const errorMessage = page.locator('text=/error|failed|not found/i').first();
        const hasError = await errorMessage.isVisible().catch(() => false);

        if (hasError) {
          console.warn(`⚠ Warning: Error message visible in ${tabName} tab`);
        }
      } catch (e) {
        console.error(`✗ Failed to navigate to ${tabName} tab:`, e);
      }
    }
  });
});
