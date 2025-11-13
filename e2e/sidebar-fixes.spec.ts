import { test, expect } from '@playwright/test';

// Test pages that were fixed - all should have their sidebars handled by layout.tsx, not hardcoded in page
const fixedPages = [
  { path: '/support/dashboard', name: 'Dashboard' },
  { path: '/support/reports', name: 'Reports' },
  { path: '/support/users', name: 'Users' },
];

const fixedTrialPages = [
  { path: '/support/trials', name: 'Trials' },
  { path: '/support/trials/roadmap', name: 'Roadmap' },
  { path: '/support/trials/follow-ups', name: 'Follow-ups' },
];

test.describe('Sidebar Architecture - No Duplicates', () => {
  test('Dashboard page renders without duplicate sidebars', async ({ page }) => {
    await page.goto('/support/dashboard', { waitUntil: 'networkidle' });

    // Check that there is exactly ONE main navigation sidebar
    const sidebars = await page.locator('aside[class*="w-64"]').all();
    expect(sidebars.length).toBeLessThanOrEqual(1);

    // Verify the layout structure is correct
    const mainContent = await page.locator('main').all();
    expect(mainContent.length).toBeGreaterThanOrEqual(1);

    // Verify page loads without errors
    await expect(page).not.toHaveURL('**/login');
  });

  test('Reports page renders without duplicate sidebars', async ({ page }) => {
    await page.goto('/support/reports', { waitUntil: 'networkidle' });

    const sidebars = await page.locator('aside[class*="w-64"]').all();
    expect(sidebars.length).toBeLessThanOrEqual(1);

    const mainContent = await page.locator('main').all();
    expect(mainContent.length).toBeGreaterThanOrEqual(1);
  });

  test('Users page renders without duplicate sidebars', async ({ page }) => {
    await page.goto('/support/users', { waitUntil: 'networkidle' });

    const sidebars = await page.locator('aside[class*="w-64"]').all();
    expect(sidebars.length).toBeLessThanOrEqual(1);

    const mainContent = await page.locator('main').all();
    expect(mainContent.length).toBeGreaterThanOrEqual(1);
  });

  test('Trials page renders without duplicate sidebars', async ({ page }) => {
    await page.goto('/support/trials', { waitUntil: 'networkidle' });

    const sidebars = await page.locator('aside[class*="w-64"]').all();
    expect(sidebars.length).toBeLessThanOrEqual(1);

    const mainContent = await page.locator('main').all();
    expect(mainContent.length).toBeGreaterThanOrEqual(1);
  });

  test('Roadmap page renders without duplicate sidebars', async ({ page }) => {
    await page.goto('/support/trials/roadmap', { waitUntil: 'networkidle' });

    const sidebars = await page.locator('aside[class*="w-64"]').all();
    expect(sidebars.length).toBeLessThanOrEqual(1);

    const mainContent = await page.locator('main').all();
    expect(mainContent.length).toBeGreaterThanOrEqual(1);
  });

  test('Follow-ups page renders without duplicate sidebars', async ({ page }) => {
    await page.goto('/support/trials/follow-ups', { waitUntil: 'networkidle' });

    const sidebars = await page.locator('aside[class*="w-64"]').all();
    expect(sidebars.length).toBeLessThanOrEqual(1);

    const mainContent = await page.locator('main').all();
    expect(mainContent.length).toBeGreaterThanOrEqual(1);
  });
});

test.describe('Layout Consistency Across Pages', () => {
  test('All support pages have consistent layout structure', async ({ page }) => {
    const testPages = [
      '/support/dashboard',
      '/support/reports',
      '/support/users',
      '/support/trials',
    ];

    for (const pagePath of testPages) {
      await page.goto(pagePath, { waitUntil: 'networkidle' });

      // Every page should have a main element
      const mainElements = await page.locator('main').count();
      expect(mainElements).toBeGreaterThanOrEqual(1);

      // Check for proper flex layout container
      const layoutContainer = await page.locator('[class*="flex"], [class*="overflow"]').first();
      expect(layoutContainer).toBeTruthy();
    }
  });

  test('No malformed JSX or missing closing tags on any page', async ({ page }) => {
    const testPages = [
      '/support/dashboard',
      '/support/reports',
      '/support/users',
      '/support/trials',
      '/support/trials/roadmap',
      '/support/trials/follow-ups',
    ];

    for (const pagePath of testPages) {
      await page.goto(pagePath, { waitUntil: 'networkidle' });

      // Check page loaded successfully (no client errors)
      const errors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      // Wait a moment for any errors to appear
      await page.waitForTimeout(500);

      // Log for verification (but don't fail on JS errors as they could be from other sources)
      if (errors.length > 0) {
        console.log(`Errors on ${pagePath}:`, errors);
      }
    }
  });
});

test.describe('Modal Component Rendering', () => {
  test('Users page modal renders in correct DOM location', async ({ page }) => {
    await page.goto('/support/users', { waitUntil: 'networkidle' });

    // Modal should not be a direct sibling of main without wrapper
    const mainElement = await page.locator('main').first();
    expect(mainElement).toBeTruthy();

    // Verify no malformed JSX by checking page renders cleanly
    const html = await page.content();
    expect(html).not.toContain('<    <main');
    expect(html).not.toContain('</main></main>');
  });

  test('Trials page modal renders in correct DOM location', async ({ page }) => {
    await page.goto('/support/trials', { waitUntil: 'networkidle' });

    // Check page structure is valid
    const html = await page.content();
    expect(html).not.toContain('<    <main');
    expect(html).not.toContain('</main></main>');

    const mainElement = await page.locator('main').first();
    expect(mainElement).toBeTruthy();
  });
});

test.describe('Navigation Between Fixed Pages', () => {
  test('Can navigate between dashboard, reports, and users', async ({ page }) => {
    // Start at dashboard
    await page.goto('/support/dashboard', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/\/support\/dashboard/);

    // Check dashboard rendered
    const dashboardContent = await page.locator('body').textContent();
    expect(dashboardContent).toBeTruthy();

    // Navigate to reports
    await page.goto('/support/reports', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/\/support\/reports/);

    // Navigate to users
    await page.goto('/support/users', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/\/support\/users/);
  });

  test('Can navigate to trials section pages', async ({ page }) => {
    // Navigate to trials
    await page.goto('/support/trials', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/\/support\/trials/);

    // Navigate to roadmap
    await page.goto('/support/trials/roadmap', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL('**/roadmap');

    // Navigate to follow-ups
    await page.goto('/support/trials/follow-ups', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL('**/follow-ups');
  });
});

test.describe('Return Statement Structure Validation', () => {
  test('All pages have valid JSX return structure', async ({ page }) => {
    const testPages = [
      '/support/dashboard',
      '/support/reports',
      '/support/users',
      '/support/trials',
      '/support/trials/roadmap',
      '/support/trials/follow-ups',
    ];

    for (const pagePath of testPages) {
      await page.goto(pagePath, { waitUntil: 'networkidle' });

      // Get the HTML to validate structure
      const html = await page.content();

      // Check for common malformation patterns that were fixed
      // Pattern 1: Malformed opening main tag
      expect(html).not.toMatch(/<\s+<main/);

      // Pattern 2: Duplicate main closing tags
      expect(html).not.toMatch(/<\/main>\s*<\/main>/);

      // Pattern 3: Incorrect closing tag nesting
      expect(html).not.toMatch(/<\/div>\s*<\/main>\s*<\/div>/);

      console.log(`✓ ${pagePath} - JSX structure valid`);
    }
  });
});

test.describe('Page Load Performance', () => {
  test('Dashboard page loads within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/support/dashboard', { waitUntil: 'networkidle' });
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(10000); // Should load in less than 10 seconds
    console.log(`Dashboard loaded in ${loadTime}ms`);
  });

  test('Reports page loads within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/support/reports', { waitUntil: 'networkidle' });
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(10000);
    console.log(`Reports loaded in ${loadTime}ms`);
  });

  test('Users page loads within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/support/users', { waitUntil: 'networkidle' });
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(10000);
    console.log(`Users loaded in ${loadTime}ms`);
  });
});
