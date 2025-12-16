/**
 * Accessibility Tests - WCAG Compliance
 *
 * Uses axe-core to scan critical pages for accessibility violations
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Use authentication from setup
test.use({ storageState: 'playwright/.auth/user.json' });

test.describe('Accessibility Tests', () => {

  test('should have no accessibility violations on trials page', async ({ page }) => {
    console.log('\n🎯 ACCESSIBILITY TEST: Trials Page\n');

    // Navigate to trials page
    await page.goto('/support/trials');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Run axe accessibility scan
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    console.log(`Found ${accessibilityScanResults.violations.length} accessibility violations\n`);

    if (accessibilityScanResults.violations.length > 0) {
      console.log('Violations:');
      accessibilityScanResults.violations.forEach((violation, index) => {
        console.log(`\n${index + 1}. ${violation.id}: ${violation.description}`);
        console.log(`   Impact: ${violation.impact}`);
        console.log(`   Help: ${violation.helpUrl}`);
        console.log(`   Affected elements: ${violation.nodes.length}`);
      });
    }

    // Assert no violations
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have no accessibility violations on create organization modal', async ({ page }) => {
    console.log('\n🎯 ACCESSIBILITY TEST: Create Organization Modal\n');

    // Navigate to trials page
    await page.goto('/support/trials');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Open create organization modal
    const createButton = page.locator('button:has-text("Add New Trial")').first();
    await createButton.click();
    await page.waitForTimeout(500);

    // Wait for modal to be visible
    await expect(page.locator('text=/Create Trial Organization/i').first()).toBeVisible({ timeout: 3000 });

    // Run axe accessibility scan on modal
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    console.log(`Found ${accessibilityScanResults.violations.length} accessibility violations\n`);

    if (accessibilityScanResults.violations.length > 0) {
      console.log('Violations:');
      accessibilityScanResults.violations.forEach((violation, index) => {
        console.log(`\n${index + 1}. ${violation.id}: ${violation.description}`);
        console.log(`   Impact: ${violation.impact}`);
        console.log(`   Help: ${violation.helpUrl}`);
        console.log(`   Affected elements: ${violation.nodes.length}`);
      });
    }

    // Assert no violations
    expect(accessibilityScanResults.violations).toEqual([]);

    // Close modal
    const cancelButton = page.locator('button:has-text("Cancel")').first();
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
    }
  });

  test('should have no accessibility violations on organization details page', async ({ page }) => {
    console.log('\n🎯 ACCESSIBILITY TEST: Organization Details Page\n');

    // Navigate to trials page
    await page.goto('/support/trials');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Click on first organization card to open details
    const firstOrgCard = page.locator('[data-testid="org-card"]').first();

    if (await firstOrgCard.isVisible()) {
      await firstOrgCard.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Run axe accessibility scan
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      console.log(`Found ${accessibilityScanResults.violations.length} accessibility violations\n`);

      if (accessibilityScanResults.violations.length > 0) {
        console.log('Violations:');
        accessibilityScanResults.violations.forEach((violation, index) => {
          console.log(`\n${index + 1}. ${violation.id}: ${violation.description}`);
          console.log(`   Impact: ${violation.impact}`);
          console.log(`   Help: ${violation.helpUrl}`);
          console.log(`   Affected elements: ${violation.nodes.length}`);
        });
      }

      // Assert no violations
      expect(accessibilityScanResults.violations).toEqual([]);
    } else {
      console.log('ℹ️  No organization cards found, skipping test\n');
    }
  });

  test('should have no accessibility violations on bulk activity modal', async ({ page }) => {
    console.log('\n🎯 ACCESSIBILITY TEST: Bulk Activity Modal\n');

    // Navigate to trials page
    await page.goto('/support/trials');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Find first organization card
    const firstOrgCard = page.locator('[data-testid="org-card"]').first();

    if (await firstOrgCard.isVisible()) {
      // Look for bulk activity button/icon
      const bulkActivityButton = page.locator('button:has-text("Bulk Activity"), [aria-label*="bulk"], [title*="bulk"]').first();

      if (await bulkActivityButton.isVisible({ timeout: 2000 })) {
        await bulkActivityButton.click();
        await page.waitForTimeout(500);

        // Run axe accessibility scan on modal
        const accessibilityScanResults = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .analyze();

        console.log(`Found ${accessibilityScanResults.violations.length} accessibility violations\n`);

        if (accessibilityScanResults.violations.length > 0) {
          console.log('Violations:');
          accessibilityScanResults.violations.forEach((violation, index) => {
            console.log(`\n${index + 1}. ${violation.id}: ${violation.description}`);
            console.log(`   Impact: ${violation.impact}`);
            console.log(`   Help: ${violation.helpUrl}`);
            console.log(`   Affected elements: ${violation.nodes.length}`);
          });
        }

        // Assert no violations
        expect(accessibilityScanResults.violations).toEqual([]);
      } else {
        console.log('ℹ️  Bulk activity button not found, skipping test\n');
      }
    } else {
      console.log('ℹ️  No organization cards found, skipping test\n');
    }
  });

  test('should have no accessibility violations on dashboard home', async ({ page }) => {
    console.log('\n🎯 ACCESSIBILITY TEST: Dashboard Home\n');

    // Navigate to dashboard home
    await page.goto('/support');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Run axe accessibility scan
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    console.log(`Found ${accessibilityScanResults.violations.length} accessibility violations\n`);

    if (accessibilityScanResults.violations.length > 0) {
      console.log('Violations:');
      accessibilityScanResults.violations.forEach((violation, index) => {
        console.log(`\n${index + 1}. ${violation.id}: ${violation.description}`);
        console.log(`   Impact: ${violation.impact}`);
        console.log(`   Help: ${violation.helpUrl}`);
        console.log(`   Affected elements: ${violation.nodes.length}`);
      });
    }

    // Assert no violations
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
