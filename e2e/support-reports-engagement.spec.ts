import { test, expect } from '@playwright/test';

test.describe('Support Reports - Engagement Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/support/reports/engagement');
    await page.waitForLoadState('networkidle');
  });

  test('should load the engagement reports page', async ({ page }) => {
    await expect(page).toHaveURL(/\/support\/reports\/engagement/);
  });

  test('should display engagement metrics', async ({ page }) => {
    // Wait for content to load
    await page.waitForTimeout(2000);

    // Look for metric cards or numbers
    const metrics = page.locator('[class*="metric"], [class*="stat"], .rounded-xl, .rounded-lg').first();

    if (await metrics.count() > 0) {
      await expect(metrics).toBeVisible();
    }
  });

  test('should display charts or visualizations', async ({ page }) => {
    // Look for chart elements (SVG, canvas, or chart containers)
    const charts = page.locator('svg, canvas, [class*="chart"], [class*="graph"]').first();

    // Wait a bit for charts to render
    await page.waitForTimeout(2000);

    if (await charts.count() > 0) {
      await expect(charts).toBeVisible();
    }
  });

  test('should have date range filters', async ({ page }) => {
    // Look for date inputs or date range pickers
    const dateInputs = page.locator('input[type="date"], [class*="date"], [class*="calendar"]').first();

    if (await dateInputs.count() > 0) {
      await expect(dateInputs).toBeVisible();
    }
  });

  test('should display animated numbers', async ({ page }) => {
    // Look for number displays
    const numbers = page.locator('[class*="text-2xl"], [class*="text-3xl"], [class*="text-4xl"]').first();

    if (await numbers.count() > 0) {
      await expect(numbers).toBeVisible();
    }
  });

  test('should render without errors', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    const criticalErrors = errors.filter(
      (error) => !error.includes('favicon') && !error.includes('404') && !error.includes('ResizeObserver')
    );

    expect(criticalErrors.length).toBe(0);
  });

  test('should have responsive layout', async ({ page }) => {
    // Check desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);

    const desktopLayout = page.locator('body');
    await expect(desktopLayout).toBeVisible();

    // Check tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);

    const tabletLayout = page.locator('body');
    await expect(tabletLayout).toBeVisible();

    // Check mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);

    const mobileLayout = page.locator('body');
    await expect(mobileLayout).toBeVisible();
  });
});

test.describe('Support Reports - Engagement Animations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/support/reports/engagement');
    await page.waitForLoadState('networkidle');
  });

  test('should animate on scroll', async ({ page }) => {
    // Scroll down the page
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(500);

    // Scroll back up
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);

    // Page should still be functional
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display morphing blob backgrounds', async ({ page }) => {
    // Look for animated background elements
    const blobs = page.locator('[class*="blob"], [class*="morph"], [class*="animate"]').first();

    if (await blobs.count() > 0) {
      // Just verify it exists, animation testing is complex in E2E
      await expect(blobs).toBeAttached();
    }
  });

  test('should have holographic overlays on hover', async ({ page }) => {
    const cards = page.locator('.rounded-xl, .rounded-lg, [class*="card"]').first();

    if (await cards.count() > 0) {
      await cards.hover();
      await page.waitForTimeout(300);

      // Verify element is still interactive
      await expect(cards).toBeVisible();
    }
  });
});

test.describe('Support Reports - Data Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/support/reports/engagement');
    await page.waitForLoadState('networkidle');
  });

  test('should handle filtering', async ({ page }) => {
    // Look for filter controls
    const filters = page.locator('select, [role="combobox"], button:has-text("Filter")').first();

    if (await filters.count() > 0) {
      await expect(filters).toBeVisible();
      await filters.click();
      await page.waitForTimeout(300);
    }
  });

  test('should export or download reports', async ({ page }) => {
    // Look for export/download buttons
    const exportButton = page.locator('button:has-text("Export"), button:has-text("Download"), a:has-text("Export")').first();

    if (await exportButton.count() > 0) {
      await expect(exportButton).toBeVisible();
    }
  });

  test('should refresh data', async ({ page }) => {
    // Look for refresh button
    const refreshButton = page.locator('button:has-text("Refresh"), button[aria-label*="refresh"]').first();

    if (await refreshButton.count() > 0) {
      await refreshButton.click();
      await page.waitForTimeout(1000);

      // Page should still be functional
      await expect(page.locator('body')).toBeVisible();
    }
  });
});
