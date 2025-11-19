import { test, expect } from '@playwright/test';

test.describe('Enhanced Toast System', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to toast test page
    await page.goto('/test-toast');

    // Wait for page to load
    await page.waitForSelector('h1:has-text("Enhanced Toast System")');
  });

  test('should show basic success toast', async ({ page }) => {
    // Click success toast button
    await page.click('[data-testid="toast-success"]');

    // Wait for toast to appear
    const toast = page.locator('text=Operation completed successfully');
    await expect(toast).toBeVisible({ timeout: 5000 });
  });

  test('should show error toast with no auto-dismiss', async ({ page }) => {
    // Click error toast button
    await page.click('[data-testid="toast-error"]');

    const toast = page.locator('text=Something went wrong');
    await expect(toast).toBeVisible({ timeout: 5000 });

    // Wait 6 seconds (errors should not auto-dismiss)
    await page.waitForTimeout(6000);
    await expect(toast).toBeVisible();
  });

  test('should show toast with description', async ({ page }) => {
    // Click toast with description button
    await page.click('[data-testid="toast-with-description"]');

    await expect(page.locator('text=User account created')).toBeVisible();
    await expect(page.locator('text=Welcome email has been sent to the user')).toBeVisible();
  });

  test('should handle loading state transitions', async ({ page }) => {
    // Click loading button
    await page.click('[data-testid="toast-loading"]');

    // Verify loading toast appears
    await expect(page.locator('text=Processing your request...')).toBeVisible();

    // Click resolve button
    await page.click('[data-testid="toast-resolve"]');

    await expect(page.locator('text=Request completed successfully')).toBeVisible();
  });

  test('should show toast with retry action', async ({ page }) => {
    // Click retry test button
    await page.click('[data-testid="toast-with-retry"]');

    // Wait for toast
    await expect(page.locator('text=Operation failed (attempt 1)')).toBeVisible();

    // Click retry button (the one in the toast, not the test button)
    const retryButton = page.locator('[data-testid="toast-retry-button"]').first();
    await expect(retryButton).toBeVisible();
    await retryButton.click();

    // Should show attempt 2
    await expect(page.locator('text=Operation failed (attempt 2)')).toBeVisible();
  });

  test('should show toast with custom actions', async ({ page }) => {
    // Click custom actions button
    await page.click('[data-testid="toast-with-actions"]');

    await expect(page.locator('text=New feature available')).toBeVisible();

    const actionButton = page.locator('button:has-text("View Now")');
    await expect(actionButton).toBeVisible();
    await actionButton.click();

    // Should show success toast
    await expect(page.locator('text=Navigating to analytics...')).toBeVisible();
  });

  test('should support progressive disclosure', async ({ page }) => {
    // Click expandable toast button
    await page.click('[data-testid="toast-expandable"]');

    await expect(page.locator('text=Database connection failed')).toBeVisible();
    await expect(page.locator('text=Unable to connect to the database server')).toBeVisible();

    // Technical details should not be visible initially
    await expect(page.locator('text=Connection timeout')).not.toBeVisible();

    // Click "Show details"
    const showDetailsButton = page.locator('button:has-text("Show details")');
    await expect(showDetailsButton).toBeVisible();
    await showDetailsButton.click();

    // Technical details should now be visible
    await expect(page.locator('text=Connection timeout')).toBeVisible();
    await expect(page.locator('text=Error Code: DB_CONN_001')).toBeVisible();

    // Click "Show less"
    const showLessButton = page.locator('button:has-text("Show less")');
    await expect(showLessButton).toBeVisible();
    await showLessButton.click();

    // Technical details should be hidden again
    await expect(page.locator('text=Connection timeout')).not.toBeVisible();
  });

  test('should deduplicate toasts', async ({ page }) => {
    // Click deduplicate button
    await page.click('[data-testid="toast-deduplicate"]');

    // Should show count indicator (5)
    await expect(page.locator('text=User saved successfully (5)')).toBeVisible({ timeout: 5000 });
  });

  test('should dismiss toast when X button is clicked', async ({ page }) => {
    // Show a toast
    await page.click('[data-testid="toast-success"]');

    const toast = page.locator('text=Operation completed successfully');
    await expect(toast).toBeVisible();

    // Find and click dismiss button
    const dismissButton = page.locator('button[aria-label="Dismiss"]').first();
    await dismissButton.click();

    // Toast should disappear
    await expect(toast).not.toBeVisible({ timeout: 2000 });
  });

  test('should show different toast types with correct styling', async ({ page }) => {
    // Test success
    await page.click('[data-testid="toast-success"]');
    await expect(page.locator('text=Operation completed successfully')).toBeVisible();

    // Test error
    await page.click('[data-testid="toast-error"]');
    await expect(page.locator('text=Something went wrong')).toBeVisible();

    // Test warning
    await page.click('[data-testid="toast-warning"]');
    await expect(page.locator('text=Please review this carefully')).toBeVisible();

    // Test info
    await page.click('[data-testid="toast-info"]');
    await expect(page.locator('text=Here is some information')).toBeVisible();
  });

  test('should integrate with error handler', async ({ page }) => {
    // Click error handler button
    await page.click('[data-testid="toast-error-handler"]');

    // Wait a bit for the toast to appear
    await page.waitForTimeout(500);

    // Should have retry button (error handler adds retry automatically)
    await expect(page.locator('button:has-text("Retry")').last()).toBeVisible({ timeout: 5000 });

    // Should have "Report to Support" button
    await expect(page.locator('button:has-text("Report to Support")').last()).toBeVisible();
  });

  test('should show priority styling', async ({ page }) => {
    // Click critical priority button
    await page.click('[data-testid="toast-priority-critical"]');

    const toast = page.locator('text=Critical system failure');
    await expect(toast).toBeVisible();

    // Critical priority should have red left border on the enhanced toast container
    const toastContainer = page.locator('[data-testid="enhanced-toast-container"]').first();
    await expect(toastContainer).toBeVisible();

    const classes = await toastContainer.getAttribute('class');
    expect(classes).toContain('border-l');
  });

  test('should support dismissAll', async ({ page }) => {
    // Show multiple toasts
    await page.click('[data-testid="toast-success"]');
    await page.click('[data-testid="toast-error"]');
    await page.click('[data-testid="toast-warning"]');

    // Verify some are visible
    await expect(page.locator('text=Operation completed successfully')).toBeVisible();

    // Click dismiss all
    await page.click('[data-testid="toast-dismiss-all"]');

    // All should be dismissed
    await expect(page.locator('text=Operation completed successfully')).not.toBeVisible({ timeout: 2000 });
  });
});
