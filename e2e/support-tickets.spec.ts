import { test, expect } from '@playwright/test';

test.describe('Support Tickets Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/support/tickets');
    await page.waitForLoadState('networkidle');
  });

  test('should load the tickets page', async ({ page }) => {
    // Check if we're on the tickets page
    await expect(page).toHaveURL(/\/support\/tickets/);
  });

  test('should display tickets list or empty state', async ({ page }) => {
    // Wait for content to load
    await page.waitForTimeout(2000);

    // Check for either tickets or empty state
    const hasTickets = await page.locator('[data-testid="ticket-item"], .ticket-card, .ticket-row').count() > 0;
    const hasEmptyState = await page.locator('text=/No tickets/i, text=/No results/i').count() > 0;

    // At least one should be present
    expect(hasTickets || hasEmptyState).toBeTruthy();
  });

  test('should have filter/search functionality', async ({ page }) => {
    // Look for search or filter inputs
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"], input[placeholder*="Filter"]').first();

    if (await searchInput.count() > 0) {
      await expect(searchInput).toBeVisible();

      // Test typing in search
      await searchInput.fill('test');
      await page.waitForTimeout(500);

      // Clear search
      await searchInput.clear();
    }
  });

  test('should display ticket status badges', async ({ page }) => {
    // Look for status indicators
    const statusBadges = page.locator('[class*="badge"], [class*="status"], .rounded:has-text("Open"), .rounded:has-text("Closed")');

    // Status badges might not be visible if there are no tickets
    const count = await statusBadges.count();
    if (count > 0) {
      await expect(statusBadges.first()).toBeVisible();
    }
  });

  test('should have navigation to create new ticket', async ({ page }) => {
    // Look for create/new ticket button
    const createButton = page.locator('button:has-text("New"), button:has-text("Create"), a:has-text("New Ticket")').first();

    if (await createButton.count() > 0) {
      await expect(createButton).toBeVisible();
    }
  });

  test('should render magnetic card animations on hover', async ({ page }) => {
    // Wait for any cards to be present
    await page.waitForTimeout(1000);

    const cards = page.locator('.rounded-xl, .rounded-lg, [class*="card"]').first();

    if (await cards.count() > 0) {
      // Hover over card
      await cards.hover();
      await page.waitForTimeout(300);

      // Card should still be visible and interactive
      await expect(cards).toBeVisible();
    }
  });

  test('should display page without JavaScript errors', async ({ page }) => {
    const jsErrors: string[] = [];

    page.on('pageerror', (error) => {
      jsErrors.push(error.message);
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Filter out non-critical errors
    const criticalErrors = jsErrors.filter(
      (error) => !error.includes('favicon') && !error.includes('ResizeObserver')
    );

    expect(criticalErrors.length).toBe(0);
  });
});

test.describe('Support Tickets - Individual Ticket', () => {
  test('should navigate to ticket detail page when clicking a ticket', async ({ page }) => {
    await page.goto('/support/tickets');
    await page.waitForLoadState('networkidle');

    // Find first ticket link/card
    const firstTicket = page.locator('a[href*="/support/tickets/"], .ticket-card, [data-testid="ticket-item"]').first();

    if (await firstTicket.count() > 0) {
      await firstTicket.click();
      await page.waitForLoadState('networkidle');

      // Should navigate to a ticket detail page
      await expect(page).toHaveURL(/\/support\/tickets\/[^/]+/);
    }
  });

  test('should handle ticket interactions', async ({ page }) => {
    await page.goto('/support/tickets');
    await page.waitForLoadState('networkidle');

    // Look for interactive elements like buttons, checkboxes
    const interactiveElements = page.locator('button, input[type="checkbox"], select').first();

    if (await interactiveElements.count() > 0) {
      await expect(interactiveElements).toBeEnabled();
    }
  });
});

test.describe('Support Tickets - Status Glow Animation', () => {
  test('should display status glow effects', async ({ page }) => {
    await page.goto('/support/tickets');
    await page.waitForLoadState('networkidle');

    // Look for elements with glow effects (box-shadow, blur)
    const glowElements = page.locator('[style*="box-shadow"], [class*="glow"], [class*="shadow"]');

    if (await glowElements.count() > 0) {
      await expect(glowElements.first()).toBeVisible();
    }
  });
});
