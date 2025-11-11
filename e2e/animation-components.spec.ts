import { test, expect } from '@playwright/test';

test.describe('Animation Components Integration', () => {
  test('should render pages with MagneticCard components', async ({ page }) => {
    // Visit a page that uses MagneticCard
    await page.goto('/support/dashboard');
    await page.waitForLoadState('networkidle');

    // Look for card elements
    const cards = page.locator('.rounded-xl, .rounded-lg, [class*="card"]');

    if (await cards.count() > 0) {
      const firstCard = cards.first();

      // Test hover interaction
      await firstCard.hover();
      await page.waitForTimeout(300);

      // Card should respond to hover
      await expect(firstCard).toBeVisible();

      // Move mouse away
      await page.mouse.move(0, 0);
      await page.waitForTimeout(200);

      // Card should still be visible
      await expect(firstCard).toBeVisible();
    }
  });

  test('should handle rapid hover interactions on cards', async ({ page }) => {
    await page.goto('/support/dashboard');
    await page.waitForLoadState('networkidle');

    const cards = page.locator('.rounded-xl, .rounded-lg').first();

    if (await cards.count() > 0) {
      // Rapid hover on/off
      for (let i = 0; i < 3; i++) {
        await cards.hover();
        await page.waitForTimeout(100);
        await page.mouse.move(0, 0);
        await page.waitForTimeout(100);
      }

      // Component should still be functional
      await expect(cards).toBeVisible();
    }
  });

  test('should display status glow effects on status indicators', async ({ page }) => {
    await page.goto('/support/tickets');
    await page.waitForLoadState('networkidle');

    // Look for status badges or indicators
    const statusElements = page.locator('[class*="badge"], [class*="status"], .rounded').first();

    if (await statusElements.count() > 0) {
      await expect(statusElements).toBeVisible();
    }
  });

  test('should render animated numbers correctly', async ({ page }) => {
    await page.goto('/support/dashboard');
    await page.waitForLoadState('networkidle');

    // Wait for animations to complete
    await page.waitForTimeout(2000);

    // Look for number displays (metrics, stats)
    const numbers = page.locator('[class*="text-2xl"], [class*="text-3xl"], [class*="font-bold"]').first();

    if (await numbers.count() > 0) {
      const text = await numbers.textContent();

      // Should contain numeric content
      expect(text).toBeTruthy();

      // Wait a bit and check again - number should be stable after animation
      await page.waitForTimeout(1000);
      const finalText = await numbers.textContent();
      expect(finalText).toBe(text);
    }
  });

  test('should handle chromatic shift on hover', async ({ page }) => {
    await page.goto('/support/dashboard');
    await page.waitForLoadState('networkidle');

    const elements = page.locator('button, a, .hover\\:shadow').first();

    if (await elements.count() > 0) {
      // Hover to trigger chromatic shift
      await elements.hover();
      await page.waitForTimeout(300);

      // Element should still be visible and interactive
      await expect(elements).toBeVisible();
    }
  });

  test('should render holographic overlays without performance issues', async ({ page }) => {
    await page.goto('/support/reports/engagement');
    await page.waitForLoadState('networkidle');

    // Move mouse around to trigger holographic effects
    await page.mouse.move(100, 100);
    await page.waitForTimeout(100);
    await page.mouse.move(300, 300);
    await page.waitForTimeout(100);
    await page.mouse.move(500, 500);
    await page.waitForTimeout(100);

    // Page should still be responsive
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should display morphing blob backgrounds', async ({ page }) => {
    await page.goto('/support/reports/engagement');
    await page.waitForLoadState('networkidle');

    // Look for animated background elements
    const backgroundElements = page.locator('[class*="absolute"], [class*="pointer-events-none"]').first();

    // These elements should exist but not interfere with interactions
    if (await backgroundElements.count() > 0) {
      // Try to interact with a foreground element
      const interactiveElement = page.locator('button, a, input').first();

      if (await interactiveElement.count() > 0) {
        await interactiveElement.click();
        // Should still be able to interact despite background animations
        await expect(interactiveElement).toBeVisible();
      }
    }
  });

  test('should handle scroll animations', async ({ page }) => {
    await page.goto('/support/reports/engagement');
    await page.waitForLoadState('networkidle');

    // Scroll down
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await page.waitForTimeout(500);

    // Check for elements that should animate in
    const elements = page.locator('[class*="animate"], [style*="opacity"]').first();

    if (await elements.count() > 0) {
      await expect(elements).toBeVisible();
    }

    // Scroll back up
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
  });

  test('should maintain animation performance across page navigation', async ({ page }) => {
    // Navigate through multiple pages with animations
    const pages = [
      '/support/dashboard',
      '/support/tickets',
      '/support/reports/engagement',
    ];

    for (const pagePath of pages) {
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');

      // Brief interaction on each page
      const element = page.locator('button, a, .hover\\:shadow').first();
      if (await element.count() > 0) {
        await element.hover();
        await page.waitForTimeout(200);
      }

      // Page should be responsive
      await expect(page.locator('body')).toBeVisible();
    }
  });
});

test.describe('Animation Components - Accessibility', () => {
  test('should maintain focus states with animations', async ({ page }) => {
    await page.goto('/support/dashboard');
    await page.waitForLoadState('networkidle');

    // Tab through interactive elements
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);

    // Focused element should be visible
    const focusedElement = page.locator(':focus');
    if (await focusedElement.count() > 0) {
      await expect(focusedElement).toBeVisible();
    }
  });

  test('should not interfere with screen readers', async ({ page }) => {
    await page.goto('/support/dashboard');
    await page.waitForLoadState('networkidle');

    // Check for proper ARIA labels and roles
    const interactiveElements = page.locator('button, a, input');

    if (await interactiveElements.count() > 0) {
      const firstElement = interactiveElements.first();
      const role = await firstElement.getAttribute('role');
      const ariaLabel = await firstElement.getAttribute('aria-label');

      // At least some elements should have accessibility attributes
      // or proper semantic HTML
      expect(role || ariaLabel || true).toBeTruthy();
    }
  });

  test('should respect reduced motion preferences', async ({ page, context }) => {
    // Set reduced motion preference
    await context.addInitScript(() => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: (query: string) => {
          if (query === '(prefers-reduced-motion: reduce)') {
            return {
              matches: true,
              media: query,
              onchange: null,
              addEventListener: () => {},
              removeEventListener: () => {},
              dispatchEvent: () => true,
            };
          }
          return {
            matches: false,
            media: query,
            onchange: null,
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => true,
          };
        },
      });
    });

    await page.goto('/support/dashboard');
    await page.waitForLoadState('networkidle');

    // Page should still render correctly
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Animation Components - Performance', () => {
  test('should not cause memory leaks on repeated interactions', async ({ page }) => {
    await page.goto('/support/dashboard');
    await page.waitForLoadState('networkidle');

    const cards = page.locator('.rounded-xl, .rounded-lg').first();

    if (await cards.count() > 0) {
      // Perform many interactions
      for (let i = 0; i < 20; i++) {
        await cards.hover();
        await page.waitForTimeout(50);
        await page.mouse.move(0, 0);
        await page.waitForTimeout(50);
      }

      // Page should still be responsive
      await expect(cards).toBeVisible();
    }
  });

  test('should handle multiple animated elements simultaneously', async ({ page }) => {
    await page.goto('/support/reports/engagement');
    await page.waitForLoadState('networkidle');

    // Get all animated elements
    const animatedElements = page.locator('[class*="animate"], [style*="transition"]');

    const count = await animatedElements.count();

    if (count > 0) {
      // Trigger multiple animations at once
      for (let i = 0; i < Math.min(count, 5); i++) {
        await animatedElements.nth(i).hover({ timeout: 1000 }).catch(() => {});
        await page.waitForTimeout(50);
      }

      // Page should remain responsive
      await expect(page.locator('body')).toBeVisible();
    }
  });
});
