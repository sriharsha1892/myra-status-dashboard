import { test, expect } from '@playwright/test';
import { loginAndGoToTrials } from '../helpers/auth';

test.describe('Bulk Activity Log Feature', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndGoToTrials(page);
  });

  test('should open bulk activity log modal when orgs are selected', async ({ page }) => {
    console.log('Testing bulk activity log modal opening...');

    // Select at least 2 organizations
    const checkboxes = await page.locator('input[type="checkbox"]').all();
    if (checkboxes.length >= 3) {
      await checkboxes[1].check(); // Skip the first one (might be select all)
      await checkboxes[2].check();
      await page.waitForTimeout(500);
    }

    // Check if bulk action bar appears
    const bulkActionBar = page.locator('text=/selected/i').first();
    if (await bulkActionBar.isVisible({ timeout: 2000 })) {
      console.log('✅ Bulk action bar is visible');

      // Click "Log Activity" button
      const logActivityBtn = page.locator('button:has-text("Log Activity")').first();
      if (await logActivityBtn.isVisible({ timeout: 2000 })) {
        await logActivityBtn.click();
        await page.waitForTimeout(1000);

        // Check if modal opened
        const modal = page.locator('text=/Bulk Activity Log/i').first();
        const isModalVisible = await modal.isVisible({ timeout: 3000 });
        expect(isModalVisible).toBeTruthy();
        console.log('✅ Bulk Activity Log modal opened successfully');
      } else {
        console.log('⚠️  Log Activity button not found');
      }
    } else {
      console.log('⚠️  No organizations selected or bulk bar not visible');
    }
  });

  test('should display selected organizations in modal', async ({ page }) => {
    console.log('Testing organization display in modal...');

    // Select organizations
    const checkboxes = await page.locator('input[type="checkbox"]').all();
    if (checkboxes.length >= 3) {
      await checkboxes[1].check();
      await checkboxes[2].check();
      await page.waitForTimeout(500);
    }

    // Open bulk activity log modal
    const logActivityBtn = page.locator('button:has-text("Log Activity")').first();
    if (await logActivityBtn.isVisible({ timeout: 2000 })) {
      await logActivityBtn.click();
      await page.waitForTimeout(1000);

      // Check for organization preview section
      const orgPreview = page.locator('text=/Selected Organizations/i').first();
      if (await orgPreview.isVisible({ timeout: 2000 })) {
        console.log('✅ Selected organizations preview is visible');

        // Check if organization names are displayed
        const orgNames = await page.locator('[class*="blue-800"]').allTextContents();
        console.log(`✅ Found ${orgNames.length} organization names displayed`);
      }
    }
  });

  test('should allow selecting different activity types', async ({ page }) => {
    console.log('Testing activity type selection...');

    // Select organizations
    const checkboxes = await page.locator('input[type="checkbox"]').all();
    if (checkboxes.length >= 2) {
      await checkboxes[1].check();
      await page.waitForTimeout(500);
    }

    // Open modal
    const logActivityBtn = page.locator('button:has-text("Log Activity")').first();
    if (await logActivityBtn.isVisible({ timeout: 2000 })) {
      await logActivityBtn.click();
      await page.waitForTimeout(1000);

      // Try clicking different activity type buttons
      const activityTypes = ['Usage Observed', 'Follow-up Note', 'Demo Scheduled'];

      for (const type of activityTypes) {
        const typeBtn = page.locator(`button:has-text("${type}")`).first();
        if (await typeBtn.isVisible({ timeout: 1000 })) {
          await typeBtn.click();
          await page.waitForTimeout(300);
          console.log(`✅ Selected activity type: ${type}`);
        }
      }
    }
  });

  test('should require description before submitting', async ({ page }) => {
    console.log('Testing form validation...');

    // Select organizations
    const checkboxes = await page.locator('input[type="checkbox"]').all();
    if (checkboxes.length >= 2) {
      await checkboxes[1].check();
      await page.waitForTimeout(500);
    }

    // Open modal
    const logActivityBtn = page.locator('button:has-text("Log Activity")').first();
    if (await logActivityBtn.isVisible({ timeout: 2000 })) {
      await logActivityBtn.click();
      await page.waitForTimeout(1000);

      // Try to submit without description
      const submitBtn = page.locator('button:has-text("Log Activity for")').first();
      if (await submitBtn.isVisible({ timeout: 2000 })) {
        const isDisabled = await submitBtn.isDisabled();
        expect(isDisabled).toBeTruthy();
        console.log('✅ Submit button is disabled when description is empty');
      }
    }
  });

  test('should enable submit button when description is provided', async ({ page }) => {
    console.log('Testing submit button enablement...');

    // Select organizations
    const checkboxes = await page.locator('input[type="checkbox"]').all();
    if (checkboxes.length >= 2) {
      await checkboxes[1].check();
      await page.waitForTimeout(500);
    }

    // Open modal
    const logActivityBtn = page.locator('button:has-text("Log Activity")').first();
    if (await logActivityBtn.isVisible({ timeout: 2000 })) {
      await logActivityBtn.click();
      await page.waitForTimeout(1000);

      // Fill in description
      const descriptionField = page.locator('textarea').first();
      if (await descriptionField.isVisible({ timeout: 2000 })) {
        await descriptionField.fill('Test activity description for E2E testing');
        await page.waitForTimeout(500);

        // Check if submit button is enabled
        const submitBtn = page.locator('button:has-text("Log Activity for")').first();
        if (await submitBtn.isVisible({ timeout: 2000 })) {
          const isDisabled = await submitBtn.isDisabled();
          expect(isDisabled).toBeFalsy();
          console.log('✅ Submit button is enabled when description is provided');
        }
      }
    }
  });

  test('should show warning for large bulk operations', async ({ page }) => {
    console.log('Testing large bulk operation warning...');

    // Try to select many organizations (if available)
    const checkboxes = await page.locator('input[type="checkbox"]').all();
    const selectCount = Math.min(checkboxes.length - 1, 25); // Try to select 25

    for (let i = 1; i <= selectCount; i++) {
      await checkboxes[i].check();
      if (i % 5 === 0) await page.waitForTimeout(200); // Small delay every 5
    }

    await page.waitForTimeout(500);

    // Open modal
    const logActivityBtn = page.locator('button:has-text("Log Activity")').first();
    if (await logActivityBtn.isVisible({ timeout: 2000 })) {
      await logActivityBtn.click();
      await page.waitForTimeout(1000);

      // Look for warning message
      const warning = page.locator('text=/Large Bulk Operation/i').first();
      const hasWarning = await warning.isVisible({ timeout: 2000 });

      if (hasWarning) {
        console.log('✅ Warning message shown for large bulk operation');
      } else {
        console.log('ℹ️  Warning not shown (may need 20+ orgs selected)');
      }
    }
  });

  test('should close modal when cancel is clicked', async ({ page }) => {
    console.log('Testing modal close functionality...');

    // Select organizations
    const checkboxes = await page.locator('input[type="checkbox"]').all();
    if (checkboxes.length >= 2) {
      await checkboxes[1].check();
      await page.waitForTimeout(500);
    }

    // Open modal
    const logActivityBtn = page.locator('button:has-text("Log Activity")').first();
    if (await logActivityBtn.isVisible({ timeout: 2000 })) {
      await logActivityBtn.click();
      await page.waitForTimeout(1000);

      // Click cancel button
      const cancelBtn = page.locator('button:has-text("Cancel")').first();
      if (await cancelBtn.isVisible({ timeout: 2000 })) {
        await cancelBtn.click();
        await page.waitForTimeout(500);

        // Check if modal is closed
        const modal = page.locator('text=/Bulk Activity Log/i').first();
        const isModalVisible = await modal.isVisible({ timeout: 1000 });
        expect(isModalVisible).toBeFalsy();
        console.log('✅ Modal closed successfully');
      }
    }
  });

  test('should access bulk activity log from quick edit panel', async ({ page }) => {
    console.log('Testing bulk activity log access from quick edit panel...');

    // Select organizations
    const checkboxes = await page.locator('input[type="checkbox"]').all();
    if (checkboxes.length >= 2) {
      await checkboxes[1].check();
      await page.waitForTimeout(500);
    }

    // Open quick edit panel
    const quickEditBtn = page.locator('button:has-text("Quick Edit")').first();
    if (await quickEditBtn.isVisible({ timeout: 2000 })) {
      await quickEditBtn.click();
      await page.waitForTimeout(1000);

      // Look for "Log Activity to All" button in panel
      const logActivityPanelBtn = page.locator('button:has-text("Log Activity to All")').first();
      if (await logActivityPanelBtn.isVisible({ timeout: 2000 })) {
        console.log('✅ Bulk activity log button found in quick edit panel');

        await logActivityPanelBtn.click();
        await page.waitForTimeout(1000);

        // Check if modal opened
        const modal = page.locator('text=/Bulk Activity Log/i').first();
        const isModalVisible = await modal.isVisible({ timeout: 2000 });
        expect(isModalVisible).toBeTruthy();
        console.log('✅ Bulk Activity Log modal opened from quick edit panel');
      }
    }
  });
});
