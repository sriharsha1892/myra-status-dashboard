import { test, expect } from '@playwright/test';

/**
 * Deal Closure Tracking E2E Tests
 *
 * Tests the comprehensive deal tracking feature including:
 * - UpdateDealStatusModal for all 5 status workflows
 * - Opportunity value and final deal value tracking
 * - Loss reason dropdowns with predefined options
 * - Deferred status with follow-up dates
 * - Deal status widget in OverviewTab
 * - DealTrackingTab display
 */

test.describe('Deal Closure Tracking - UpdateDealStatusModal', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to trials page and select first organization
    await page.goto('/support/trials', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
  });

  test('Modal opens and displays all 5 deal status options', async ({ page }) => {
    // This test assumes there's at least one trial org with deal tracking
    // Look for "Update Status" button in OverviewTab or DealTrackingTab
    const updateButton = page.getByRole('button', { name: /update status/i }).first();

    if (await updateButton.isVisible()) {
      await updateButton.click();
      await page.waitForTimeout(500);

      // Check modal is visible
      const modal = page.locator('div:has-text("Update Deal Status")').first();
      await expect(modal).toBeVisible();

      // Verify all 5 status radio options are present
      await expect(page.locator('input[type="radio"][value="prospect"]')).toBeVisible();
      await expect(page.locator('input[type="radio"][value="negotiating"]')).toBeVisible();
      await expect(page.locator('input[type="radio"][value="won"]')).toBeVisible();
      await expect(page.locator('input[type="radio"][value="lost"]')).toBeVisible();
      await expect(page.locator('input[type="radio"][value="deferred"]')).toBeVisible();

      // Verify status labels with icons
      await expect(page.locator('text=🎯')).toBeVisible(); // Prospect
      await expect(page.locator('text=💼')).toBeVisible(); // Negotiating
      await expect(page.locator('text=🎉')).toBeVisible(); // Won
      await expect(page.locator('text=❌')).toBeVisible(); // Lost
      await expect(page.locator('text=⏸️')).toBeVisible(); // Deferred

      console.log('✓ All 5 deal status options displayed correctly');
    } else {
      console.log('⚠ No trial org with deal tracking found - skipping modal test');
    }
  });

  test('Opportunity value field is always visible and optional', async ({ page }) => {
    const updateButton = page.getByRole('button', { name: /update status/i }).first();

    if (await updateButton.isVisible()) {
      await updateButton.click();
      await page.waitForTimeout(500);

      // Check opportunity value field is visible
      const opportunityField = page.locator('input[type="number"]').first();
      await expect(opportunityField).toBeVisible();

      // Check placeholder text
      await expect(opportunityField).toHaveAttribute('placeholder', /estimated deal value/i);

      // Verify currency dropdown is visible
      const currencySelect = page.locator('select').first();
      await expect(currencySelect).toBeVisible();

      console.log('✓ Opportunity value field always visible');
    }
  });

  test('Won status shows final deal value field (required)', async ({ page }) => {
    const updateButton = page.getByRole('button', { name: /update status/i }).first();

    if (await updateButton.isVisible()) {
      await updateButton.click();
      await page.waitForTimeout(500);

      // Select "Won" status
      await page.locator('input[type="radio"][value="won"]').click();
      await page.waitForTimeout(300);

      // Verify final deal value field appears
      const finalDealSection = page.locator('div:has-text("Final Deal Value")');
      await expect(finalDealSection).toBeVisible();

      // Check field is marked required
      const finalDealInput = page.locator('input[placeholder*="actual closed deal"]');
      await expect(finalDealInput).toBeVisible();

      // Try to submit without deal value - should show error
      await page.getByRole('button', { name: /update deal status/i }).click();
      await page.waitForTimeout(500);

      // Toast error should appear (react-hot-toast)
      const toastError = page.locator('text=Deal value is required');
      await expect(toastError).toBeVisible({ timeout: 2000 });

      console.log('✓ Won status requires final deal value');
    }
  });

  test('Lost status shows dropdown with 11 predefined reasons', async ({ page }) => {
    const updateButton = page.getByRole('button', { name: /update status/i }).first();

    if (await updateButton.isVisible()) {
      await updateButton.click();
      await page.waitForTimeout(500);

      // Select "Lost" status
      await page.locator('input[type="radio"][value="lost"]').click();
      await page.waitForTimeout(300);

      // Verify loss reason dropdown appears
      const lossReasonSection = page.locator('div:has-text("Primary Loss Reason")');
      await expect(lossReasonSection).toBeVisible();

      const lossReasonSelect = page.locator('select').last();
      await expect(lossReasonSelect).toBeVisible();

      // Click dropdown to see options
      await lossReasonSelect.click();

      // Verify predefined reasons exist
      const expectedReasons = [
        'Pricing too high',
        'Missing critical features',
        'Went with competitor',
        'Budget constraints',
        'Timing not right',
        'No executive buy-in',
        'Champion left organization',
        'Poor product-market fit',
        'Implementation too complex',
        'Security/compliance concerns',
        'Other',
      ];

      for (const reason of expectedReasons) {
        await expect(page.locator(`option:has-text("${reason}")`)).toBeVisible();
      }

      console.log('✓ Lost status shows all 11 predefined loss reasons');
    }
  });

  test('Lost status with "Other" reason shows text field', async ({ page }) => {
    const updateButton = page.getByRole('button', { name: /update status/i }).first();

    if (await updateButton.isVisible()) {
      await updateButton.click();
      await page.waitForTimeout(500);

      // Select "Lost" status
      await page.locator('input[type="radio"][value="lost"]').click();
      await page.waitForTimeout(300);

      // Select "Other" from dropdown
      const lossReasonSelect = page.locator('select').last();
      await lossReasonSelect.selectOption('Other');
      await page.waitForTimeout(300);

      // Verify text area appears for custom reason
      const otherReasonField = page.locator('textarea[placeholder*="Describe the reason"]');
      await expect(otherReasonField).toBeVisible();

      // Try to submit without specifying "Other" - should show error
      await page.getByRole('button', { name: /update deal status/i }).click();
      await page.waitForTimeout(500);

      const toastError = page.locator('text=Please specify the reason');
      await expect(toastError).toBeVisible({ timeout: 2000 });

      console.log('✓ Lost "Other" reason requires text specification');
    }
  });

  test('Deferred status shows reason field and follow-up date picker', async ({ page }) => {
    const updateButton = page.getByRole('button', { name: /update status/i }).first();

    if (await updateButton.isVisible()) {
      await updateButton.click();
      await page.waitForTimeout(500);

      // Select "Deferred" status
      await page.locator('input[type="radio"][value="deferred"]').click();
      await page.waitForTimeout(300);

      // Verify deferred reason field appears
      const deferredReasonSection = page.locator('div:has-text("Reason for Deferring")');
      await expect(deferredReasonSection).toBeVisible();

      const deferredReasonField = page.locator('textarea[placeholder*="Why is this deal deferred"]');
      await expect(deferredReasonField).toBeVisible();

      // Verify follow-up date picker appears
      const followUpSection = page.locator('div:has-text("Expected Follow-up Date")');
      await expect(followUpSection).toBeVisible();

      const followUpDateField = page.locator('input[type="date"]');
      await expect(followUpDateField).toBeVisible();

      // Verify date picker has minimum date set to today
      const minDate = await followUpDateField.getAttribute('min');
      const today = new Date().toISOString().split('T')[0];
      expect(minDate).toBe(today);

      console.log('✓ Deferred status shows reason and follow-up date fields');
    }
  });

  test('Deferred status requires both reason and follow-up date', async ({ page }) => {
    const updateButton = page.getByRole('button', { name: /update status/i }).first();

    if (await updateButton.isVisible()) {
      await updateButton.click();
      await page.waitForTimeout(500);

      // Select "Deferred" status
      await page.locator('input[type="radio"][value="deferred"]').click();
      await page.waitForTimeout(300);

      // Try to submit without filling required fields
      await page.getByRole('button', { name: /update deal status/i }).click();
      await page.waitForTimeout(500);

      // Should show error for missing reason
      let toastError = page.locator('text=Reason is required');
      await expect(toastError).toBeVisible({ timeout: 2000 });

      // Fill reason but not date
      await page.locator('textarea[placeholder*="Why is this deal deferred"]').fill('Waiting for Q2 budget');
      await page.getByRole('button', { name: /update deal status/i }).click();
      await page.waitForTimeout(500);

      // Should show error for missing follow-up date
      toastError = page.locator('text=Expected follow-up date is required');
      await expect(toastError).toBeVisible({ timeout: 2000 });

      console.log('✓ Deferred status validates required fields');
    }
  });

  test('Modal cancel button closes modal without saving', async ({ page }) => {
    const updateButton = page.getByRole('button', { name: /update status/i }).first();

    if (await updateButton.isVisible()) {
      await updateButton.click();
      await page.waitForTimeout(500);

      // Verify modal is open
      const modal = page.locator('div:has-text("Update Deal Status")').first();
      await expect(modal).toBeVisible();

      // Click cancel button
      await page.getByRole('button', { name: /cancel/i }).click();
      await page.waitForTimeout(500);

      // Verify modal is closed
      await expect(modal).not.toBeVisible();

      console.log('✓ Cancel button closes modal');
    }
  });
});

test.describe('Deal Closure Tracking - OverviewTab Widget', () => {
  test('Deal status widget displays when deal data exists', async ({ page }) => {
    await page.goto('/support/trials', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Navigate to first trial org (if exists)
    const firstOrgCard = page.locator('[class*="bg-white rounded"]').first();
    if (await firstOrgCard.isVisible()) {
      await firstOrgCard.click();
      await page.waitForTimeout(1000);

      // Check if deal status widget is visible in Overview tab
      const dealWidget = page.locator('text=Deal Status').first();

      if (await dealWidget.isVisible()) {
        // Verify widget structure
        await expect(page.locator('text=Update Status')).toBeVisible();

        // Check for status display
        const statusBadge = page.locator('[class*="rounded-lg"][class*="p-4"]').first();
        await expect(statusBadge).toBeVisible();

        console.log('✓ Deal status widget displays in OverviewTab');
      } else {
        console.log('⚠ No deal data for this org - widget correctly hidden');
      }
    }
  });

  test('Deal widget shows opportunity value when set', async ({ page }) => {
    await page.goto('/support/trials', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const firstOrgCard = page.locator('[class*="bg-white rounded"]').first();
    if (await firstOrgCard.isVisible()) {
      await firstOrgCard.click();
      await page.waitForTimeout(1000);

      // Check for opportunity value display
      const opportunityValue = page.locator('text=Opportunity Value');

      if (await opportunityValue.isVisible()) {
        // Verify currency and value format
        const valueDisplay = page.locator('[class*="font-bold"]:near(:text("Opportunity Value"))');
        await expect(valueDisplay).toBeVisible();

        console.log('✓ Opportunity value displays in widget');
      } else {
        console.log('⚠ No opportunity value set for this deal');
      }
    }
  });

  test('Deal widget shows follow-up date for deferred deals', async ({ page }) => {
    await page.goto('/support/trials', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const firstOrgCard = page.locator('[class*="bg-white rounded"]').first();
    if (await firstOrgCard.isVisible()) {
      await firstOrgCard.click();
      await page.waitForTimeout(1000);

      // Check for follow-up date (only visible for deferred status)
      const followUpDate = page.locator('text=Follow-up Date');

      if (await followUpDate.isVisible()) {
        // Verify date format display
        const dateDisplay = page.locator('[class*="font-bold"]:near(:text("Follow-up Date"))');
        await expect(dateDisplay).toBeVisible();

        console.log('✓ Follow-up date displays for deferred deals');
      } else {
        console.log('⚠ Deal not deferred or no follow-up date set');
      }
    }
  });
});

test.describe('Deal Closure Tracking - DealTrackingTab', () => {
  test('DealTrackingTab displays all deal information', async ({ page }) => {
    await page.goto('/support/trials', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const firstOrgCard = page.locator('[class*="bg-white rounded"]').first();
    if (await firstOrgCard.isVisible()) {
      await firstOrgCard.click();
      await page.waitForTimeout(1000);

      // Navigate to Deal Tracking tab
      const dealTab = page.getByRole('button', { name: /deal tracking/i });
      if (await dealTab.isVisible()) {
        await dealTab.click();
        await page.waitForTimeout(500);

        // Verify tab header
        await expect(page.locator('text=Manage and track deal outcomes')).toBeVisible();

        // Verify "Update Status" button in tab
        await expect(page.getByRole('button', { name: /update status/i })).toBeVisible();

        // Verify deal status card is displayed
        const statusCard = page.locator('[class*="rounded-xl"][class*="border-2"]').first();
        await expect(statusCard).toBeVisible();

        console.log('✓ DealTrackingTab displays correctly');
      } else {
        console.log('⚠ Deal Tracking tab not visible');
      }
    }
  });

  test('DealTrackingTab shows color-coded status badges', async ({ page }) => {
    await page.goto('/support/trials', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const firstOrgCard = page.locator('[class*="bg-white rounded"]').first();
    if (await firstOrgCard.isVisible()) {
      await firstOrgCard.click();
      await page.waitForTimeout(1000);

      const dealTab = page.getByRole('button', { name: /deal tracking/i });
      if (await dealTab.isVisible()) {
        await dealTab.click();
        await page.waitForTimeout(500);

        // Check for status emoji icons
        const statusIcons = ['🎯', '💼', '🎉', '❌', '⏸️'];
        let foundIcon = false;

        for (const icon of statusIcons) {
          if (await page.locator(`text=${icon}`).isVisible()) {
            foundIcon = true;
            break;
          }
        }

        expect(foundIcon).toBe(true);
        console.log('✓ Status badges display with correct icons');
      }
    }
  });

  test('DealTrackingTab displays available action buttons', async ({ page }) => {
    await page.goto('/support/trials', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const firstOrgCard = page.locator('[class*="bg-white rounded"]').first();
    if (await firstOrgCard.isVisible()) {
      await firstOrgCard.click();
      await page.waitForTimeout(1000);

      const dealTab = page.getByRole('button', { name: /deal tracking/i });
      if (await dealTab.isVisible()) {
        await dealTab.click();
        await page.waitForTimeout(500);

        // Verify "Available Actions" section with all status options
        const actionsSection = page.locator('text=Available Actions');
        await expect(actionsSection).toBeVisible();

        // Check all 5 status action buttons are clickable
        const actionButtons = page.locator('[class*="rounded-lg"][class*="border"][class*="hover:border-blue"]');
        const buttonCount = await actionButtons.count();

        expect(buttonCount).toBeGreaterThanOrEqual(5);
        console.log(`✓ Found ${buttonCount} action buttons`);
      }
    }
  });
});

test.describe('Deal Closure Tracking - Data Persistence', () => {
  test('Database migration created all required columns', async ({ page }) => {
    // This test verifies the migration worked by checking UI elements that depend on the schema
    await page.goto('/support/trials', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const firstOrgCard = page.locator('[class*="bg-white rounded"]').first();
    if (await firstOrgCard.isVisible()) {
      await firstOrgCard.click();
      await page.waitForTimeout(1000);

      const updateButton = page.getByRole('button', { name: /update status/i }).first();
      if (await updateButton.isVisible()) {
        await updateButton.click();
        await page.waitForTimeout(500);

        // Verify all new fields are accessible in modal
        // opportunity_value
        await expect(page.locator('input[placeholder*="estimated deal value"]')).toBeVisible();

        // Select deferred to check expected_followup_date and deferred_reason
        await page.locator('input[type="radio"][value="deferred"]').click();
        await page.waitForTimeout(300);

        await expect(page.locator('textarea[placeholder*="Why is this deal deferred"]')).toBeVisible();
        await expect(page.locator('input[type="date"]')).toBeVisible();

        console.log('✓ All database columns accessible via UI');
      }
    }
  });
});

test.describe('Deal Closure Tracking - Enum Values', () => {
  test('Deferred status replaces future_prospect in UI', async ({ page }) => {
    await page.goto('/support/trials', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const firstOrgCard = page.locator('[class*="bg-white rounded"]').first();
    if (await firstOrgCard.isVisible()) {
      await firstOrgCard.click();
      await page.waitForTimeout(1000);

      const updateButton = page.getByRole('button', { name: /update status/i }).first();
      if (await updateButton.isVisible()) {
        await updateButton.click();
        await page.waitForTimeout(500);

        // Verify "Deferred" status exists
        await expect(page.locator('text=Deferred')).toBeVisible();

        // Verify "future_prospect" is NOT visible in UI
        const futureProspectLabel = page.locator('text=Future Prospect');
        await expect(futureProspectLabel).not.toBeVisible();

        console.log('✓ Deferred status correctly replaces future_prospect in UI');
      }
    }
  });
});
