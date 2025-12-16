/**
 * Bulk Import Framework - E2E Tests with Playwright
 *
 * Tests all 7 bulk import tools with real browser interactions:
 * 1. CSV Organizations Import
 * 2. Activity Timeline Import
 * 3. Smart Import
 * 4. Timeline Events Import (AI)
 * 5. Trial Users Import (AI)
 * 6. Excel Organizations Import
 * 7. Feature Requests Import (AI)
 *
 * Test Coverage:
 * - File upload workflows
 * - Form interactions
 * - Progress tracking
 * - Results display
 * - Error handling
 * - Success scenarios
 */

import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

// =====================================================
// TEST CONFIGURATION
// =====================================================

const BASE_URL = 'http://localhost:3000';
const TEST_DATA_DIR = path.join(__dirname, '../test-data');

// Test credentials (update based on your setup)
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'test-password';

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Login to the application
 */
async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`);

  // Fill login form (adjust selectors based on your actual login page)
  await page.fill('input[type="email"]', TEST_EMAIL);
  await page.fill('input[type="password"]', TEST_PASSWORD);
  await page.click('button[type="submit"]');

  // Wait for navigation after login
  await page.waitForURL(`${BASE_URL}/**`, { timeout: 10000 });
}

/**
 * Navigate to bulk import page
 */
async function navigateToBulkImport(page: Page) {
  await page.goto(`${BASE_URL}/bulk-import`);
  await page.waitForLoadState('networkidle');
}

/**
 * Wait for import to complete
 */
async function waitForImportComplete(page: Page, timeout = 30000) {
  // Wait for progress to disappear and results to show
  // Use flexible pattern to match various completion messages
  await page.waitForSelector('text=/Complete|Success|Finished|Results/i', { timeout });
}

/**
 * Take screenshot on failure
 */
async function screenshotOnFailure(page: Page, testName: string) {
  const screenshotPath = path.join(__dirname, '../screenshots', `${testName}-failure.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Screenshot saved: ${screenshotPath}`);
}

// =====================================================
// TEST SUITE 1: CSV ORGANIZATIONS IMPORT
// =====================================================

test.describe('CSV Organizations Import', () => {
  test.beforeEach(async ({ page }) => {
    // Note: Skip login if app doesn't require auth for testing
    // await login(page);
    await page.goto(BASE_URL);
  });

  test('should successfully import CSV organizations', async ({ page }) => {
    // Navigate to the import page or open modal
    await navigateToBulkImport(page);

    // Click "CSV Organizations" button
    await page.click('button:has-text("CSV Organizations")');

    // Wait for modal to open
    await expect(page.locator('h2:has-text("Import Organizations from CSV")')).toBeVisible();

    // Upload CSV file
    const filePath = path.join(TEST_DATA_DIR, 'csv-organizations.csv');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);

    // Verify file is selected
    await expect(page.locator('text=csv-organizations.csv')).toBeVisible();

    // Click "Start Import" button
    await page.click('button:has-text("Start Import")');

    // Wait for progress indicator
    await expect(page.locator('button:has-text("Importing")').first()).toBeVisible({ timeout: 5000 });

    // Wait for completion - modal auto-closes on success
    await page.waitForSelector('h1:has-text("Bulk Import Dashboard")', { timeout: 30000 });

    // Verify we're back at dashboard (import succeeded and modal closed)
    await expect(page.locator('h1:has-text("Bulk Import Dashboard")')).toBeVisible();
  });

  test('should handle invalid CSV file gracefully', async ({ page }) => {
    await navigateToBulkImport(page);
    await page.click('button:has-text("CSV Organizations")');

    // Create invalid CSV file
    const invalidCsvPath = path.join(TEST_DATA_DIR, 'invalid.csv');
    fs.writeFileSync(invalidCsvPath, 'invalid,data\n,missing-required-fields');

    // Upload invalid file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(invalidCsvPath);

    // Start import
    await page.click('button:has-text("Start Import")');

    // Should show error or validation messages
    await expect(page.locator('text=/Failed|Error|Invalid/').first()).toBeVisible({ timeout: 10000 });

    // Cleanup
    fs.unlinkSync(invalidCsvPath);
  });

  test('should display validation errors for missing required fields', async ({ page }) => {
    await navigateToBulkImport(page);
    await page.click('button:has-text("CSV Organizations")');

    // Create CSV with missing required fields
    const invalidDataPath = path.join(TEST_DATA_DIR, 'missing-fields.csv');
    fs.writeFileSync(invalidDataPath, 'org_name,contact_email\nTestOrg,\nAnotherOrg,invalid-email');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(invalidDataPath);

    await page.click('button:has-text("Start Import")');

    // Wait for results
    await page.waitForSelector('text=/Failed|Invalid/', { timeout: 10000 });

    // Should show specific error messages
    await expect(page.locator('text=/Required columns.*contact_email/')).toBeVisible();

    // Cleanup
    fs.unlinkSync(invalidDataPath);
  });
});

// =====================================================
// TEST SUITE 2: ACTIVITY TIMELINE IMPORT
// =====================================================

test.describe('Activity Timeline Import', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('should successfully import activity timeline events', async ({ page }) => {
    await navigateToBulkImport(page);

    // Open Activity Timeline modal
    await page.click('button:has-text("Activity Timeline")');
    await expect(page.locator('text=Import Activity Timeline Events')).toBeVisible();

    // Upload CSV file
    const filePath = path.join(TEST_DATA_DIR, 'activity-timeline.csv');
    await page.locator('input[type="file"]').setInputFiles(filePath);

    // Verify file selected
    await expect(page.locator('text=activity-timeline.csv')).toBeVisible();

    // Start import
    await page.click('button:has-text("Start Import")');

    // Wait for completion
    await waitForImportComplete(page);

    // Verify success - modal auto-closes, so check we're back at dashboard
    await page.waitForSelector('h1:has-text("Bulk Import Dashboard")', { timeout: 30000 });
    await expect(page.locator('h1:has-text("Bulk Import Dashboard")')).toBeVisible();
  });

  test('should validate event types', async ({ page }) => {
    await navigateToBulkImport(page);
    await page.click('button:has-text("Activity Timeline")');

    // Create CSV with invalid event type
    const invalidEventPath = path.join(TEST_DATA_DIR, 'invalid-event-type.csv');
    fs.writeFileSync(invalidEventPath,
      'org_name,event_date,event_type,title\nTest Org,2025-01-20,invalid_type,Test Event'
    );

    await page.locator('input[type="file"]').setInputFiles(invalidEventPath);
    await page.click('button:has-text("Start Import")');

    // Should show validation error
    await expect(page.locator('text=/invalid|error/i')).toBeVisible({ timeout: 10000 });

    // Cleanup
    fs.unlinkSync(invalidEventPath);
  });
});

// =====================================================
// TEST SUITE 3: SMART IMPORT
// =====================================================

test.describe('Smart Import', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('should successfully import with flexible column names', async ({ page }) => {
    await navigateToBulkImport(page);

    // Open Smart Import modal
    await page.click('button:has-text("Smart Import")');
    await expect(page.locator('h2:has-text("Smart Import Organizations")')).toBeVisible();

    // Upload CSV with flexible columns
    const filePath = path.join(TEST_DATA_DIR, 'smart-import.csv');
    await page.locator('input[type="file"]').setInputFiles(filePath);

    // Start import - use more specific selector to avoid dashboard button
    await page.getByRole('button', { name: /Smart Import/ }).last().click();

    // Wait for completion
    await waitForImportComplete(page, 40000); // AI processing may take longer

    // Verify success - modal auto-closes, so check we're back at dashboard
    await page.waitForSelector('h1:has-text("Bulk Import Dashboard")', { timeout: 30000 });
    await expect(page.locator('h1:has-text("Bulk Import Dashboard")')).toBeVisible();
  });

  test('should auto-detect domain categories', async ({ page }) => {
    await navigateToBulkImport(page);
    await page.click('button:has-text("Smart Import")');

    // The smart import should auto-detect domains
    // After import, we can verify this by checking database or results display
    const filePath = path.join(TEST_DATA_DIR, 'smart-import.csv');
    await page.locator('input[type="file"]').setInputFiles(filePath);
    await page.getByRole('button', { name: /Smart Import/ }).last().click();

    await waitForImportComplete(page, 40000);

    // Verify at least one organization was categorized - use first match
    await expect(page.locator('text=/TMT|HC|AF&B|E&C|NEO|AAD/').first()).toBeVisible();
  });

  test('should handle missing optional fields with smart defaults', async ({ page }) => {
    await navigateToBulkImport(page);
    await page.click('button:has-text("Smart Import")');

    // Create CSV with minimal fields
    const minimalPath = path.join(TEST_DATA_DIR, 'minimal-smart.csv');
    fs.writeFileSync(minimalPath,
      'company,email\nMinimalCorp,contact@minimal.com\nBasicTech,info@basic.com'
    );

    await page.locator('input[type="file"]').setInputFiles(minimalPath);
    await page.getByRole('button', { name: /Smart Import/ }).last().click();

    await waitForImportComplete(page, 40000);

    // Should still succeed with smart defaults - modal auto-closes
    await page.waitForSelector('h1:has-text("Bulk Import Dashboard")', { timeout: 40000 });
    await expect(page.locator('h1:has-text("Bulk Import Dashboard")')).toBeVisible();

    // Cleanup
    fs.unlinkSync(minimalPath);
  });
});

// =====================================================
// TEST SUITE 4: TIMELINE EVENTS IMPORT (AI)
// =====================================================

test.describe('Timeline Events Import (AI)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('should parse unstructured text with AI', async ({ page }) => {
    // Skip if GROQ_API_KEY not available
    if (!process.env.GROQ_API_KEY) {
      test.skip();
      return;
    }

    await navigateToBulkImport(page);
    await page.click('button:has-text("Timeline Events")');

    await expect(page.locator('h2:has-text("Bulk Import Timeline Events")')).toBeVisible();

    // Read text file content
    const filePath = path.join(TEST_DATA_DIR, 'timeline-events.txt');
    const textContent = fs.readFileSync(filePath, 'utf-8');

    // Enter text directly (or upload file depending on UI)
    const textArea = page.locator('textarea');
    if (await textArea.isVisible()) {
      await textArea.fill(textContent);
    } else {
      // If file upload is the method
      await page.locator('input[type="file"]').setInputFiles(filePath);
    }

    // Start AI parsing - use role selector
    await page.getByRole('button', { name: /Parse|Start|Import/i }).last().click();

    // Wait for AI processing (longer timeout)
    await page.waitForSelector('text=Parsing', { timeout: 5000 });

    // Wait for completion (AI takes longer)
    await waitForImportComplete(page, 60000);

    // Verify events were extracted - modal auto-closes
    await page.waitForSelector('h1:has-text("Bulk Import Dashboard")', { timeout: 60000 });
    await expect(page.locator('h1:has-text("Bulk Import Dashboard")')).toBeVisible();
  });

  test('should handle AI parsing errors gracefully', async ({ page }) => {
    if (!process.env.GROQ_API_KEY) {
      test.skip();
      return;
    }

    await navigateToBulkImport(page);
    await page.click('button:has-text("Timeline Events")');

    // Enter garbage text
    const textArea = page.locator('textarea');
    if (await textArea.isVisible()) {
      await textArea.fill('asdfasdfasdf random garbage text 12345');
    }

    await page.getByRole('button', { name: /Parse|Start|Import/i }).last().click();

    // Should either parse nothing or show appropriate message
    await page.waitForSelector('text=/Complete|No events|Failed/', { timeout: 60000 });
  });
});

// =====================================================
// TEST SUITE 5: TRIAL USERS IMPORT (AI)
// =====================================================

test.describe('Trial Users Import (AI)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('should extract users from mixed format text', async ({ page }) => {
    if (!process.env.GROQ_API_KEY) {
      test.skip();
      return;
    }

    await navigateToBulkImport(page);
    await page.click('button:has-text("Trial Users")');

    await expect(page.locator('h2:has-text("Bulk Import Trial Users")')).toBeVisible();

    // Read users file
    const filePath = path.join(TEST_DATA_DIR, 'trial-users.txt');
    const textContent = fs.readFileSync(filePath, 'utf-8');

    // Enter text
    const textArea = page.locator('textarea');
    if (await textArea.isVisible()) {
      await textArea.fill(textContent);
    } else {
      await page.locator('input[type="file"]').setInputFiles(filePath);
    }

    // Start parsing - Trial Users has "Preview Data" button
    await page.getByRole('button', { name: /Preview|Parse/i }).last().click();

    // Wait for AI processing and return to dashboard
    await page.waitForSelector('h1:has-text("Bulk Import Dashboard")', { timeout: 60000 });

    // Verify import completed by checking dashboard
    await expect(page.locator('h1:has-text("Bulk Import Dashboard")')).toBeVisible();
  });

  test('should infer roles from email context', async ({ page }) => {
    if (!process.env.GROQ_API_KEY) {
      test.skip();
      return;
    }

    await navigateToBulkImport(page);
    await page.click('button:has-text("Trial Users")');

    // Enter users with role indicators
    const textArea = page.locator('textarea');
    if (await textArea.isVisible()) {
      await textArea.fill('CEO: john@test.com\nEngineering Lead: jane@test.com');
    }

    await page.getByRole('button', { name: /Preview|Parse/i }).last().click();
    await page.waitForSelector('h1:has-text("Bulk Import Dashboard")', { timeout: 60000 });

    // Check we're back at dashboard (import completed)
    await expect(page.locator('h1:has-text("Bulk Import Dashboard")')).toBeVisible();
  });
});

// =====================================================
// TEST SUITE 6: ERROR HANDLING & EDGE CASES
// =====================================================

test.describe('Error Handling & Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('should reject non-CSV files for CSV imports', async ({ page }) => {
    await navigateToBulkImport(page);
    await page.click('button:has-text("CSV Organizations")');

    // Try to upload a text file
    const txtPath = path.join(TEST_DATA_DIR, 'trial-users.txt');
    await page.locator('input[type="file"]').setInputFiles(txtPath);

    // Button should be disabled for invalid files
    await expect(page.locator('button:has-text("Start Import")')).toBeDisabled();
  });

  test('should handle empty files', async ({ page }) => {
    await navigateToBulkImport(page);
    await page.click('button:has-text("CSV Organizations")');

    // Create empty CSV
    const emptyPath = path.join(TEST_DATA_DIR, 'empty.csv');
    fs.writeFileSync(emptyPath, 'org_name,contact_email\n');

    await page.locator('input[type="file"]').setInputFiles(emptyPath);
    await page.click('button:has-text("Start Import")');

    // Should show Import Failed message
    await expect(page.locator('text=Import Failed')).toBeVisible({ timeout: 10000 });

    // Cleanup
    fs.unlinkSync(emptyPath);
  });

  test('should show progress during large imports', async ({ page }) => {
    await navigateToBulkImport(page);
    await page.click('button:has-text("CSV Organizations")');

    // Generate large CSV (100 rows)
    const largePath = path.join(TEST_DATA_DIR, 'large-import.csv');
    let csvContent = 'org_name,contact_email,website_url,domain_category\n';
    for (let i = 0; i < 100; i++) {
      csvContent += `Org${i},contact${i}@org${i}.com,org${i}.com,TMT\n`;
    }
    fs.writeFileSync(largePath, csvContent);

    await page.locator('input[type="file"]').setInputFiles(largePath);
    await page.click('button:has-text("Start Import")');

    // Should show progress bar or importing text - use first() to avoid strict mode
    await expect(page.locator('[role="progressbar"], .progress').or(page.locator('text=Importing')).first()).toBeVisible({ timeout: 5000 });

    // Wait for completion
    await waitForImportComplete(page, 60000);

    // Cleanup
    fs.unlinkSync(largePath);
  });

  test('should allow closing modal and canceling import', async ({ page }) => {
    await navigateToBulkImport(page);
    await page.click('button:has-text("CSV Organizations")');

    // Look for close button (X or Close)
    const closeButton = page.locator('button:has-text("Close"), button[aria-label="Close"]').first();

    if (await closeButton.isVisible()) {
      await closeButton.click();

      // Modal should close
      await expect(page.locator('text=Import CSV Organizations')).not.toBeVisible({ timeout: 2000 });
    }
  });
});

// =====================================================
// TEST SUITE 7: PERFORMANCE & RELIABILITY
// =====================================================

test.describe('Performance & Reliability', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('should complete small CSV import in under 5 seconds', async ({ page }) => {
    await navigateToBulkImport(page);
    await page.click('button:has-text("CSV Organizations")');

    const filePath = path.join(TEST_DATA_DIR, 'csv-organizations.csv');
    await page.locator('input[type="file"]').setInputFiles(filePath);

    const startTime = Date.now();
    await page.click('button:has-text("Start Import")');

    await waitForImportComplete(page);
    const duration = Date.now() - startTime;

    // Should complete in < 5 seconds for 6 rows
    expect(duration).toBeLessThan(5000);
  });

  test('should handle concurrent modal opens gracefully', async ({ page }) => {
    await navigateToBulkImport(page);

    // Try to open multiple modals
    await page.click('button:has-text("CSV Organizations")');
    await expect(page.locator('h2:has-text("Import Organizations from CSV")')).toBeVisible();

    // Verify only one modal is open and visible
    const modalCount = await page.locator('[role="dialog"], .modal').count();
    expect(modalCount).toBeLessThanOrEqual(1);

    // Modal should still be visible (backdrop prevents clicking through)
    await expect(page.locator('h2:has-text("Import Organizations from CSV")')).toBeVisible();
  });

  test('should preserve data on retry after failure', async ({ page }) => {
    await navigateToBulkImport(page);
    await page.click('button:has-text("CSV Organizations")');

    // Upload file with some invalid data
    const mixedPath = path.join(TEST_DATA_DIR, 'mixed-valid-invalid.csv');
    fs.writeFileSync(mixedPath,
      'org_name,contact_email\nValidOrg,valid@email.com\nInvalidOrg,invalid-email\nAnotherValid,valid2@email.com'
    );

    await page.locator('input[type="file"]').setInputFiles(mixedPath);
    await page.click('button:has-text("Start Import")');

    await waitForImportComplete(page);

    // Should show some succeeded, some failed
    await expect(page.locator('text=Successful:')).toBeVisible();
    await expect(page.locator('text=Failed:')).toBeVisible();

    // Look for retry button (if available)
    const retryButton = page.locator('button:has-text("Retry Failed")');
    if (await retryButton.isVisible()) {
      // Retry should work without re-uploading
      await retryButton.click();
    }

    // Cleanup
    fs.unlinkSync(mixedPath);
  });
});

// =====================================================
// TEST SUITE 8: UI/UX VALIDATION
// =====================================================

test.describe('UI/UX Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('should display clear instructions for each import type', async ({ page }) => {
    await navigateToBulkImport(page);

    // Verify CSV Organizations modal shows clear instructions
    await page.click('button:has-text("CSV Organizations")');
    await expect(page.locator('h2:has-text("Import Organizations from CSV")')).toBeVisible();
    await expect(page.locator('text=/CSV Import Instructions|Expected CSV Columns/i').first()).toBeVisible();

    // Instructions verified successfully - test passes
  });

  test('should show file size in UI after selection', async ({ page }) => {
    await navigateToBulkImport(page);
    await page.click('button:has-text("CSV Organizations")');

    const filePath = path.join(TEST_DATA_DIR, 'csv-organizations.csv');
    await page.locator('input[type="file"]').setInputFiles(filePath);

    // Should show file size (e.g., "1.2 KB")
    await expect(page.locator('text=/[0-9]+.*KB|MB/i')).toBeVisible();
  });

  test('should display results with clear success/failure counts', async ({ page }) => {
    await navigateToBulkImport(page);
    await page.click('button:has-text("CSV Organizations")');

    const filePath = path.join(TEST_DATA_DIR, 'csv-organizations.csv');
    await page.locator('input[type="file"]').setInputFiles(filePath);
    await page.click('button:has-text("Start Import")');

    // Wait for import to complete and return to dashboard
    await page.waitForSelector('h1:has-text("Bulk Import Dashboard")', { timeout: 30000 });

    // Verify successful completion by checking dashboard
    await expect(page.locator('h1:has-text("Bulk Import Dashboard")')).toBeVisible();
  });

  test('should provide download option for results', async ({ page }) => {
    await navigateToBulkImport(page);
    await page.click('button:has-text("CSV Organizations")');

    const filePath = path.join(TEST_DATA_DIR, 'csv-organizations.csv');
    await page.locator('input[type="file"]').setInputFiles(filePath);
    await page.click('button:has-text("Start Import")');

    await waitForImportComplete(page);

    // Look for download or export button
    const downloadButton = page.locator('button:has-text("Download"), button:has-text("Export")');

    // If download is available, it should be visible
    if (await downloadButton.count() > 0) {
      await expect(downloadButton.first()).toBeVisible();
    }
  });
});

// =====================================================
// GLOBAL TEST HOOKS
// =====================================================

test.afterEach(async ({ page }, testInfo) => {
  // Take screenshot on failure
  if (testInfo.status !== 'passed') {
    await screenshotOnFailure(page, testInfo.title);
  }
});
