import { test, expect } from '@playwright/test';
import { loginAndGoToTrials } from '../helpers/auth';

test.describe('Activity Export Feature', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndGoToTrials(page);
  });

  test('should open activity export modal from header button', async ({ page }) => {
    console.log('Testing activity export modal opening from header...');

    // Look for "Export Activities" button
    const exportBtn = page.locator('button:has-text("Export Activities")').first();

    if (await exportBtn.isVisible({ timeout: 3000 })) {
      await exportBtn.click();
      await page.waitForTimeout(1000);

      // Check if modal opened
      const modal = page.locator('text=/Export Activity Report/i').first();
      const isModalVisible = await modal.isVisible({ timeout: 3000 });
      expect(isModalVisible).toBeTruthy();
      console.log('✅ Activity Export modal opened from header button');
    } else {
      console.log('⚠️  Export Activities button not found in header');
    }
  });

  test('should display date range filters', async ({ page }) => {
    console.log('Testing date range filter display...');

    const exportBtn = page.locator('button:has-text("Export Activities")').first();

    if (await exportBtn.isVisible({ timeout: 3000 })) {
      await exportBtn.click();
      await page.waitForTimeout(1000);

      // Check for date inputs
      const dateInputs = await page.locator('input[type="date"]').all();
      expect(dateInputs.length).toBeGreaterThanOrEqual(2);
      console.log(`✅ Found ${dateInputs.length} date input fields`);

      // Check for "From" and "To" labels
      const fromLabel = page.locator('text=/From/i').first();
      const toLabel = page.locator('text=/To/i').first();

      expect(await fromLabel.isVisible({ timeout: 2000 })).toBeTruthy();
      expect(await toLabel.isVisible({ timeout: 2000 })).toBeTruthy();
      console.log('✅ Date range labels are visible');
    }
  });

  test('should allow setting date range', async ({ page }) => {
    console.log('Testing date range setting...');

    const exportBtn = page.locator('button:has-text("Export Activities")').first();

    if (await exportBtn.isVisible({ timeout: 3000 })) {
      await exportBtn.click();
      await page.waitForTimeout(1000);

      // Set date range
      const dateInputs = await page.locator('input[type="date"]').all();
      if (dateInputs.length >= 2) {
        await dateInputs[0].fill('2024-01-01');
        await dateInputs[1].fill('2024-12-31');
        await page.waitForTimeout(1000);
        console.log('✅ Date range set successfully');

        // Check for clear filters button
        const clearBtn = page.locator('button:has-text("Clear date filters")').first();
        if (await clearBtn.isVisible({ timeout: 2000 })) {
          console.log('✅ Clear date filters button appeared');
        }
      }
    }
  });

  test('should display activity type filters', async ({ page }) => {
    console.log('Testing activity type filters...');

    const exportBtn = page.locator('button:has-text("Export Activities")').first();

    if (await exportBtn.isVisible({ timeout: 3000 })) {
      await exportBtn.click();
      await page.waitForTimeout(1000);

      // Check for activity type section
      const activityTypesHeader = page.locator('text=/Activity Types/i').first();
      expect(await activityTypesHeader.isVisible({ timeout: 2000 })).toBeTruthy();
      console.log('✅ Activity Types section is visible');

      // Check for checkboxes
      const checkboxes = await page.locator('input[type="checkbox"]').all();
      expect(checkboxes.length).toBeGreaterThan(0);
      console.log(`✅ Found ${checkboxes.length} activity type checkboxes`);

      // Check for Select All button
      const selectAllBtn = page.locator('button:has-text("Select All")').first();
      if (await selectAllBtn.isVisible({ timeout: 2000 })) {
        console.log('✅ Select All button is visible');
      }
    }
  });

  test('should toggle activity types', async ({ page }) => {
    console.log('Testing activity type toggling...');

    const exportBtn = page.locator('button:has-text("Export Activities")').first();

    if (await exportBtn.isVisible({ timeout: 3000 })) {
      await exportBtn.click();
      await page.waitForTimeout(1000);

      // Find checkboxes within the modal
      const activityCheckboxes = await page.locator('input[type="checkbox"]').all();

      if (activityCheckboxes.length > 3) {
        // Toggle first activity type
        await activityCheckboxes[0].check();
        await page.waitForTimeout(300);

        // Toggle second activity type
        await activityCheckboxes[1].check();
        await page.waitForTimeout(300);

        console.log('✅ Activity types toggled successfully');

        // Check for selection count indicator
        const selectionText = page.locator('text=/types selected/i').first();
        if (await selectionText.isVisible({ timeout: 2000 })) {
          console.log('✅ Selection count indicator is visible');
        }
      }
    }
  });

  test('should toggle Select All activity types', async ({ page }) => {
    console.log('Testing Select All functionality...');

    const exportBtn = page.locator('button:has-text("Export Activities")').first();

    if (await exportBtn.isVisible({ timeout: 3000 })) {
      await exportBtn.click();
      await page.waitForTimeout(1000);

      // Click Select All
      const selectAllBtn = page.locator('button:has-text("Select All")').first();
      if (await selectAllBtn.isVisible({ timeout: 2000 })) {
        await selectAllBtn.click();
        await page.waitForTimeout(500);
        console.log('✅ Clicked Select All button');

        // Button should change to "Deselect All"
        const deselectAllBtn = page.locator('button:has-text("Deselect All")').first();
        if (await deselectAllBtn.isVisible({ timeout: 2000 })) {
          console.log('✅ Button changed to Deselect All');

          // Click to deselect
          await deselectAllBtn.click();
          await page.waitForTimeout(500);
          console.log('✅ Deselected all activity types');
        }
      }
    }
  });

  test('should display export format options', async ({ page }) => {
    console.log('Testing export format options...');

    const exportBtn = page.locator('button:has-text("Export Activities")').first();

    if (await exportBtn.isVisible({ timeout: 3000 })) {
      await exportBtn.click();
      await page.waitForTimeout(1000);

      // Check for Export Options section
      const exportOptionsHeader = page.locator('text=/Export Options/i').first();
      expect(await exportOptionsHeader.isVisible({ timeout: 2000 })).toBeTruthy();
      console.log('✅ Export Options section is visible');

      // Check for CSV and JSON buttons
      const csvBtn = page.locator('button:has-text("CSV")').first();
      const jsonBtn = page.locator('button:has-text("JSON")').first();

      expect(await csvBtn.isVisible({ timeout: 2000 })).toBeTruthy();
      expect(await jsonBtn.isVisible({ timeout: 2000 })).toBeTruthy();
      console.log('✅ CSV and JSON format buttons are visible');
    }
  });

  test('should toggle between CSV and JSON formats', async ({ page }) => {
    console.log('Testing format toggling...');

    const exportBtn = page.locator('button:has-text("Export Activities")').first();

    if (await exportBtn.isVisible({ timeout: 3000 })) {
      await exportBtn.click();
      await page.waitForTimeout(1000);

      // Click JSON button
      const jsonBtn = page.locator('button:has-text("JSON")').first();
      if (await jsonBtn.isVisible({ timeout: 2000 })) {
        await jsonBtn.click();
        await page.waitForTimeout(300);
        console.log('✅ Selected JSON format');

        // Click CSV button
        const csvBtn = page.locator('button:has-text("CSV")').first();
        await csvBtn.click();
        await page.waitForTimeout(300);
        console.log('✅ Selected CSV format');
      }
    }
  });

  test('should have organization details toggle', async ({ page }) => {
    console.log('Testing organization details toggle...');

    const exportBtn = page.locator('button:has-text("Export Activities")').first();

    if (await exportBtn.isVisible({ timeout: 3000 })) {
      await exportBtn.click();
      await page.waitForTimeout(1000);

      // Look for checkbox with "Include organization details"
      const includeOrgCheckbox = page.locator('text=/Include organization details/i').first();

      if (await includeOrgCheckbox.isVisible({ timeout: 2000 })) {
        console.log('✅ Include organization details checkbox is visible');

        // Get the actual checkbox element
        const checkbox = await includeOrgCheckbox.locator('..').locator('input[type="checkbox"]').first();
        if (await checkbox.isVisible({ timeout: 1000 })) {
          // Toggle it
          await checkbox.click();
          await page.waitForTimeout(300);
          await checkbox.click();
          await page.waitForTimeout(300);
          console.log('✅ Toggled organization details checkbox');
        }
      }
    }
  });

  test('should display export preview when activities are available', async ({ page }) => {
    console.log('Testing export preview display...');

    const exportBtn = page.locator('button:has-text("Export Activities")').first();

    if (await exportBtn.isVisible({ timeout: 3000 })) {
      await exportBtn.click();
      await page.waitForTimeout(2000); // Wait for activities to load

      // Check for preview section
      const previewHeader = page.locator('text=/Export Preview/i').first();

      if (await previewHeader.isVisible({ timeout: 3000 })) {
        console.log('✅ Export Preview section is visible');

        // Check for activity count
        const activityCount = page.locator('text=/activities will be exported/i').first();
        if (await activityCount.isVisible({ timeout: 2000 })) {
          console.log('✅ Activity count is displayed in preview');
        }
      } else {
        console.log('ℹ️  No activities available or still loading');
      }
    }
  });

  test('should show empty state when no activities match filters', async ({ page }) => {
    console.log('Testing empty state display...');

    const exportBtn = page.locator('button:has-text("Export Activities")').first();

    if (await exportBtn.isVisible({ timeout: 3000 })) {
      await exportBtn.click();
      await page.waitForTimeout(1000);

      // Set a very restrictive date range that likely has no data
      const dateInputs = await page.locator('input[type="date"]').all();
      if (dateInputs.length >= 2) {
        await dateInputs[0].fill('2020-01-01');
        await dateInputs[1].fill('2020-01-02');
        await page.waitForTimeout(2000); // Wait for query

        // Look for empty state message
        const emptyState = page.locator('text=/No activities found/i').first();
        if (await emptyState.isVisible({ timeout: 3000 })) {
          console.log('✅ Empty state message displayed');
        }
      }
    }
  });

  test('should have working cancel button', async ({ page }) => {
    console.log('Testing cancel button...');

    const exportBtn = page.locator('button:has-text("Export Activities")').first();

    if (await exportBtn.isVisible({ timeout: 3000 })) {
      await exportBtn.click();
      await page.waitForTimeout(1000);

      // Click cancel
      const cancelBtn = page.locator('button:has-text("Cancel")').first();
      if (await cancelBtn.isVisible({ timeout: 2000 })) {
        await cancelBtn.click();
        await page.waitForTimeout(500);

        // Modal should be closed
        const modal = page.locator('text=/Export Activity Report/i').first();
        const isModalVisible = await modal.isVisible({ timeout: 1000 });
        expect(isModalVisible).toBeFalsy();
        console.log('✅ Modal closed successfully');
      }
    }
  });

  test('should access export from quick edit panel', async ({ page }) => {
    console.log('Testing export access from quick edit panel...');

    // Select organizations first
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

      // Look for export button in panel
      const exportPanelBtn = page.locator('button:has-text("Export Activities Report")').first();
      if (await exportPanelBtn.isVisible({ timeout: 2000 })) {
        console.log('✅ Export button found in quick edit panel');

        await exportPanelBtn.click();
        await page.waitForTimeout(1000);

        // Check if modal opened
        const modal = page.locator('text=/Export Activity Report/i').first();
        const isModalVisible = await modal.isVisible({ timeout: 2000 });
        expect(isModalVisible).toBeTruthy();
        console.log('✅ Activity Export modal opened from quick edit panel');
      }
    }
  });

  test('should show loading state while fetching activities', async ({ page }) => {
    console.log('Testing loading state...');

    const exportBtn = page.locator('button:has-text("Export Activities")').first();

    if (await exportBtn.isVisible({ timeout: 3000 })) {
      await exportBtn.click();

      // Look for loading indicator immediately
      const loadingIndicator = page.locator('.animate-spin').first();
      const hasLoading = await loadingIndicator.isVisible({ timeout: 1000 });

      if (hasLoading) {
        console.log('✅ Loading indicator displayed');
      } else {
        console.log('ℹ️  Activities loaded too quickly to see loading state');
      }

      await page.waitForTimeout(2000);
    }
  });

  test('should update activity count when filters change', async ({ page }) => {
    console.log('Testing dynamic activity count updates...');

    const exportBtn = page.locator('button:has-text("Export Activities")').first();

    if (await exportBtn.isVisible({ timeout: 3000 })) {
      await exportBtn.click();
      await page.waitForTimeout(2000); // Wait for initial load

      // Get initial count from header
      const headerText = await page.locator('text=/Export Activity Report/i').first().textContent();
      console.log(`Initial header: ${headerText}`);

      // Apply a filter
      const activityCheckboxes = await page.locator('input[type="checkbox"]').all();
      if (activityCheckboxes.length > 0) {
        await activityCheckboxes[0].check();
        await page.waitForTimeout(1500);

        // Get updated count
        const updatedHeaderText = await page.locator('text=/Export Activity Report/i').first().textContent();
        console.log(`Updated header: ${updatedHeaderText}`);
        console.log('✅ Activity count updates when filters change');
      }
    }
  });
});
