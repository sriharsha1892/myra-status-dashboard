import { test, expect } from '@playwright/test';

test.describe('Resources Page - Comprehensive Testing', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('http://localhost:3000/support/login');
    await page.fill('input[type="email"]', 'admin@myra.ai');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/support/**');

    // Navigate to Resources
    await page.goto('http://localhost:3000/support/resources');
    await page.waitForLoadState('networkidle');
  });

  test('Page loads successfully with External tab as default', async ({ page }) => {
    // Check page title and header
    await expect(page.locator('h1')).toContainText('Resources');
    await expect(page.locator('text=Knowledge hub for teams and clients')).toBeVisible();

    // External tab should be active by default
    const externalTab = page.locator('button', { hasText: 'External' });
    await expect(externalTab).toHaveClass(/from-blue-500/);
    await expect(page.locator('text=Client Facing')).toBeVisible();
  });

  test('Tab switching works correctly', async ({ page }) => {
    // Start on External (default)
    const externalTab = page.locator('button', { hasText: 'External' });
    const internalTab = page.locator('button', { hasText: 'Internal' });

    await expect(externalTab).toHaveClass(/from-blue-500/);

    // Click Internal tab
    await internalTab.click();
    await page.waitForTimeout(500); // Wait for animation

    // Internal should now be active
    await expect(internalTab).toHaveClass(/from-purple-500/);
    await expect(page.locator('text=Team Only')).toBeVisible();

    // Click back to External
    await externalTab.click();
    await page.waitForTimeout(500);

    await expect(externalTab).toHaveClass(/from-blue-500/);
    await expect(page.locator('text=Client Facing')).toBeVisible();
  });

  test('Search bar functionality', async ({ page }) => {
    const searchInput = page.locator('input[type="text"]');

    // Search bar should be visible
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toHaveAttribute('placeholder', /Search client documentation/);

    // Type in search
    await searchInput.fill('test query');

    // AI badge should appear
    await expect(page.locator('text=AI').first()).toBeVisible();

    // Clear button should appear
    await expect(page.locator('text=Clear')).toBeVisible();

    // Click clear
    await page.locator('text=Clear').click();
    await expect(searchInput).toHaveValue('');
  });

  test('Search focus effects work', async ({ page }) => {
    const searchInput = page.locator('input[type="text"]');

    // Focus the search bar
    await searchInput.focus();
    await page.waitForTimeout(300); // Wait for animation

    // Check for focus styling (purple border)
    await expect(searchInput).toHaveClass(/border-purple-500/);
  });

  test('Quick filter buttons work', async ({ page }) => {
    const searchInput = page.locator('input[type="text"]');

    // Type something to show quick filters
    await searchInput.fill('test');

    // Documents filter should be visible
    await expect(page.locator('text=📄 Documents')).toBeVisible();

    // Click Documents filter
    await page.locator('text=📄 Documents').click();

    // Search should now include #documents
    await expect(searchInput).toHaveValue(/test #documents/);
  });

  test('Quick filters change based on tab', async ({ page }) => {
    const searchInput = page.locator('input[type="text"]');
    const internalTab = page.locator('button', { hasText: 'Internal' });

    // On External tab, type in search
    await searchInput.fill('test');

    // Only Documents should be visible
    await expect(page.locator('text=📄 Documents')).toBeVisible();

    // Switch to Internal tab
    await internalTab.click();
    await page.waitForTimeout(500);

    // Type in search again
    await searchInput.fill('test');

    // All three filters should be visible
    await expect(page.locator('text=📄 Documents')).toBeVisible();
    await expect(page.locator('text=💬 Discussions')).toBeVisible();
    await expect(page.locator('text=❓ Questions')).toBeVisible();
  });

  test('Admin can see Manage Announcements button', async ({ page }) => {
    // Should see Manage Announcements button (logged in as admin)
    const manageButton = page.locator('text=Manage Announcements');
    await expect(manageButton).toBeVisible();

    // Button should have golden/amber styling
    await expect(manageButton).toHaveClass(/from-amber-500/);
  });

  test('Manage Announcements modal opens and closes', async ({ page }) => {
    // Click Manage Announcements
    await page.locator('text=Manage Announcements').click();
    await page.waitForTimeout(300);

    // Modal should be visible
    await expect(page.locator('h2', { hasText: 'Manage Announcements' })).toBeVisible();

    // Close button should exist
    const closeButton = page.locator('button[aria-label="Close"], button:has-text("×")').first();
    await closeButton.click();
    await page.waitForTimeout(300);

    // Modal should be hidden
    await expect(page.locator('h2', { hasText: 'Manage Announcements' })).not.toBeVisible();
  });

  test('External tab displays resources correctly', async ({ page }) => {
    // Should be on External tab by default
    await page.waitForTimeout(500);

    // Check for external resources content
    // If there are resources, check for folder navigation
    const hasFolders = await page.locator('text=All Folders').isVisible().catch(() => false);

    if (hasFolders) {
      console.log('✓ Folders navigation is visible');
    }

    // Check for empty state or resource cards
    const hasResources = await page.locator('[class*="resource"]').count() > 0;
    const hasEmptyState = await page.locator('text=No resources found').isVisible().catch(() => false);

    expect(hasResources || hasEmptyState).toBeTruthy();
  });

  test('Internal tab shows three sections', async ({ page }) => {
    const internalTab = page.locator('button', { hasText: 'Internal' });

    // Click Internal tab
    await internalTab.click();
    await page.waitForTimeout(500);

    // Check for section buttons
    await expect(page.locator('text=Documents').first()).toBeVisible();
    await expect(page.locator('text=Discussions')).toBeVisible();
    await expect(page.locator('text=Q&A')).toBeVisible();
  });

  test('Internal tab sections are clickable', async ({ page }) => {
    const internalTab = page.locator('button', { hasText: 'Internal' });

    // Click Internal tab
    await internalTab.click();
    await page.waitForTimeout(500);

    // Click Discussions
    await page.locator('button:has-text("Discussions")').first().click();
    await page.waitForTimeout(300);

    // Should show discussions content
    await expect(page.locator('text=Team Discussions').or(page.locator('text=No discussions'))).toBeVisible();

    // Click Q&A
    await page.locator('button:has-text("Q&A")').first().click();
    await page.waitForTimeout(300);

    // Should show Q&A content
    await expect(page.locator('text=Questions & Answers').or(page.locator('text=No questions'))).toBeVisible();
  });

  test('Search placeholder changes with tab', async ({ page }) => {
    const searchInput = page.locator('input[type="text"]');
    const internalTab = page.locator('button', { hasText: 'Internal' });

    // On External tab
    await expect(searchInput).toHaveAttribute('placeholder', /Search client documentation/);

    // Switch to Internal
    await internalTab.click();
    await page.waitForTimeout(300);

    // Placeholder should change
    await expect(searchInput).toHaveAttribute('placeholder', /Ask anything about resources/);
  });

  test('Page is responsive and elements are visible', async ({ page }) => {
    // Check key elements are visible
    await expect(page.locator('h1:has-text("Resources")')).toBeVisible();
    await expect(page.locator('button:has-text("External")')).toBeVisible();
    await expect(page.locator('button:has-text("Internal")')).toBeVisible();
    await expect(page.locator('input[type="text"]')).toBeVisible();
  });

  test('Tab switching preserves search query', async ({ page }) => {
    const searchInput = page.locator('input[type="text"]');
    const internalTab = page.locator('button', { hasText: 'Internal' });
    const externalTab = page.locator('button', { hasText: 'External' });

    // Type search on External tab
    await searchInput.fill('test query');
    await expect(searchInput).toHaveValue('test query');

    // Switch to Internal
    await internalTab.click();
    await page.waitForTimeout(300);

    // Search should still be there
    await expect(searchInput).toHaveValue('test query');

    // Switch back to External
    await externalTab.click();
    await page.waitForTimeout(300);

    // Search should still be there
    await expect(searchInput).toHaveValue('test query');
  });

  test('Animation effects are applied', async ({ page }) => {
    const externalTab = page.locator('button', { hasText: 'External' });
    const internalTab = page.locator('button', { hasText: 'Internal' });

    // Active tab should have scale class
    await expect(externalTab).toHaveClass(/scale-105/);

    // Switch tabs
    await internalTab.click();
    await page.waitForTimeout(500);

    // New active tab should have scale
    await expect(internalTab).toHaveClass(/scale-105/);

    // Icon should have pulse animation
    const icon = internalTab.locator('svg').first();
    await expect(icon).toHaveClass(/animate-pulse/);
  });
});
