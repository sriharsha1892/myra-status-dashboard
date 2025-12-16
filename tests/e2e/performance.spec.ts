/**
 * Performance Tests - Page Load & Response Times
 *
 * Tests critical performance metrics for production readiness
 */

import { test, expect } from '@playwright/test';

// Use authentication from setup
test.use({ storageState: 'playwright/.auth/user.json' });

// Performance thresholds (in milliseconds)
const THRESHOLDS = {
  pageLoad: 3000,           // Page should load within 3 seconds
  domContentLoaded: 2000,   // DOM should be ready within 2 seconds
  firstPaint: 1500,         // First paint within 1.5 seconds
  largestContentfulPaint: 2500, // LCP within 2.5 seconds (Core Web Vital)
  timeToInteractive: 3500,  // TTI within 3.5 seconds
  navigationSpeed: 1000,    // Client-side navigation within 1 second
};

test.describe('Performance Tests', () => {

  test('should load trials page within performance budget', async ({ page }) => {
    console.log('\n🎯 PERFORMANCE TEST: Trials Page Load\n');

    const startTime = Date.now();

    // Navigate and measure load time
    const response = await page.goto('/support/trials', { waitUntil: 'networkidle' });
    const loadTime = Date.now() - startTime;

    console.log(`⏱️  Total load time: ${loadTime}ms`);
    console.log(`✅ Threshold: ${THRESHOLDS.pageLoad}ms\n`);

    // Check HTTP status
    expect(response?.status()).toBe(200);

    // Verify load time is within budget
    expect(loadTime).toBeLessThan(THRESHOLDS.pageLoad);

    // Get Web Vitals metrics
    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        if (typeof window === 'undefined' || !('performance' in window)) {
          resolve({ error: 'Performance API not available' });
          return;
        }

        const perfData = window.performance;
        const navigation = perfData.timing;
        const paint = perfData.getEntriesByType('paint');

        const firstPaint = paint.find(entry => entry.name === 'first-paint');
        const firstContentfulPaint = paint.find(entry => entry.name === 'first-contentful-paint');

        resolve({
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
          domComplete: navigation.domComplete - navigation.navigationStart,
          firstPaint: firstPaint ? firstPaint.startTime : null,
          firstContentfulPaint: firstContentfulPaint ? firstContentfulPaint.startTime : null,
        });
      });
    });

    console.log('📊 Performance Metrics:');
    console.log(`   DOM Content Loaded: ${(metrics as any).domContentLoaded}ms`);
    console.log(`   DOM Complete: ${(metrics as any).domComplete}ms`);
    console.log(`   First Paint: ${(metrics as any).firstPaint}ms`);
    console.log(`   First Contentful Paint: ${(metrics as any).firstContentfulPaint}ms\n`);

    // Verify DOM content loaded is within budget
    if ((metrics as any).domContentLoaded) {
      expect((metrics as any).domContentLoaded).toBeLessThan(THRESHOLDS.domContentLoaded);
    }

    // Verify First Contentful Paint is within budget
    if ((metrics as any).firstContentfulPaint) {
      expect((metrics as any).firstContentfulPaint).toBeLessThan(THRESHOLDS.firstPaint);
    }
  });

  test('should load dashboard home within performance budget', async ({ page }) => {
    console.log('\n🎯 PERFORMANCE TEST: Dashboard Home Load\n');

    const startTime = Date.now();

    const response = await page.goto('/support', { waitUntil: 'networkidle' });
    const loadTime = Date.now() - startTime;

    console.log(`⏱️  Total load time: ${loadTime}ms`);
    console.log(`✅ Threshold: ${THRESHOLDS.pageLoad}ms\n`);

    expect(response?.status()).toBe(200);
    expect(loadTime).toBeLessThan(THRESHOLDS.pageLoad);
  });

  test('should open create organization modal quickly', async ({ page }) => {
    console.log('\n🎯 PERFORMANCE TEST: Create Organization Modal\n');

    // Navigate to trials page first
    await page.goto('/support/trials');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Measure modal open time
    const startTime = Date.now();

    const createButton = page.locator('button:has-text("Add New Trial")').first();
    await createButton.click();

    // Wait for modal to be visible
    await page.locator('text=/Create Trial Organization/i').first().waitFor({ state: 'visible', timeout: 5000 });

    const modalOpenTime = Date.now() - startTime;

    console.log(`⏱️  Modal open time: ${modalOpenTime}ms`);
    console.log(`✅ Threshold: ${THRESHOLDS.navigationSpeed}ms\n`);

    // Modal should open quickly
    expect(modalOpenTime).toBeLessThan(THRESHOLDS.navigationSpeed);

    // Close modal
    const cancelButton = page.locator('button:has-text("Cancel")').first();
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
    }
  });

  test('should navigate between pages quickly (client-side)', async ({ page }) => {
    console.log('\n🎯 PERFORMANCE TEST: Client-Side Navigation\n');

    // Start at trials page
    await page.goto('/support/trials');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Find navigation link to dashboard home (if exists)
    const homeLink = page.locator('a[href="/support"], a:has-text("Dashboard"), a:has-text("Home")').first();

    if (await homeLink.isVisible({ timeout: 2000 })) {
      const startTime = Date.now();

      await homeLink.click();
      await page.waitForLoadState('networkidle');

      const navTime = Date.now() - startTime;

      console.log(`⏱️  Navigation time: ${navTime}ms`);
      console.log(`✅ Threshold: ${THRESHOLDS.navigationSpeed}ms\n`);

      // Client-side navigation should be fast
      expect(navTime).toBeLessThan(THRESHOLDS.navigationSpeed);
    } else {
      console.log('ℹ️  Navigation link not found, skipping test\n');
    }
  });

  test('should render organization cards efficiently', async ({ page }) => {
    console.log('\n🎯 PERFORMANCE TEST: Organization Cards Rendering\n');

    await page.goto('/support/trials');
    await page.waitForLoadState('networkidle');

    // Measure rendering time for organization cards
    const renderTime = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        const startTime = performance.now();

        // Wait for cards to be visible
        const checkCards = setInterval(() => {
          const cards = document.querySelectorAll('[data-testid="org-card"]');
          if (cards.length > 0) {
            clearInterval(checkCards);
            resolve(performance.now() - startTime);
          }
        }, 10);

        // Timeout after 5 seconds
        setTimeout(() => {
          clearInterval(checkCards);
          resolve(5000);
        }, 5000);
      });
    });

    console.log(`⏱️  Card rendering time: ${renderTime.toFixed(2)}ms`);
    console.log(`✅ Threshold: 1000ms\n`);

    // Cards should render within 1 second
    expect(renderTime).toBeLessThan(1000);
  });

  test('should handle duplicate detection search efficiently', async ({ page }) => {
    console.log('\n🎯 PERFORMANCE TEST: Duplicate Detection Search\n');

    // Navigate to trials page
    await page.goto('/support/trials');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Open create organization modal
    const createButton = page.locator('button:has-text("Add New Trial")').first();
    await createButton.click();
    await page.waitForTimeout(500);

    // Type organization name and measure search response time
    const orgNameInput = page.locator('input[placeholder*="Acme"]').or(page.locator('label:has-text("Organization Name") + input')).first();

    const startTime = Date.now();

    await orgNameInput.fill('Test Organization');

    // Wait for debounce (500ms) + processing time
    await page.waitForTimeout(800);

    const searchTime = Date.now() - startTime;

    console.log(`⏱️  Search response time: ${searchTime}ms`);
    console.log(`✅ Threshold: 1000ms (includes 500ms debounce)\n`);

    // Search should complete within 1 second (including debounce)
    expect(searchTime).toBeLessThan(1000);

    // Close modal
    const cancelButton = page.locator('button:has-text("Cancel")').first();
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
    }
  });

  test('should measure Time to First Byte (TTFB)', async ({ page }) => {
    console.log('\n🎯 PERFORMANCE TEST: Time to First Byte\n');

    const response = await page.goto('/support/trials', { waitUntil: 'domcontentloaded' });

    // Get server response time
    const serverTiming = await response?.serverAddr();
    const timing = await page.evaluate(() => {
      return performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    });

    const ttfb = timing.responseStart - timing.requestStart;

    console.log(`⏱️  Time to First Byte: ${ttfb.toFixed(2)}ms`);
    console.log(`✅ Threshold: 600ms (good), 200ms (excellent)\n`);

    // TTFB should be under 600ms (good) for production
    expect(ttfb).toBeLessThan(600);

    if (ttfb < 200) {
      console.log('🎉 Excellent TTFB!\n');
    } else if (ttfb < 400) {
      console.log('✅ Good TTFB\n');
    } else {
      console.log('⚠️  TTFB is acceptable but could be improved\n');
    }
  });

  test('should not have excessive JavaScript bundle size', async ({ page }) => {
    console.log('\n🎯 PERFORMANCE TEST: JavaScript Bundle Size\n');

    // Navigate and capture network requests
    const jsRequests: any[] = [];

    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('.js') && !url.includes('node_modules')) {
        jsRequests.push({
          url,
          size: response.headers()['content-length'],
        });
      }
    });

    await page.goto('/support/trials', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Calculate total JS size
    let totalSize = 0;
    jsRequests.forEach((req) => {
      const size = parseInt(req.size || '0', 10);
      totalSize += size;
      if (size > 0) {
        console.log(`   ${req.url.split('/').pop()}: ${(size / 1024).toFixed(2)} KB`);
      }
    });

    console.log(`\n📦 Total JS bundle size: ${(totalSize / 1024).toFixed(2)} KB`);
    console.log(`✅ Threshold: 500 KB (warning), 1000 KB (critical)\n`);

    // Warn if bundle is large (this is informational, not a hard failure)
    if (totalSize > 1000 * 1024) {
      console.log('⚠️  WARNING: JavaScript bundle exceeds 1 MB\n');
    } else if (totalSize > 500 * 1024) {
      console.log('ℹ️  Note: JavaScript bundle exceeds 500 KB, consider code splitting\n');
    } else {
      console.log('✅ JavaScript bundle size is good\n');
    }
  });

  test('should handle filter operations efficiently', async ({ page }) => {
    console.log('\n🎯 PERFORMANCE TEST: Filter Operations\n');

    await page.goto('/support/trials');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Find a filter dropdown (status, POC, etc.)
    const statusFilter = page.locator('select, [role="combobox"]').first();

    if (await statusFilter.isVisible({ timeout: 2000 })) {
      const startTime = Date.now();

      // Change filter value
      await statusFilter.click();
      await page.waitForTimeout(100);

      // Select first option
      const firstOption = page.locator('option, [role="option"]').nth(1);
      if (await firstOption.isVisible({ timeout: 1000 })) {
        await firstOption.click();
      }

      // Wait for filtering to complete
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(300);

      const filterTime = Date.now() - startTime;

      console.log(`⏱️  Filter operation time: ${filterTime}ms`);
      console.log(`✅ Threshold: 1000ms\n`);

      // Filtering should be fast
      expect(filterTime).toBeLessThan(1000);
    } else {
      console.log('ℹ️  Filter controls not found, skipping test\n');
    }
  });

  test('should not have memory leaks in modal operations', async ({ page }) => {
    console.log('\n🎯 PERFORMANCE TEST: Memory Leak Detection\n');

    await page.goto('/support/trials');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      if ('memory' in performance && (performance as any).memory) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return null;
    });

    if (initialMemory === null) {
      console.log('ℹ️  Memory profiling not available in this browser\n');
      return;
    }

    console.log(`📊 Initial memory: ${(initialMemory / 1024 / 1024).toFixed(2)} MB`);

    // Open and close modal 10 times
    const createButton = page.locator('button:has-text("Add New Trial")').first();
    const cancelButton = page.locator('button:has-text("Cancel")').first();

    for (let i = 0; i < 10; i++) {
      await createButton.click();
      await page.waitForTimeout(200);
      if (await cancelButton.isVisible()) {
        await cancelButton.click();
        await page.waitForTimeout(200);
      }
    }

    // Get final memory usage
    const finalMemory = await page.evaluate(() => {
      if ('memory' in performance && (performance as any).memory) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return null;
    });

    console.log(`📊 Final memory: ${(finalMemory / 1024 / 1024).toFixed(2)} MB`);

    const memoryIncrease = finalMemory - initialMemory;
    const memoryIncreaseMB = memoryIncrease / 1024 / 1024;

    console.log(`📈 Memory increase: ${memoryIncreaseMB.toFixed(2)} MB`);
    console.log(`✅ Threshold: 10 MB (after 10 modal operations)\n`);

    // Memory increase should be reasonable (less than 10MB for 10 operations)
    expect(memoryIncreaseMB).toBeLessThan(10);

    if (memoryIncreaseMB < 2) {
      console.log('✅ Excellent memory management\n');
    } else if (memoryIncreaseMB < 5) {
      console.log('✅ Good memory management\n');
    } else {
      console.log('⚠️  Possible minor memory leak detected\n');
    }
  });
});
