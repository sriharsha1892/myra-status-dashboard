import { Page } from '@playwright/test';

/**
 * Shared authentication helper for E2E tests
 */
export async function loginToApp(page: Page) {
  // Navigate to login page
  await page.goto('/support/login');

  // Fill login form
  await page.fill('input[type="email"]', 'test@example.com');
  await page.fill('input[type="password"]', 'password123');

  // Submit login
  await page.click('button[type="submit"]');

  // Wait for any navigation to complete (don't wait for specific URL)
  await page.waitForLoadState('networkidle', { timeout: 10000 });

  // Give it a moment for any client-side redirects or auth checks
  await page.waitForTimeout(1000);
}

/**
 * Login and navigate directly to trials page
 */
export async function loginAndGoToTrials(page: Page) {
  await loginToApp(page);

  // Navigate directly to trials page
  await page.goto('/support/trials');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000); // Wait for any dynamic content
}
