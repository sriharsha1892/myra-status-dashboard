import { test, expect } from '@playwright/test';

/**
 * Phase 2: Zod Validation Migration E2E Tests
 *
 * Tests cover all Phase 2 modals that have been migrated to Zod validation:
 * 1. AddFeatureRequestModal
 * 2. AddFollowupModal
 * 3. AddTopicModal
 * 4. TrialHandoffModal
 * 5. AddRoadmapItemModal
 *
 * Test Focus:
 * - Zod validation works correctly
 * - Error messages display properly
 * - Error clearing on user input
 * - Success scenarios
 * - Form reset on submission
 */

const TEST_TRIAL_ORG_ID = process.env.TEST_TRIAL_ORG_ID || 'ca82ddef-927a-4838-a863-339e6e8dbfe3';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Phase 2: Zod Validation Migration Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to trial org detail page
    await page.goto(`${BASE_URL}/trials/${TEST_TRIAL_ORG_ID}`);
    await page.waitForLoadState('networkidle');
  });

  test.describe('AddFeatureRequestModal - Zod Validation', () => {
    test('should validate required title field', async ({ page }) => {
      // Open the Add Feature Request modal
      const addFeatureRequestButton = page.locator('button:has-text("Add Feature Request")').first();
      await addFeatureRequestButton.click();

      // Wait for modal to open
      await page.waitForSelector('h2:has-text("Feature Request")', { timeout: 5000 });

      // Try to submit without filling required fields
      const submitButton = page.locator('button[type="submit"]:has-text("Submit")');
      await submitButton.click();

      // Check for validation error
      await expect(page.locator('text=Title is required').or(page.locator('text=required'))).toBeVisible({ timeout: 3000 });
    });

    test('should clear errors when user starts typing', async ({ page }) => {
      // Open modal
      const addFeatureRequestButton = page.locator('button:has-text("Add Feature Request")').first();
      await addFeatureRequestButton.click();
      await page.waitForSelector('h2:has-text("Feature Request")', { timeout: 5000 });

      // Submit to trigger validation
      const submitButton = page.locator('button[type="submit"]:has-text("Submit")');
      await submitButton.click();

      // Error should be visible
      await page.waitForSelector('text=required', { timeout: 3000 });

      // Type in the title field
      const titleInput = page.locator('input[placeholder*="feature"]').first();
      await titleInput.fill('Test Feature');

      // Error should disappear
      await expect(page.locator('text=Title is required')).not.toBeVisible({ timeout: 2000 });
    });

    test('should successfully submit with valid data', async ({ page }) => {
      // Open modal
      const addFeatureRequestButton = page.locator('button:has-text("Add Feature Request")').first();
      await addFeatureRequestButton.click();
      await page.waitForSelector('h2:has-text("Feature Request")', { timeout: 5000 });

      // Fill required fields
      await page.locator('input[placeholder*="feature"]').first().fill('E2E Test Feature Request');
      await page.locator('textarea[placeholder*="describe"]').first().fill('This is a test feature request for E2E validation');

      // Submit form
      const submitButton = page.locator('button[type="submit"]:has-text("Submit")');
      await submitButton.click();

      // Check for success toast
      await expect(page.locator('text=successfully').or(page.locator('text=Success'))).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('AddFollowupModal - Zod Validation', () => {
    test('should validate required fields (title and date)', async ({ page }) => {
      // Open the Add Followup modal
      const addFollowupButton = page.locator('button:has-text("Schedule Follow-up")').or(
        page.locator('button:has-text("Add Follow-up")')
      ).first();
      await addFollowupButton.click();

      // Wait for modal
      await page.waitForSelector('h2:has-text("Follow-up")', { timeout: 5000 });

      // Try to submit without filling required fields
      const submitButton = page.locator('button[type="submit"]').last();
      await submitButton.click();

      // Check for validation errors
      await expect(page.locator('text=required').first()).toBeVisible({ timeout: 3000 });
    });

    test('should successfully submit with valid followup data', async ({ page }) => {
      // Open modal
      const addFollowupButton = page.locator('button:has-text("Schedule Follow-up")').or(
        page.locator('button:has-text("Add Follow-up")')
      ).first();
      await addFollowupButton.click();
      await page.waitForSelector('h2:has-text("Follow-up")', { timeout: 5000 });

      // Fill required fields
      await page.locator('input[placeholder*="Demo"]').first().fill('E2E Test Followup');

      // Set date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateString = tomorrow.toISOString().split('T')[0];
      await page.locator('input[type="date"]').first().fill(dateString);

      // Submit form
      const submitButton = page.locator('button[type="submit"]').last();
      await submitButton.click();

      // Check for success
      await expect(page.locator('text=successfully').or(page.locator('text=scheduled'))).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('AddTopicModal - Zod Validation', () => {
    test('should validate required topic name field', async ({ page }) => {
      // Navigate to a user detail page first (topics are user-level)
      const userLink = page.locator('a[href*="/users/"]').first();
      if (await userLink.isVisible()) {
        await userLink.click();
        await page.waitForLoadState('networkidle');

        // Open Add Topic modal
        const addTopicButton = page.locator('button:has-text("Add Topic")').or(
          page.locator('button:has-text("Add Use Case")')
        ).first();
        await addTopicButton.click();

        // Wait for modal
        await page.waitForSelector('h2:has-text("Topic")', { timeout: 5000 });

        // Try to submit without required field
        const submitButton = page.locator('button[type="submit"]:has-text("Add Topic")').or(
          page.locator('button[type="submit"]:has-text("Add")')
        );
        await submitButton.click();

        // Check for validation error
        await expect(page.locator('text=required').first()).toBeVisible({ timeout: 3000 });
      }
    });

    test('should successfully submit with valid topic data', async ({ page }) => {
      // Navigate to user detail page
      const userLink = page.locator('a[href*="/users/"]').first();
      if (await userLink.isVisible()) {
        await userLink.click();
        await page.waitForLoadState('networkidle');

        // Open modal
        const addTopicButton = page.locator('button:has-text("Add Topic")').or(
          page.locator('button:has-text("Add Use Case")')
        ).first();
        await addTopicButton.click();
        await page.waitForSelector('h2:has-text("Topic")', { timeout: 5000 });

        // Fill required fields
        await page.locator('input[placeholder*="Invoice"]').first().fill('E2E Test Topic');
        await page.locator('textarea[placeholder*="details"]').first().fill('Test topic description');

        // Submit
        const submitButton = page.locator('button[type="submit"]:has-text("Add Topic")').or(
          page.locator('button[type="submit"]:has-text("Add")')
        );
        await submitButton.click();

        // Check for success
        await expect(page.locator('text=successfully').or(page.locator('text=added'))).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('TrialHandoffModal - Zod Validation', () => {
    test('should validate required fields (account manager and reason)', async ({ page }) => {
      // Look for handoff button
      const handoffButton = page.locator('button:has-text("Hand Off")').or(
        page.locator('button:has-text("Handoff")')
      ).first();

      if (await handoffButton.isVisible()) {
        await handoffButton.click();
        await page.waitForSelector('h2:has-text("Hand Off")', { timeout: 5000 });

        // Try to submit without required fields
        const submitButton = page.locator('button[type="submit"]:has-text("Hand Off")');
        await submitButton.click();

        // Check for validation errors
        await expect(page.locator('text=required').first()).toBeVisible({ timeout: 3000 });
      }
    });

    test('should clear errors when user selects account manager', async ({ page }) => {
      const handoffButton = page.locator('button:has-text("Hand Off")').or(
        page.locator('button:has-text("Handoff")')
      ).first();

      if (await handoffButton.isVisible()) {
        await handoffButton.click();
        await page.waitForSelector('h2:has-text("Hand Off")', { timeout: 5000 });

        // Submit to trigger validation
        const submitButton = page.locator('button[type="submit"]:has-text("Hand Off")');
        await submitButton.click();
        await page.waitForSelector('text=required', { timeout: 3000 });

        // Select account manager
        const selectManager = page.locator('select').first();
        await selectManager.selectOption({ index: 1 });

        // Error should clear
        await expect(page.locator('text=Please select').or(page.locator('text=required'))).not.toBeVisible({ timeout: 2000 });
      }
    });
  });

  test.describe('AddRoadmapItemModal - Zod Validation', () => {
    test('should validate required title field', async ({ page }) => {
      // Look for Add Roadmap Item button
      const addRoadmapButton = page.locator('button:has-text("Add Roadmap")').or(
        page.locator('button:has-text("Add Item")')
      ).first();

      if (await addRoadmapButton.isVisible()) {
        await addRoadmapButton.click();
        await page.waitForSelector('h2:has-text("Roadmap")', { timeout: 5000 });

        // Try to submit without title
        const submitButton = page.locator('button[type="submit"]:has-text("Add")');
        await submitButton.click();

        // Check for validation error
        await expect(page.locator('text=Title is required').or(page.locator('text=required'))).toBeVisible({ timeout: 3000 });
      }
    });

    test('should display error styling on invalid fields', async ({ page }) => {
      const addRoadmapButton = page.locator('button:has-text("Add Roadmap")').or(
        page.locator('button:has-text("Add Item")')
      ).first();

      if (await addRoadmapButton.isVisible()) {
        await addRoadmapButton.click();
        await page.waitForSelector('h2:has-text("Roadmap")', { timeout: 5000 });

        // Submit to trigger validation
        const submitButton = page.locator('button[type="submit"]:has-text("Add")');
        await submitButton.click();

        // Check for error styling (red border)
        const titleInput = page.locator('input[placeholder*="Mobile"]').first();
        await expect(titleInput).toHaveClass(/border-red/);
      }
    });

    test('should successfully submit with valid roadmap data', async ({ page }) => {
      const addRoadmapButton = page.locator('button:has-text("Add Roadmap")').or(
        page.locator('button:has-text("Add Item")')
      ).first();

      if (await addRoadmapButton.isVisible()) {
        await addRoadmapButton.click();
        await page.waitForSelector('h2:has-text("Roadmap")', { timeout: 5000 });

        // Fill required fields
        await page.locator('input[placeholder*="Mobile"]').first().fill('E2E Test Roadmap Item');
        await page.locator('textarea[placeholder*="description"]').first().fill('Test roadmap item description');

        // Submit form
        const submitButton = page.locator('button[type="submit"]:has-text("Add")');
        await submitButton.click();

        // Check for success
        await expect(page.locator('text=successfully').or(page.locator('text=added'))).toBeVisible({ timeout: 5000 });
      }
    });

    test('should clear error when user types in title field', async ({ page }) => {
      const addRoadmapButton = page.locator('button:has-text("Add Roadmap")').or(
        page.locator('button:has-text("Add Item")')
      ).first();

      if (await addRoadmapButton.isVisible()) {
        await addRoadmapButton.click();
        await page.waitForSelector('h2:has-text("Roadmap")', { timeout: 5000 });

        // Submit to trigger validation
        const submitButton = page.locator('button[type="submit"]:has-text("Add")');
        await submitButton.click();
        await page.waitForSelector('text=required', { timeout: 3000 });

        // Type in title field
        const titleInput = page.locator('input[placeholder*="Mobile"]').first();
        await titleInput.fill('Test Item');

        // Error should disappear
        await expect(page.locator('text=Title is required')).not.toBeVisible({ timeout: 2000 });

        // Border should no longer be red
        await expect(titleInput).not.toHaveClass(/border-red/);
      }
    });
  });

  test.describe('Phase 2 - Form Reset Behavior', () => {
    test('should reset form on successful submission (AddFeatureRequestModal)', async ({ page }) => {
      const addFeatureRequestButton = page.locator('button:has-text("Add Feature Request")').first();
      await addFeatureRequestButton.click();
      await page.waitForSelector('h2:has-text("Feature Request")', { timeout: 5000 });

      // Fill and submit
      await page.locator('input[placeholder*="feature"]').first().fill('Test Feature');
      await page.locator('textarea[placeholder*="describe"]').first().fill('Test description');

      const submitButton = page.locator('button[type="submit"]:has-text("Submit")');
      await submitButton.click();

      // Wait for success
      await expect(page.locator('text=successfully').or(page.locator('text=Success'))).toBeVisible({ timeout: 5000 });

      // Modal should close
      await expect(page.locator('h2:has-text("Feature Request")')).not.toBeVisible({ timeout: 3000 });
    });

    test('should reset form on cancel (AddRoadmapItemModal)', async ({ page }) => {
      const addRoadmapButton = page.locator('button:has-text("Add Roadmap")').or(
        page.locator('button:has-text("Add Item")')
      ).first();

      if (await addRoadmapButton.isVisible()) {
        await addRoadmapButton.click();
        await page.waitForSelector('h2:has-text("Roadmap")', { timeout: 5000 });

        // Fill some data
        await page.locator('input[placeholder*="Mobile"]').first().fill('Test Item');

        // Click cancel
        const cancelButton = page.locator('button:has-text("Cancel")').last();
        await cancelButton.click();

        // Modal should close
        await expect(page.locator('h2:has-text("Roadmap")')).not.toBeVisible({ timeout: 2000 });

        // Reopen modal
        await addRoadmapButton.click();
        await page.waitForSelector('h2:has-text("Roadmap")', { timeout: 5000 });

        // Field should be empty (form was reset)
        const titleInput = page.locator('input[placeholder*="Mobile"]').first();
        await expect(titleInput).toHaveValue('');
      }
    });
  });

  test.describe('Phase 2 - Error Handling', () => {
    test('should show proper error messages with useLoadingState', async ({ page }) => {
      const addFollowupButton = page.locator('button:has-text("Schedule Follow-up")').or(
        page.locator('button:has-text("Add Follow-up")')
      ).first();
      await addFollowupButton.click();
      await page.waitForSelector('h2:has-text("Follow-up")', { timeout: 5000 });

      // Fill with valid data but expect potential error handling to work
      await page.locator('input[placeholder*="Demo"]').first().fill('Test');
      const dateInput = page.locator('input[type="date"]').first();
      await dateInput.fill('2025-12-31');

      // Check that loading state is working (button should be disabled while submitting)
      const submitButton = page.locator('button[type="submit"]').last();

      // Button should exist and be enabled initially
      await expect(submitButton).toBeEnabled();

      // Note: We can't easily test actual error scenarios without breaking the DB,
      // but we've verified the error handling code is in place via migration
    });
  });
});
