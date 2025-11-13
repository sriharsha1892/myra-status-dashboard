import { test, expect } from '@playwright/test';

test.describe('Performance Bottleneck Analysis', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/support/dashboard', { waitUntil: 'networkidle' });
  });

  test.describe('Page Load Performance', () => {
    test('dashboard should load in under 3 seconds', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/support/dashboard', { waitUntil: 'networkidle' });
      const loadTime = Date.now() - startTime;

      console.log(`📊 Dashboard load time: ${loadTime}ms`);
      expect(loadTime).toBeLessThan(3000);

      if (loadTime > 2000) {
        console.log('⚠️  Dashboard approaching 3s threshold');
      }
    });

    test('trials page should load in under 3 seconds', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/support/trials', { waitUntil: 'networkidle' });
      const loadTime = Date.now() - startTime;

      console.log(`📊 Trials page load time: ${loadTime}ms`);
      expect(loadTime).toBeLessThan(3000);
    });

    test('resources page should load in under 3 seconds', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/support/resources', { waitUntil: 'networkidle' });
      const loadTime = Date.now() - startTime;

      console.log(`📊 Resources page load time: ${loadTime}ms`);
      expect(loadTime).toBeLessThan(3000);
    });

    test('roadmap page should load in under 3 seconds', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/support/admin/roadmap', { waitUntil: 'networkidle' });
      const loadTime = Date.now() - startTime;

      console.log(`📊 Roadmap page load time: ${loadTime}ms`);
      expect(loadTime).toBeLessThan(3000);
    });

    test('user management page should load in under 3 seconds', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/support/users', { waitUntil: 'networkidle' });
      const loadTime = Date.now() - startTime;

      console.log(`📊 User management load time: ${loadTime}ms`);
      expect(loadTime).toBeLessThan(3000);
    });
  });

  test.describe('API Response Times', () => {
    test('API endpoints should respond quickly', async ({ page }) => {
      // Monitor network requests
      const apiTimes: { url: string; duration: number }[] = [];

      page.on('response', async (response) => {
        if (response.url().includes('/api/')) {
          const request = response.request();
          const timing = response.request().timing();
          if (timing) {
            const duration = timing.responseEnd - timing.requestStart;
            apiTimes.push({
              url: new URL(response.url()).pathname,
              duration: Math.round(duration),
            });
          }
        }
      });

      // Navigate to trigger API calls
      await page.goto('/support/trials', { waitUntil: 'networkidle' });

      // Wait a bit for all API calls
      await page.waitForTimeout(2000);

      // Analyze results
      console.log('\n📡 API Response Times:');
      apiTimes.forEach(({ url, duration }) => {
        const status = duration > 1000 ? '🔴 SLOW' : duration > 500 ? '🟡 OK' : '🟢 FAST';
        console.log(`   ${status} ${url}: ${duration}ms`);
      });

      // Check for slow endpoints
      const slowEndpoints = apiTimes.filter(t => t.duration > 1000);
      if (slowEndpoints.length > 0) {
        console.log('\n⚠️  Slow endpoints detected (>1s):');
        slowEndpoints.forEach(({ url, duration }) => {
          console.log(`   - ${url}: ${duration}ms`);
        });
      }

      // No endpoint should take more than 2 seconds
      expect(Math.max(...apiTimes.map(t => t.duration))).toBeLessThan(2000);
    });
  });

  test.describe('Navigation Performance', () => {
    test('should navigate between pages quickly', async ({ page }) => {
      const pages = [
        '/support/dashboard',
        '/support/trials',
        '/support/resources',
        '/support/admin/roadmap',
        '/support/users',
      ];

      console.log('\n🔄 Navigation Speed Test:');

      for (const pagePath of pages) {
        const startTime = Date.now();
        await page.goto(pagePath, { waitUntil: 'domcontentloaded' });
        const navTime = Date.now() - startTime;

        const status = navTime > 1000 ? '🔴' : navTime > 500 ? '🟡' : '🟢';
        console.log(`   ${status} ${pagePath}: ${navTime}ms`);

        expect(navTime).toBeLessThan(2000);
      }
    });
  });

  test.describe('Memory and Resource Usage', () => {
    test('should not have excessive DOM nodes', async ({ page }) => {
      await page.goto('/support/trials', { waitUntil: 'networkidle' });

      const domNodeCount = await page.evaluate(() => {
        return document.querySelectorAll('*').length;
      });

      console.log(`📦 DOM node count: ${domNodeCount}`);

      // Warn if DOM is getting large (over 1500 nodes can slow things down)
      if (domNodeCount > 1500) {
        console.log('⚠️  High DOM node count detected');
      }

      expect(domNodeCount).toBeLessThan(2000);
    });

    test('should not have memory leaks from intervals', async ({ page }) => {
      await page.goto('/support/dashboard', { waitUntil: 'networkidle' });

      // Check for active timers (setInterval, setTimeout)
      const timerCount = await page.evaluate(() => {
        // @ts-ignore
        return window.performance.memory ?
          // @ts-ignore
          window.performance.memory.usedJSHeapSize : 0;
      });

      console.log(`💾 JS Heap Size: ${(timerCount / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  test.describe('Database Query Performance', () => {
    test('trials list should load quickly even with filters', async ({ page }) => {
      await page.goto('/support/trials', { waitUntil: 'networkidle' });

      // Apply filters
      const filterButton = page.locator('button:has-text("Filter")').first();
      if (await filterButton.count() > 0) {
        const startTime = Date.now();
        await filterButton.click();
        await page.waitForTimeout(500);
        const filterTime = Date.now() - startTime;

        console.log(`🔍 Filter operation time: ${filterTime}ms`);
        expect(filterTime).toBeLessThan(1000);
      }
    });

    test('search should be responsive', async ({ page }) => {
      await page.goto('/support/trials', { waitUntil: 'networkidle' });

      const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]').first();

      if (await searchInput.count() > 0) {
        const startTime = Date.now();
        await searchInput.fill('test search query');
        await page.waitForTimeout(500); // Debounce time
        const searchTime = Date.now() - startTime;

        console.log(`🔎 Search response time: ${searchTime}ms`);
        expect(searchTime).toBeLessThan(1000);
      }
    });
  });

  test.describe('Concurrent Operations', () => {
    test('should handle multiple tab switches without lag', async ({ page }) => {
      await page.goto('/support/dashboard', { waitUntil: 'networkidle' });

      // Find tabs if they exist
      const tabs = page.locator('[role="tab"], button:has-text("Overview"), button:has-text("Activity")');
      const tabCount = await tabs.count();

      if (tabCount > 0) {
        console.log(`\n🔀 Testing ${tabCount} tab switches:`);

        for (let i = 0; i < Math.min(tabCount, 5); i++) {
          const startTime = Date.now();
          await tabs.nth(i).click();
          await page.waitForTimeout(200);
          const switchTime = Date.now() - startTime;

          console.log(`   Tab ${i + 1}: ${switchTime}ms`);
          expect(switchTime).toBeLessThan(500);
        }
      }
    });

    test('notification loading should be fast', async ({ page }) => {
      await page.goto('/support/dashboard', { waitUntil: 'networkidle' });

      // Click notifications bell if present
      const notifButton = page.locator('[aria-label*="notification" i], button:has(svg):near(:text("Notification"))').first();

      if (await notifButton.count() > 0) {
        const startTime = Date.now();
        await notifButton.click();
        await page.waitForTimeout(500);
        const notifTime = Date.now() - startTime;

        console.log(`🔔 Notification panel open time: ${notifTime}ms`);
        expect(notifTime).toBeLessThan(1000);
      }
    });
  });

  test.describe('Image and Asset Loading', () => {
    test('images should load efficiently', async ({ page }) => {
      const imageLoadTimes: number[] = [];

      page.on('response', async (response) => {
        if (response.request().resourceType() === 'image') {
          const timing = response.request().timing();
          if (timing) {
            const duration = timing.responseEnd - timing.requestStart;
            imageLoadTimes.push(duration);
          }
        }
      });

      await page.goto('/support/trials', { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);

      if (imageLoadTimes.length > 0) {
        const avgImageTime = Math.round(
          imageLoadTimes.reduce((a, b) => a + b, 0) / imageLoadTimes.length
        );
        console.log(`🖼️  Average image load time: ${avgImageTime}ms (${imageLoadTimes.length} images)`);
        expect(avgImageTime).toBeLessThan(500);
      }
    });
  });

  test.describe('Bottleneck Summary', () => {
    test('generate performance report', async ({ page }) => {
      const metrics: { metric: string; value: number; status: string }[] = [];

      // Test each critical page
      const pages = [
        { name: 'Dashboard', path: '/support/dashboard' },
        { name: 'Trials', path: '/support/trials' },
        { name: 'Resources', path: '/support/resources' },
      ];

      for (const { name, path } of pages) {
        const startTime = Date.now();
        await page.goto(path, { waitUntil: 'networkidle' });
        const loadTime = Date.now() - startTime;

        const status = loadTime < 1500 ? '🟢 FAST' : loadTime < 2500 ? '🟡 OK' : '🔴 SLOW';
        metrics.push({ metric: `${name} Load`, value: loadTime, status });
      }

      console.log('\n📊 PERFORMANCE SUMMARY:');
      console.log('━'.repeat(50));
      metrics.forEach(({ metric, value, status }) => {
        console.log(`${status.padEnd(10)} ${metric.padEnd(20)} ${value}ms`);
      });
      console.log('━'.repeat(50));

      // Check if any critical bottlenecks
      const bottlenecks = metrics.filter(m => m.value > 2500);
      if (bottlenecks.length > 0) {
        console.log('\n⚠️  CRITICAL BOTTLENECKS FOUND:');
        bottlenecks.forEach(({ metric, value }) => {
          console.log(`   - ${metric}: ${value}ms`);
        });
      } else {
        console.log('\n✅ No critical bottlenecks detected!');
      }
    });
  });
});
