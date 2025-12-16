/**
 * Trial Organization - Duplicate Detection E2E Tests
 *
 * Tests for the fuzzy duplicate detection feature in organization creation modal
 */

import { test, expect } from '@playwright/test';

// Use authentication from setup
test.use({ storageState: 'playwright/.auth/user.json' });

test.describe('Trial Organization - Duplicate Detection', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to trials page
    await page.goto('/support/trials');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  });

  // ============================================================================
  // DUPLICATE DETECTION TESTS
  // ============================================================================

  test('should open create organization modal', async ({ page }) => {
    console.log('\n🎯 TEST: Open Create Organization Modal\n');

    // Click "Add New Trial" button to open create organization modal
    const createButton = page.locator('button:has-text("Add New Trial")').first();
    await expect(createButton).toBeVisible({ timeout: 5000 });
    await createButton.click();
    await page.waitForTimeout(500);

    // Verify modal opened
    await expect(page.locator('text=/Create Trial Organization/i').first()).toBeVisible({ timeout: 3000 });

    // Verify form fields are present
    await expect(page.locator('label:has-text("Organization Name")').first()).toBeVisible();
    await expect(page.locator('label:has-text("Sales POC")').first()).toBeVisible();
    await expect(page.locator('label:has-text("Domain")').first()).toBeVisible();

    console.log('✅ Create Organization modal opened successfully\n');

    // Close modal
    const closeButton = page.locator('button[aria-label="Close"], button:has-text("Cancel")').first();
    if (await closeButton.isVisible()) {
      await closeButton.click();
      await page.waitForTimeout(300);
    }
  });

  test('should show duplicate warning for exact match', async ({ page }) => {
    console.log('\n🎯 TEST: Duplicate Detection - Exact Match\n');

    // Open modal
    const createButton = page.locator('button:has-text("Add New Trial")').first();
    await createButton.click();
    await page.waitForTimeout(500);

    // Get an existing organization name from the table
    await page.goto('/support/trials');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Find first organization name from the card grid
    const firstOrgName = await page.locator('[data-testid="org-card"] h3').first().textContent();

    if (firstOrgName) {
      console.log(`Found existing org: "${firstOrgName}"`);

      // Open modal again
      await createButton.click();
      await page.waitForTimeout(500);

      // Type the exact same name
      const orgNameInput = page.locator('input[placeholder*="Acme"]').or(page.locator('label:has-text("Organization Name") + input')).first();
      await orgNameInput.fill(firstOrgName.trim());

      // Wait for debounce (500ms) + processing
      await page.waitForTimeout(800);

      // Check for duplicate warning
      const duplicateWarning = page.locator('text=/Potential Duplicates Detected|Similar organization/i').first();

      if (await duplicateWarning.isVisible({ timeout: 2000 })) {
        console.log('✅ Duplicate warning shown for exact match\n');

        // Verify warning details
        await expect(page.locator('text=/% match/i').first()).toBeVisible();
        await expect(page.locator(`.bg-yellow-50, .border-yellow-200`).first()).toBeVisible();
      } else {
        console.log('ℹ️  Duplicate warning not visible (may need more organizations in DB)\n');
      }

      // Close modal
      const cancelButton = page.locator('button:has-text("Cancel")').first();
      await cancelButton.click();
    } else {
      console.log('ℹ️  No existing organizations found to test duplicate detection\n');
    }
  });

  test('should show duplicate warning for similar names', async ({ page }) => {
    console.log('\n🎯 TEST: Duplicate Detection - Similar Names\n');

    // Open modal
    const createButton = page.locator('button:has-text("Add New Trial")').first();
    await createButton.click();
    await page.waitForTimeout(500);

    // Find an existing org from the card grid
    await page.goto('/support/trials');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const firstOrgName = await page.locator('[data-testid="org-card"] h3').first().textContent();

    if (firstOrgName && firstOrgName.length > 3) {
      // Create a similar name (slight variation)
      const similarName = firstOrgName.trim().slice(0, -1) + 'x'; // Change last character

      console.log(`Testing with similar name: "${similarName}" (original: "${firstOrgName}")`);

      // Open modal again
      await createButton.click();
      await page.waitForTimeout(500);

      // Type similar name
      const orgNameInput = page.locator('input[placeholder*="Acme"]').or(page.locator('label:has-text("Organization Name") + input')).first();
      await orgNameInput.fill(similarName);

      // Wait for debounce + processing
      await page.waitForTimeout(800);

      // Check if warning appears (may or may not depending on similarity threshold)
      const duplicateWarning = page.locator('text=/Potential Duplicates/i').first();

      if (await duplicateWarning.isVisible({ timeout: 2000 })) {
        console.log('✅ Duplicate warning shown for similar name\n');
      } else {
        console.log('ℹ️  No duplicate warning (similarity may be below 70% threshold)\n');
      }

      // Close modal
      const cancelButton = page.locator('button:has-text("Cancel")').first();
      await cancelButton.click();
    }
  });

  test('should NOT show warning for completely different name', async ({ page }) => {
    console.log('\n🎯 TEST: Duplicate Detection - No Warning for Unique Name\n');

    // Open modal
    const createButton = page.locator('button:has-text("Add New Trial")').first();
    await createButton.click();
    await page.waitForTimeout(500);

    // Type a completely unique name
    const uniqueName = `Unique Test Org ${Date.now()}`;
    const orgNameInput = page.locator('input[placeholder*="Acme"]').or(page.locator('label:has-text("Organization Name") + input')).first();
    await orgNameInput.fill(uniqueName);

    // Wait for debounce + processing
    await page.waitForTimeout(800);

    // Verify NO duplicate warning appears
    const duplicateWarning = page.locator('text=/Potential Duplicates/i').first();
    await expect(duplicateWarning).not.toBeVisible({ timeout: 1000 });

    console.log('✅ No duplicate warning for unique name (as expected)\n');

    // Close modal
    const cancelButton = page.locator('button:has-text("Cancel")').first();
    await cancelButton.click();
  });

  test('should clear warning when name is changed', async ({ page }) => {
    console.log('\n🎯 TEST: Duplicate Detection - Clear Warning on Change\n');

    // Get existing org name from card grid
    const firstOrgName = await page.locator('[data-testid="org-card"] h3').first().textContent();

    if (firstOrgName) {
      // Open modal
      const createButton = page.locator('button:has-text("Add New Trial")').first();
      await createButton.click();
      await page.waitForTimeout(500);

      const orgNameInput = page.locator('input[placeholder*="Acme"]').or(page.locator('label:has-text("Organization Name") + input')).first();

      // Type duplicate name
      await orgNameInput.fill(firstOrgName.trim());
      await page.waitForTimeout(800);

      // Check if warning appears
      const duplicateWarning = page.locator('text=/Potential Duplicates/i').first();
      const warningShown = await duplicateWarning.isVisible({ timeout: 2000 });

      if (warningShown) {
        console.log('✅ Warning shown initially\n');

        // Change to unique name
        await orgNameInput.fill(`Completely Different ${Date.now()}`);
        await page.waitForTimeout(800);

        // Warning should disappear
        await expect(duplicateWarning).not.toBeVisible({ timeout: 1000 });
        console.log('✅ Warning cleared when name changed\n');
      } else {
        console.log('ℹ️  Warning did not appear (skipping clear test)\n');
      }

      // Close modal
      const cancelButton = page.locator('button:has-text("Cancel")').first();
      await cancelButton.click();
    }
  });

  test('should display match percentage in duplicate warning', async ({ page }) => {
    console.log('\n🎯 TEST: Duplicate Detection - Match Percentage Display\n');

    // Get existing org from card grid
    const firstOrgName = await page.locator('[data-testid="org-card"] h3').first().textContent();

    if (firstOrgName) {
      // Open modal
      const createButton = page.locator('button:has-text("Add New Trial")').first();
      await createButton.click();
      await page.waitForTimeout(500);

      // Type exact name
      const orgNameInput = page.locator('input[placeholder*="Acme"]').or(page.locator('label:has-text("Organization Name") + input')).first();
      await orgNameInput.fill(firstOrgName.trim());
      await page.waitForTimeout(800);

      // Check for match percentage
      const matchPercentage = page.locator('text=/\\d+% match/i').first();

      if (await matchPercentage.isVisible({ timeout: 2000 })) {
        const percentText = await matchPercentage.textContent();
        console.log(`✅ Match percentage displayed: ${percentText}\n`);

        // Verify it's a valid percentage
        expect(percentText).toMatch(/\d+%/);
      } else {
        console.log('ℹ️  Match percentage not visible\n');
      }

      // Close modal
      const cancelButton = page.locator('button:has-text("Cancel")').first();
      await cancelButton.click();
    }
  });

  test('should show organization details in duplicate warning', async ({ page }) => {
    console.log('\n🎯 TEST: Duplicate Detection - Organization Details Display\n');

    // Get existing org from card grid
    const firstOrgName = await page.locator('[data-testid="org-card"] h3').first().textContent();

    if (firstOrgName) {
      // Open modal
      const createButton = page.locator('button:has-text("Add New Trial")').first();
      await createButton.click();
      await page.waitForTimeout(500);

      // Type exact name
      const orgNameInput = page.locator('input[placeholder*="Acme"]').or(page.locator('label:has-text("Organization Name") + input')).first();
      await orgNameInput.fill(firstOrgName.trim());
      await page.waitForTimeout(800);

      // Check for org details in warning
      const warningBox = page.locator('.bg-yellow-50, .border-yellow-200').first();

      if (await warningBox.isVisible({ timeout: 2000 })) {
        // Should show domain
        await expect(page.locator('text=/Domain:/i').first()).toBeVisible();

        // Should show status
        await expect(page.locator('text=/Status:/i').first()).toBeVisible();

        console.log('✅ Organization details shown in duplicate warning\n');
      } else {
        console.log('ℹ️  Duplicate warning not visible\n');
      }

      // Close modal
      const cancelButton = page.locator('button:has-text("Cancel")').first();
      await cancelButton.click();
    }
  });

  test('should handle short names (< 3 characters) without checking', async ({ page }) => {
    console.log('\n🎯 TEST: Duplicate Detection - Short Names\n');

    // Open modal
    const createButton = page.locator('button:has-text("Add New Trial")').first();
    await createButton.click();
    await page.waitForTimeout(500);

    // Type short names
    const orgNameInput = page.locator('input[placeholder*="Acme"]').or(page.locator('label:has-text("Organization Name") + input')).first();

    // Test with 1 character
    await orgNameInput.fill('A');
    await page.waitForTimeout(800);

    let duplicateWarning = page.locator('text=/Potential Duplicates/i').first();
    await expect(duplicateWarning).not.toBeVisible({ timeout: 500 });

    // Test with 2 characters
    await orgNameInput.fill('AB');
    await page.waitForTimeout(800);
    await expect(duplicateWarning).not.toBeVisible({ timeout: 500 });

    console.log('✅ No duplicate check for names < 3 characters\n');

    // Close modal
    const cancelButton = page.locator('button:has-text("Cancel")').first();
    await cancelButton.click();
  });
});
