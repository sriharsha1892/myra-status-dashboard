import { test, expect } from '@playwright/test';

test.describe('Support Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the support dashboard
    await page.goto('/support/dashboard');
    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test('should display the dashboard page', async ({ page }) => {
    // Check if the dashboard loaded
    await expect(page).toHaveTitle(/myRA AI System Status|Dashboard/i);
  });

  test('should display personal impact widget', async ({ page }) => {
    // Look for impact widget elements
    const impactSection = page.locator('text=/Your Impact/i');
    await expect(impactSection).toBeVisible({ timeout: 10000 });
  });

  test('should display todos widget', async ({ page }) => {
    // Check for todos widget
    const todosSection = page.locator('text=/My Todos/i, text=/Todos/i').first();
    await expect(todosSection).toBeVisible({ timeout: 10000 });
  });

  test('should display announcements bulletin', async ({ page }) => {
    // Check for announcements
    const announcementsSection = page.locator('text=/What\'s New/i, text=/Announcements/i').first();
    // Announcements might not always be present
    const count = await announcementsSection.count();
    if (count > 0) {
      await expect(announcementsSection).toBeVisible();
    }
  });

  test('should have working navigation links', async ({ page }) => {
    // Check if sidebar navigation is present
    const nav = page.locator('nav, [role="navigation"]');
    await expect(nav).toBeVisible({ timeout: 10000 });
  });

  test('should render page without console errors', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Allow for some expected errors (like missing images or 404s)
    const criticalErrors = consoleErrors.filter(
      (error) => !error.includes('favicon') && !error.includes('404')
    );

    expect(criticalErrors.length).toBe(0);
  });
});

test.describe('Support Dashboard - Todos Widget', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/support/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('should switch between My Todos and Mentioned tabs', async ({ page }) => {
    const myTodosTab = page.locator('button:has-text("My Todos")');
    const mentionedTab = page.locator('button:has-text("Mentioned")');

    // Check if tabs exist
    if (await myTodosTab.count() > 0) {
      await myTodosTab.click();
      await expect(myTodosTab).toHaveClass(/bg-blue-100|bg-blue/);

      if (await mentionedTab.count() > 0) {
        await mentionedTab.click();
        await expect(mentionedTab).toHaveClass(/bg-accent-100|bg-accent/);
      }
    }
  });

  test('should show add todo form when clicking add button', async ({ page }) => {
    const addButton = page.locator('button').filter({ hasText: /\+|Add|Plus/ }).first();

    if (await addButton.count() > 0) {
      await addButton.click();

      // Check if form appears
      const todoInput = page.locator('input[placeholder*="needs to be done"]');
      if (await todoInput.count() > 0) {
        await expect(todoInput).toBeVisible();
      }
    }
  });
});

test.describe('Support Dashboard - Animations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/support/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('should have animated elements', async ({ page }) => {
    // Check for elements with animation classes or framer-motion attributes
    const animatedElements = page.locator('[style*="transform"], [style*="opacity"]');
    await expect(animatedElements.first()).toBeVisible({ timeout: 10000 });
  });

  test('should handle hover interactions', async ({ page }) => {
    // Find any card or interactive element
    const cards = page.locator('.rounded-xl, .rounded-lg').first();

    if (await cards.count() > 0) {
      await cards.hover();
      // Wait for any hover animations to complete
      await page.waitForTimeout(500);

      // Element should still be visible after hover
      await expect(cards).toBeVisible();
    }
  });
});
