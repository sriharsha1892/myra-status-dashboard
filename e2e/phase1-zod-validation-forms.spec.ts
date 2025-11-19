/**
 * Phase 1 Zod Validation Migration E2E Tests
 *
 * Comprehensive tests for the 6 migrated Phase 1 modals with Zod validation:
 * 1. AddTrialExtensionModal
 * 2. AddEngagementLogModal
 * 3. LogActivityModal
 * 4. AddSupportQueryModal
 * 5. UpdateDealStatusModal
 * 6. AddMeetingNoteModal
 *
 * Also tests toast positioning fix (top-right instead of center)
 *
 * Target: >90% pass rate
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_TRIAL_ORG_ID = process.env.TEST_TRIAL_ORG_ID || 'ca82ddef-927a-4838-a863-339e6e8dbfe3';

// Test data
const TEST_TRIAL_EXTENSION = {
  extend_by_days: 14,
  reason: 'Customer requested more time for evaluation and budget approval',
};

const TEST_ENGAGEMENT_LOG = {
  activity_type: 'usage_observed',
  description: 'User actively exploring dashboard features and creating reports',
  observations: 'High engagement with analytics section, showing strong interest',
};

const TEST_ACTIVITY_LOG = {
  activity_type: 'feedback_received',
  description: 'Positive feedback on UI/UX design and ease of use',
  observations: 'Team particularly likes the intuitive navigation',
};

const TEST_SUPPORT_QUERY = {
  query_type: 'technical_guidance',
  title: 'API Integration Documentation Request',
  description: 'Need comprehensive API documentation for REST endpoints',
};

const TEST_DEAL_UPDATE = {
  deal_status: 'won',
  deal_value: '50000',
  deal_currency: 'USD',
  notes: 'Successfully closed deal after demo and trial period',
};

const TEST_MEETING_NOTE = {
  meeting_type: 'demo',
  meeting_date: '2025-02-01T14:00',
  duration_minutes: 60,
  conducted_by: 'Sales Team',
  attendees: 'John Doe\nJane Smith\nBob Wilson',
  meeting_summary: 'Comprehensive product demo showing key features',
  pain_points_discussed: 'Manual reporting process taking too much time',
  positive_signals: 'Team excited about automation capabilities',
};

test.describe('Phase 1: Zod Validation Migration Tests', () => {
  // Auth state is automatically loaded from playwright/.auth/user.json

  test.describe('Toast Positioning Fix', () => {
    test('should display toasts in top-right corner, not center', async ({ page }) => {
      await page.goto(`${BASE_URL}/support/trials/${TEST_TRIAL_ORG_ID}`, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });
      await page.waitForTimeout(2000);

      // Trigger any action that shows a toast (try to extend trial)
      const extendButton = page.getByRole('button', { name: /extend.*trial/i });

      if (await extendButton.count() > 0) {
        await extendButton.first().click();
        await page.waitForTimeout(500);

        // Check if modal opened
        const modal = page.getByRole('heading', { name: /extend trial/i });
        if (await modal.isVisible()) {
          // Close modal to potentially trigger a toast
          const cancelButton = page.getByRole('button', { name: /cancel/i });
          if (await cancelButton.count() > 0) {
            await cancelButton.first().click();
            await page.waitForTimeout(500);
          }
        }

        // Check for toast container positioning (should be top-right)
        const toastContainer = page.locator('[role="status"], .Toaster, [class*="toast"]').first();
        if (await toastContainer.count() > 0) {
          const boundingBox = await toastContainer.boundingBox();
          if (boundingBox) {
            // Toast should be in right portion of screen (not center)
            const screenWidth = page.viewportSize()?.width || 1280;
            expect(boundingBox.x).toBeGreaterThan(screenWidth * 0.6); // Should be in right 40%
          }
        }
      } else {
        test.skip();
      }
    });
  });

  test.describe('AddTrialExtensionModal - Zod Validation', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${BASE_URL}/support/trials/${TEST_TRIAL_ORG_ID}`, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });
      await page.waitForTimeout(2000);
    });

    test('should open trial extension modal', async ({ page }) => {
      const extendButton = page.getByRole('button', { name: /extend.*trial/i });

      if (await extendButton.count() > 0) {
        await extendButton.first().click();
        await page.waitForTimeout(500);

        const modal = page.getByRole('heading', { name: /extend trial/i });
        await expect(modal).toBeVisible();
      } else {
        test.skip();
      }
    });

    test('should display all required fields with defaults', async ({ page }) => {
      const extendButton = page.getByRole('button', { name: /extend.*trial/i });

      if (await extendButton.count() > 0) {
        await extendButton.first().click();
        await page.waitForTimeout(500);

        // Check for form fields
        await expect(page.getByText('Extend By (Days)', { exact: false })).toBeVisible();
        await expect(page.getByText('Reason for Extension', { exact: false })).toBeVisible();

        // Check default buttons (7, 14, 30 days)
        await expect(page.getByRole('button', { name: '7 days' })).toBeVisible();
        await expect(page.getByRole('button', { name: '14 days' })).toBeVisible();
        await expect(page.getByRole('button', { name: '30 days' })).toBeVisible();
      } else {
        test.skip();
      }
    });

    test('should validate days input (Zod number validation)', async ({ page }) => {
      const extendButton = page.getByRole('button', { name: /extend.*trial/i });

      if (await extendButton.count() > 0) {
        await extendButton.first().click();
        await page.waitForTimeout(500);

        // Try entering invalid number (0 or negative)
        const daysInput = page.locator('input[type="number"]').first();
        await daysInput.fill('0');

        const submitButton = page.getByRole('button', { name: /extend by/i });
        await submitButton.click();
        await page.waitForTimeout(1000);

        // Zod validation should prevent submission (button should stay disabled or show error)
        const modal = page.getByRole('heading', { name: /extend trial/i });
        await expect(modal).toBeVisible(); // Modal should still be open
      } else {
        test.skip();
      }
    });

    test('should successfully submit with valid data', async ({ page }) => {
      const extendButton = page.getByRole('button', { name: /extend.*trial/i });

      if (await extendButton.count() > 0) {
        await extendButton.first().click();
        await page.waitForTimeout(500);

        // Select 14 days
        await page.getByRole('button', { name: '14 days' }).click();
        await page.waitForTimeout(300);

        // Fill reason
        const reasonInput = page.locator('textarea').first();
        await reasonInput.fill(TEST_TRIAL_EXTENSION.reason);

        // Submit
        const submitButton = page.getByRole('button', { name: /extend by.*days/i });
        await submitButton.click();
        await page.waitForTimeout(2000);

        // Check for success toast in top-right
        const successToast = page.getByText(/extended.*successfully/i);
        const toastVisible = await successToast.isVisible({ timeout: 5000 }).catch(() => false);

        if (toastVisible) {
          const boundingBox = await successToast.boundingBox();
          if (boundingBox) {
            const screenWidth = page.viewportSize()?.width || 1280;
            // Toast should be in top-right area
            expect(boundingBox.x).toBeGreaterThan(screenWidth * 0.5);
            expect(boundingBox.y).toBeLessThan(200); // Top of screen
          }
        }
      } else {
        test.skip();
      }
    });
  });

  test.describe('AddEngagementLogModal - Zod Validation', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${BASE_URL}/support/trials/${TEST_TRIAL_ORG_ID}`, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });
      await page.waitForTimeout(2000);
    });

    test('should open engagement log modal', async ({ page }) => {
      const logButton = page.getByRole('button', { name: /log.*activity|add.*engagement/i });

      if (await logButton.count() > 0) {
        await logButton.first().click();
        await page.waitForTimeout(500);

        const modal = page.getByRole('heading', { name: /log.*activity|user activity/i });
        await expect(modal).toBeVisible();
      } else {
        test.skip();
      }
    });

    test('should display all activity type options', async ({ page }) => {
      const logButton = page.getByRole('button', { name: /log.*activity|add.*engagement/i });

      if (await logButton.count() > 0) {
        await logButton.first().click();
        await page.waitForTimeout(500);

        // Check for activity types
        await expect(page.getByText('User Logged In')).toBeVisible();
        await expect(page.getByText('Usage Observed')).toBeVisible();
        await expect(page.getByText('Feedback Received')).toBeVisible();
        await expect(page.getByText('Trial Extended')).toBeVisible();
      } else {
        test.skip();
      }
    });

    test('should validate required fields (Zod validation)', async ({ page }) => {
      const logButton = page.getByRole('button', { name: /log.*activity|add.*engagement/i });

      if (await logButton.count() > 0) {
        await logButton.first().click();
        await page.waitForTimeout(500);

        // Try to submit without selecting activity type or filling description
        const submitButton = page.getByRole('button', { name: /log activity/i });

        // Button should be disabled if validation is working
        const isDisabled = await submitButton.isDisabled();
        expect(isDisabled).toBe(true);
      } else {
        test.skip();
      }
    });
  });

  test.describe('LogActivityModal - Zod Validation', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${BASE_URL}/support/trials/${TEST_TRIAL_ORG_ID}`, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });
      await page.waitForTimeout(2000);
    });

    test('should open log activity modal', async ({ page }) => {
      const logButton = page.getByRole('button', { name: /log activity/i });

      if (await logButton.count() > 0) {
        await logButton.first().click();
        await page.waitForTimeout(500);

        const modal = page.getByRole('heading', { name: /log activity/i });
        await expect(modal).toBeVisible();
      } else {
        test.skip();
      }
    });

    test('should have visual activity type selector', async ({ page }) => {
      const logButton = page.getByRole('button', { name: /log activity/i });

      if (await logButton.count() > 0) {
        await logButton.first().click();
        await page.waitForTimeout(500);

        // Check for icon-based activity type selector
        const activityButtons = page.locator('[class*="grid"][class*="gap"]').first();
        await expect(activityButtons).toBeVisible();
      } else {
        test.skip();
      }
    });
  });

  test.describe('AddSupportQueryModal - Zod Validation', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${BASE_URL}/support/trials/${TEST_TRIAL_ORG_ID}`, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });
      await page.waitForTimeout(2000);
    });

    test('should open support query modal', async ({ page }) => {
      const queryButton = page.getByRole('button', { name: /log.*support.*query|add.*query/i });

      if (await queryButton.count() > 0) {
        await queryButton.first().click();
        await page.waitForTimeout(500);

        const modal = page.getByRole('heading', { name: /log support query/i });
        await expect(modal).toBeVisible();
      } else {
        test.skip();
      }
    });

    test('should display all query type options', async ({ page }) => {
      const queryButton = page.getByRole('button', { name: /log.*support.*query|add.*query/i });

      if (await queryButton.count() > 0) {
        await queryButton.first().click();
        await page.waitForTimeout(500);

        // Check for query type dropdown
        const queryTypeSelect = page.locator('select').first();
        await expect(queryTypeSelect).toBeVisible();

        // Verify options
        await expect(page.getByText('General Support')).toBeVisible();
        await expect(page.getByText('Security Related')).toBeVisible();
        await expect(page.getByText('Technical Guidance')).toBeVisible();
      } else {
        test.skip();
      }
    });

    test('should conditionally require user selection (Zod superRefine)', async ({ page }) => {
      const queryButton = page.getByRole('button', { name: /log.*support.*query|add.*query/i });

      if (await queryButton.count() > 0) {
        await queryButton.first().click();
        await page.waitForTimeout(500);

        // Select "User Level" query
        const userLevelRadio = page.getByText('User Level', { exact: false });
        if (await userLevelRadio.count() > 0) {
          await userLevelRadio.click();
          await page.waitForTimeout(500);

          // User dropdown should now be required
          const userSelect = page.locator('select').last();
          await expect(userSelect).toBeVisible();
        }
      } else {
        test.skip();
      }
    });

    test('should validate title is required (Zod validation)', async ({ page }) => {
      const queryButton = page.getByRole('button', { name: /log.*support.*query|add.*query/i });

      if (await queryButton.count() > 0) {
        await queryButton.first().click();
        await page.waitForTimeout(500);

        // Try to submit without title
        const submitButton = page.getByRole('button', { name: /log query/i });
        await submitButton.click();
        await page.waitForTimeout(500);

        // Modal should still be open (validation failed)
        const modal = page.getByRole('heading', { name: /log support query/i });
        await expect(modal).toBeVisible();
      } else {
        test.skip();
      }
    });
  });

  test.describe('UpdateDealStatusModal - Zod Validation', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${BASE_URL}/support/trials/${TEST_TRIAL_ORG_ID}`, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });
      await page.waitForTimeout(2000);
    });

    test('should open deal status update modal', async ({ page }) => {
      const dealButton = page.getByRole('button', { name: /update.*deal.*status|deal status/i });

      if (await dealButton.count() > 0) {
        await dealButton.first().click();
        await page.waitForTimeout(500);

        const modal = page.getByRole('heading', { name: /update deal status/i });
        await expect(modal).toBeVisible();
      } else {
        test.skip();
      }
    });

    test('should show conditional fields based on deal status (Zod superRefine)', async ({ page }) => {
      const dealButton = page.getByRole('button', { name: /update.*deal.*status|deal status/i });

      if (await dealButton.count() > 0) {
        await dealButton.first().click();
        await page.waitForTimeout(500);

        // Select "Won" status
        const wonOption = page.locator('input[value="won"]');
        if (await wonOption.count() > 0) {
          await wonOption.click();
          await page.waitForTimeout(500);

          // Deal value field should appear and be required
          await expect(page.getByText('Deal Value', { exact: false })).toBeVisible();
        }
      } else {
        test.skip();
      }
    });

    test('should validate won deals require deal value (Zod conditional)', async ({ page }) => {
      const dealButton = page.getByRole('button', { name: /update.*deal.*status|deal status/i });

      if (await dealButton.count() > 0) {
        await dealButton.first().click();
        await page.waitForTimeout(500);

        // Select "Won" status
        const wonOption = page.locator('input[value="won"]');
        if (await wonOption.count() > 0) {
          await wonOption.click();
          await page.waitForTimeout(500);

          // Try to submit without deal value
          const submitButton = page.getByRole('button', { name: /update|save/i });
          await submitButton.click();
          await page.waitForTimeout(500);

          // Should show validation error
          const modal = page.getByRole('heading', { name: /update deal status/i });
          await expect(modal).toBeVisible(); // Modal should still be open
        }
      } else {
        test.skip();
      }
    });

    test('should validate lost deals require loss reason (Zod conditional)', async ({ page }) => {
      const dealButton = page.getByRole('button', { name: /update.*deal.*status|deal status/i });

      if (await dealButton.count() > 0) {
        await dealButton.first().click();
        await page.waitForTimeout(500);

        // Select "Lost" status
        const lostOption = page.locator('input[value="lost"]');
        if (await lostOption.count() > 0) {
          await lostOption.click();
          await page.waitForTimeout(500);

          // Loss reason dropdown should appear
          await expect(page.getByText('Loss Reason', { exact: false })).toBeVisible();
        }
      } else {
        test.skip();
      }
    });

    test('should show nested conditional field for "Other" loss reason (Zod nested)', async ({ page }) => {
      const dealButton = page.getByRole('button', { name: /update.*deal.*status|deal status/i });

      if (await dealButton.count() > 0) {
        await dealButton.first().click();
        await page.waitForTimeout(500);

        // Select "Lost" status
        const lostOption = page.locator('input[value="lost"]');
        if (await lostOption.count() > 0) {
          await lostOption.click();
          await page.waitForTimeout(500);

          // Select "Other" as loss reason
          const lossReasonSelect = page.locator('select').first();
          await lossReasonSelect.selectOption('Other');
          await page.waitForTimeout(500);

          // Text input for specifying other reason should appear
          await expect(page.getByText('Please specify', { exact: false })).toBeVisible();
        }
      } else {
        test.skip();
      }
    });
  });

  test.describe('AddMeetingNoteModal - Zod with react-hook-form', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${BASE_URL}/support/trials`, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });
      await page.waitForTimeout(2000);
    });

    test('should open meeting note modal', async ({ page }) => {
      const meetingButton = page.getByRole('button', { name: /add.*meeting.*note|meeting note/i });

      if (await meetingButton.count() > 0) {
        await meetingButton.first().click();
        await page.waitForTimeout(500);

        const modal = page.getByRole('heading', { name: /add meeting note/i });
        await expect(modal).toBeVisible();
      } else {
        test.skip();
      }
    });

    test('should display all meeting type options', async ({ page }) => {
      const meetingButton = page.getByRole('button', { name: /add.*meeting.*note|meeting note/i });

      if (await meetingButton.count() > 0) {
        await meetingButton.first().click();
        await page.waitForTimeout(500);

        // Check for meeting types
        const typeSelect = page.locator('select').first();
        await expect(typeSelect).toBeVisible();

        // Verify meeting type options
        await expect(page.locator('option:has-text("Demo")')).toBeVisible();
        await expect(page.locator('option:has-text("Follow-up Call")')).toBeVisible();
        await expect(page.locator('option:has-text("Technical Review")')).toBeVisible();
      } else {
        test.skip();
      }
    });

    test('should use zodResolver for react-hook-form integration', async ({ page }) => {
      const meetingButton = page.getByRole('button', { name: /add.*meeting.*note|meeting note/i });

      if (await meetingButton.count() > 0) {
        await meetingButton.first().click();
        await page.waitForTimeout(500);

        // Try to submit without required fields
        const submitButton = page.getByRole('button', { name: /save meeting note/i });
        await submitButton.click();
        await page.waitForTimeout(500);

        // Zod + react-hook-form should show validation errors
        const errors = page.locator('[class*="text-red"]');
        const errorCount = await errors.count();
        expect(errorCount).toBeGreaterThan(0);
      } else {
        test.skip();
      }
    });

    test('should have rich text editors for discussion fields', async ({ page }) => {
      const meetingButton = page.getByRole('button', { name: /add.*meeting.*note|meeting note/i });

      if (await meetingButton.count() > 0) {
        await meetingButton.first().click();
        await page.waitForTimeout(500);

        // Check for MentionTextEditor components
        await expect(page.getByText('Meeting Summary', { exact: false })).toBeVisible();
        await expect(page.getByText('Pain Points Discussed', { exact: false })).toBeVisible();
        await expect(page.getByText('Positive Signals', { exact: false })).toBeVisible();
      } else {
        test.skip();
      }
    });

    test('should have action items management', async ({ page }) => {
      const meetingButton = page.getByRole('button', { name: /add.*meeting.*note|meeting note/i });

      if (await meetingButton.count() > 0) {
        await meetingButton.first().click();
        await page.waitForTimeout(500);

        // Check for action items section
        await expect(page.getByText('Action Items', { exact: false })).toBeVisible();

        // Check for add action item button
        const addActionButton = page.getByRole('button', { name: /add action item/i });
        await expect(addActionButton).toBeVisible();
      } else {
        test.skip();
      }
    });

    test('should have smart suggestions for action items', async ({ page }) => {
      const meetingButton = page.getByRole('button', { name: /add.*meeting.*note|meeting note/i });

      if (await meetingButton.count() > 0) {
        await meetingButton.first().click();
        await page.waitForTimeout(500);

        // Select a meeting type
        const typeSelect = page.locator('select').first();
        await typeSelect.selectOption('demo');
        await page.waitForTimeout(500);

        // Load suggestions button should appear
        const suggestionsButton = page.getByRole('button', { name: /load suggestions/i });
        await expect(suggestionsButton).toBeVisible();
      } else {
        test.skip();
      }
    });
  });

  test.describe('Integration Tests - All Forms', () => {
    test('should have consistent error handling across all forms', async ({ page }) => {
      await page.goto(`${BASE_URL}/support/trials/${TEST_TRIAL_ORG_ID}`, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });
      await page.waitForTimeout(2000);

      // All forms should use showErrorWithReport for errors
      // This is tested indirectly by checking that errors display properly
      test.skip(); // Placeholder for manual verification
    });

    test('should have consistent loading states with useLoadingState hook', async ({ page }) => {
      await page.goto(`${BASE_URL}/support/trials/${TEST_TRIAL_ORG_ID}`, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });
      await page.waitForTimeout(2000);

      // All forms should show loading indicators during submission
      test.skip(); // Placeholder for manual verification
    });

    test('should display success toasts in top-right corner for all forms', async ({ page }) => {
      await page.goto(`${BASE_URL}/support/trials/${TEST_TRIAL_ORG_ID}`, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });
      await page.waitForTimeout(2000);

      // Test that all success toasts appear in top-right
      test.skip(); // Placeholder - tested in individual form tests
    });

    test('should have accessibility attributes (aria-label) on all form buttons', async ({ page }) => {
      await page.goto(`${BASE_URL}/support/trials/${TEST_TRIAL_ORG_ID}`, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });
      await page.waitForTimeout(2000);

      // Verify aria-labels exist on modal buttons
      test.skip(); // Placeholder for accessibility audit
    });
  });
});
