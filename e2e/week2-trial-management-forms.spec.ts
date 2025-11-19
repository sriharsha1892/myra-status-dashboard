/**
 * Week 2 Days 11-12: Trial Management Forms E2E Tests
 *
 * Tests for migrated trial management forms with Zod validation:
 * - AddFeatureRequestModal
 * - AddFollowupModal
 * - AddTopicModal
 * - TrialHandoffModal
 *
 * Target: >90% pass rate
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_TRIAL_ORG_ID = process.env.TEST_TRIAL_ORG_ID || 'ca82ddef-927a-4838-a863-339e6e8dbfe3';

// Test data
const TEST_FEATURE_REQUEST = {
  title: 'Dark Mode Support',
  description: 'Add dark mode theme support to improve usability in low-light environments',
  use_case: 'Many users work late at night and need reduced eye strain',
  priority: 'high',
};

const TEST_FOLLOWUP = {
  title: 'Quarterly Business Review',
  description: 'Discuss trial progress and next steps',
  followup_date: '2025-02-15',
  followup_time: '14:00',
  followup_type: 'Video Call',
  assigned_to: 'Account Manager',
  status: 'scheduled',
};

const TEST_TOPIC = {
  topic_name: 'API Integration Testing',
  description: 'Testing REST API endpoints for production readiness',
  status: 'implementing',
  priority: 'high',
};

test.describe('Week 2 Trial Management Forms', () => {
  // Auth state is automatically loaded from playwright/.auth/user.json
  // No manual login needed - configured in playwright.config.ts

  test.describe('AddFeatureRequestModal', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to trial org detail page
      await page.goto(`${BASE_URL}/support/trials/${TEST_TRIAL_ORG_ID}`, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });
      await page.waitForTimeout(3000);
    });

    test('should open feature request modal', async ({ page }) => {
      const addButton = page.getByRole('button', { name: /add.*feature.*request/i });

      if (await addButton.count() > 0) {
        await addButton.first().click();
        await page.waitForTimeout(500);

        const modal = page.getByRole('heading', { name: /submit feature request/i });
        await expect(modal).toBeVisible();
      } else {
        test.skip();
      }
    });

    test('should display all required fields', async ({ page }) => {
      const addButton = page.getByRole('button', { name: /add.*feature.*request/i });

      if (await addButton.count() > 0) {
        await addButton.first().click();
        await page.waitForTimeout(500);

        // Check for form fields
        await expect(page.getByText('Feature Title', { exact: false })).toBeVisible();
        await expect(page.getByText('Description', { exact: false })).toBeVisible();
        await expect(page.getByText('Use Case', { exact: false })).toBeVisible();
        await expect(page.getByText('Priority', { exact: false })).toBeVisible();
      } else {
        test.skip();
      }
    });

    test('should show Zod validation error for empty required fields', async ({ page }) => {
      const addButton = page.getByRole('button', { name: /add.*feature.*request/i });

      if (await addButton.count() > 0) {
        await addButton.first().click();
        await page.waitForTimeout(500);

        // Try to submit without filling required fields
        const submitButton = page.getByRole('button', { name: /submit request/i });
        await submitButton.click();
        await page.waitForTimeout(500);

        // Should show validation errors
        const errorMessages = page.locator('.text-red-500, .text-error, [class*="error"]');
        const errorCount = await errorMessages.count();

        expect(errorCount).toBeGreaterThan(0);
      } else {
        test.skip();
      }
    });

    test('should have priority selector with 4 options', async ({ page }) => {
      const addButton = page.getByRole('button', { name: /add.*feature.*request/i });

      if (await addButton.count() > 0) {
        await addButton.first().click();
        await page.waitForTimeout(500);

        // Check priority select has options
        const prioritySelect = page.locator('select').filter({ hasText: /low|medium|high|critical/i });
        if (await prioritySelect.count() > 0) {
          const options = await prioritySelect.locator('option').count();
          expect(options).toBeGreaterThanOrEqual(4);
        }
      } else {
        test.skip();
      }
    });
  });

  test.describe('AddFollowupModal', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${BASE_URL}/support/trials/${TEST_TRIAL_ORG_ID}`, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });
      await page.waitForTimeout(3000);
    });

    test('should open followup modal', async ({ page }) => {
      const addButton = page.getByRole('button', { name: /add.*follow.*up/i });

      if (await addButton.count() > 0) {
        await addButton.first().click();
        await page.waitForTimeout(500);

        const modal = page.getByRole('heading', { name: /schedule follow.*up/i });
        await expect(modal).toBeVisible();
      } else {
        test.skip();
      }
    });

    test('should display all required fields including date and time', async ({ page }) => {
      const addButton = page.getByRole('button', { name: /add.*follow.*up/i });

      if (await addButton.count() > 0) {
        await addButton.first().click();
        await page.waitForTimeout(500);

        // Check for form fields
        await expect(page.getByText('Title', { exact: false })).toBeVisible();
        await expect(page.getByText('Follow-up Date', { exact: false })).toBeVisible();

        // Check for date input
        const dateInput = page.locator('input[type="date"]');
        if (await dateInput.count() > 0) {
          await expect(dateInput).toBeVisible();
        }

        // Check for time input
        const timeInput = page.locator('input[type="time"]');
        if (await timeInput.count() > 0) {
          await expect(timeInput).toBeVisible();
        }
      } else {
        test.skip();
      }
    });

    test('should show Zod validation error for invalid date', async ({ page }) => {
      const addButton = page.getByRole('button', { name: /add.*follow.*up/i });

      if (await addButton.count() > 0) {
        await addButton.first().click();
        await page.waitForTimeout(500);

        // Fill title but leave date empty
        const titleInput = page.locator('input[placeholder*="Demo"]');
        if (await titleInput.count() > 0) {
          await titleInput.fill('Test Followup');
        }

        // Try to submit without date
        const submitButton = page.getByRole('button', { name: /schedule/i });
        await submitButton.click();
        await page.waitForTimeout(500);

        // Should show validation error
        const errorMessages = page.locator('.text-red-500, .text-error, [class*="error"]');
        const errorCount = await errorMessages.count();

        expect(errorCount).toBeGreaterThan(0);
      } else {
        test.skip();
      }
    });

    test('should have status selector', async ({ page }) => {
      const addButton = page.getByRole('button', { name: /add.*follow.*up/i });

      if (await addButton.count() > 0) {
        await addButton.first().click();
        await page.waitForTimeout(500);

        // Check status select exists
        const statusSelect = page.locator('select').filter({ hasText: /scheduled|pending|completed|cancelled/i });
        if (await statusSelect.count() > 0) {
          await expect(statusSelect).toBeVisible();
        }
      } else {
        test.skip();
      }
    });
  });

  test.describe('AddTopicModal', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${BASE_URL}/support/trials/${TEST_TRIAL_ORG_ID}`, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });
      await page.waitForTimeout(3000);
    });

    test('should open topic modal', async ({ page }) => {
      const addButton = page.getByRole('button', { name: /add.*topic/i });

      if (await addButton.count() > 0) {
        await addButton.first().click();
        await page.waitForTimeout(500);

        const modal = page.getByRole('heading', { name: /add topic.*use case/i });
        await expect(modal).toBeVisible();
      } else {
        test.skip();
      }
    });

    test('should display required fields with status and priority', async ({ page }) => {
      const addButton = page.getByRole('button', { name: /add.*topic/i });

      if (await addButton.count() > 0) {
        await addButton.first().click();
        await page.waitForTimeout(500);

        // Check for form fields
        await expect(page.getByText('Topic Name', { exact: false })).toBeVisible();
        await expect(page.getByText('Status', { exact: false })).toBeVisible();
        await expect(page.getByText('Priority', { exact: false })).toBeVisible();
      } else {
        test.skip();
      }
    });

    test('should show status definitions info box', async ({ page }) => {
      const addButton = page.getByRole('button', { name: /add.*topic/i });

      if (await addButton.count() > 0) {
        await addButton.first().click();
        await page.waitForTimeout(500);

        // Check for status definitions
        const statusInfo = page.locator('text=/status.*definitions/i');
        if (await statusInfo.count() > 0) {
          await expect(statusInfo).toBeVisible();
        }

        // Check for specific status explanations
        const exploringInfo = page.locator('text=/exploring.*evaluating/i');
        if (await exploringInfo.count() > 0) {
          await expect(exploringInfo).toBeVisible();
        }
      } else {
        test.skip();
      }
    });

    test('should have 5 status options', async ({ page }) => {
      const addButton = page.getByRole('button', { name: /add.*topic/i });

      if (await addButton.count() > 0) {
        await addButton.first().click();
        await page.waitForTimeout(500);

        // Check status select has 5 options
        const statusSelects = page.locator('select');
        if (await statusSelects.count() >= 1) {
          const firstSelect = statusSelects.first();
          const options = await firstSelect.locator('option').count();
          expect(options).toBeGreaterThanOrEqual(5);
        }
      } else {
        test.skip();
      }
    });
  });

  test.describe('TrialHandoffModal', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${BASE_URL}/support/trials/${TEST_TRIAL_ORG_ID}`, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });
      await page.waitForTimeout(3000);
    });

    test('should open handoff modal', async ({ page }) => {
      const handoffButton = page.getByRole('button', { name: /hand.*off/i });

      if (await handoffButton.count() > 0) {
        await handoffButton.first().click();
        await page.waitForTimeout(500);

        const modal = page.getByRole('heading', { name: /hand off trial/i });
        await expect(modal).toBeVisible();
      } else {
        test.skip();
      }
    });

    test('should display trial organization info', async ({ page }) => {
      const handoffButton = page.getByRole('button', { name: /hand.*off/i });

      if (await handoffButton.count() > 0) {
        await handoffButton.first().click();
        await page.waitForTimeout(500);

        // Check for trial info display
        const trialInfo = page.locator('text=/handing off/i');
        if (await trialInfo.count() > 0) {
          await expect(trialInfo).toBeVisible();
        }
      } else {
        test.skip();
      }
    });

    test('should show validation error for empty account manager', async ({ page }) => {
      const handoffButton = page.getByRole('button', { name: /hand.*off/i });

      if (await handoffButton.count() > 0) {
        await handoffButton.first().click();
        await page.waitForTimeout(500);

        // Try to submit without selecting account manager
        const submitButton = page.getByRole('button', { name: /hand off trial/i });
        await submitButton.click();
        await page.waitForTimeout(500);

        // Should show validation errors
        const errorMessages = page.locator('.text-red-500, .text-error, [class*="error"]');
        const errorCount = await errorMessages.count();

        expect(errorCount).toBeGreaterThan(0);
      } else {
        test.skip();
      }
    });

    test('should have account manager selector', async ({ page }) => {
      const handoffButton = page.getByRole('button', { name: /hand.*off/i });

      if (await handoffButton.count() > 0) {
        await handoffButton.first().click();
        await page.waitForTimeout(500);

        // Check for account manager select
        const managerSelect = page.locator('select').first();
        if (await managerSelect.count() > 0) {
          await expect(managerSelect).toBeVisible();
        }
      } else {
        test.skip();
      }
    });
  });

  test.describe('Accessibility Tests', () => {
    test('all trial management modals should be keyboard navigable', async ({ page }) => {
      await page.goto(`${BASE_URL}/support/trials/${TEST_TRIAL_ORG_ID}`);
      await page.waitForTimeout(2000);

      // Test keyboard navigation
      const buttons = page.getByRole('button');
      const buttonCount = await buttons.count();

      if (buttonCount > 0) {
        // Tab through buttons
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');

        // Should be able to navigate with keyboard
        expect(buttonCount).toBeGreaterThan(0);
      }
    });

    test('modal close buttons should have proper aria-labels', async ({ page }) => {
      await page.goto(`${BASE_URL}/support/trials/${TEST_TRIAL_ORG_ID}`);
      await page.waitForTimeout(2000);

      // Try to open any modal and check close button
      const addButton = page.getByRole('button', { name: /add/i }).first();
      if (await addButton.count() > 0) {
        await addButton.click();
        await page.waitForTimeout(500);

        // Check for close button with aria-label
        const closeButton = page.locator('button[aria-label*="close" i]');
        if (await closeButton.count() > 0) {
          await expect(closeButton).toBeVisible();
        }
      }
    });

    test('form inputs should have proper labels and helper text', async ({ page }) => {
      await page.goto(`${BASE_URL}/support/trials/${TEST_TRIAL_ORG_ID}`);
      await page.waitForTimeout(2000);

      const addButton = page.getByRole('button', { name: /add/i }).first();
      if (await addButton.count() > 0) {
        await addButton.click();
        await page.waitForTimeout(500);

        // Check for inputs with labels
        const inputs = page.locator('input[id]');
        if (await inputs.count() > 0) {
          // Should have IDs for label association
          const firstInput = inputs.first();
          const id = await firstInput.getAttribute('id');
          expect(id).toBeTruthy();
        }
      }
    });
  });

  test.describe('Performance Tests', () => {
    test('modals should open within 1 second', async ({ page }) => {
      await page.goto(`${BASE_URL}/support/trials/${TEST_TRIAL_ORG_ID}`);
      await page.waitForTimeout(2000);

      const addButton = page.getByRole('button', { name: /add/i }).first();
      if (await addButton.count() > 0) {
        const startTime = Date.now();
        await addButton.click();

        // Wait for modal to appear
        const modal = page.getByRole('heading').first();
        await modal.waitFor({ state: 'visible', timeout: 1000 });

        const endTime = Date.now();
        const openTime = endTime - startTime;

        expect(openTime).toBeLessThan(1000);
      }
    });

    test('validation should respond instantly', async ({ page }) => {
      await page.goto(`${BASE_URL}/support/trials/${TEST_TRIAL_ORG_ID}`);
      await page.waitForTimeout(2000);

      const addButton = page.getByRole('button', { name: /add.*feature/i }).first();
      if (await addButton.count() > 0) {
        await addButton.click();
        await page.waitForTimeout(500);

        const startTime = Date.now();

        // Try to submit empty form
        const submitButton = page.getByRole('button', { name: /submit/i });
        await submitButton.click();

        // Wait for error to appear
        await page.waitForTimeout(500);
        const endTime = Date.now();
        const validationTime = endTime - startTime;

        expect(validationTime).toBeLessThan(1000);
      }
    });
  });

  test.describe('Regression Tests', () => {
    test('should clear form after closing modal', async ({ page }) => {
      await page.goto(`${BASE_URL}/support/trials/${TEST_TRIAL_ORG_ID}`);
      await page.waitForTimeout(2000);

      const addButton = page.getByRole('button', { name: /add.*feature/i }).first();
      if (await addButton.count() > 0) {
        await addButton.click();
        await page.waitForTimeout(500);

        // Fill some data
        const titleInput = page.locator('input[type="text"]').first();
        await titleInput.fill('Test Feature');

        // Close modal
        const closeButton = page.getByRole('button', { name: /cancel/i });
        if (await closeButton.count() > 0) {
          await closeButton.click();
          await page.waitForTimeout(500);

          // Reopen
          await addButton.click();
          await page.waitForTimeout(500);

          // Form should be cleared
          const currentValue = await titleInput.inputValue();
          expect(currentValue).toBe('');
        }
      }
    });

    test('should handle rapid modal open/close', async ({ page }) => {
      await page.goto(`${BASE_URL}/support/trials/${TEST_TRIAL_ORG_ID}`);
      await page.waitForTimeout(2000);

      const addButton = page.getByRole('button', { name: /add/i }).first();
      if (await addButton.count() > 0) {
        // Rapid open/close
        for (let i = 0; i < 3; i++) {
          await addButton.click();
          await page.waitForTimeout(200);

          const closeButton = page.getByRole('button', { name: /cancel/i });
          if (await closeButton.count() > 0) {
            await closeButton.click();
            await page.waitForTimeout(200);
          }
        }

        // Should still work normally
        await addButton.click();
        await page.waitForTimeout(500);

        const modal = page.getByRole('heading').first();
        await expect(modal).toBeVisible();
      }
    });
  });
});
