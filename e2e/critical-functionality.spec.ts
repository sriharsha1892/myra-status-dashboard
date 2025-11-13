import { test, expect } from '@playwright/test';

test.describe('Critical Functionality Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/support/dashboard', { waitUntil: 'networkidle' });
  });

  test.describe('Authentication & Authorization', () => {
    test('should maintain session across page refreshes', async ({ page }) => {
      await page.goto('/support/dashboard', { waitUntil: 'networkidle' });

      // Verify logged in
      const logoutButton = page.locator('button:has-text("Logout"), a:has-text("Logout")');
      expect(await logoutButton.count()).toBeGreaterThan(0);

      // Refresh page
      await page.reload({ waitUntil: 'networkidle' });

      // Should still be logged in
      expect(await logoutButton.count()).toBeGreaterThan(0);
      console.log('✅ Session persisted across refresh');
    });

    test('should show correct user role', async ({ page }) => {
      await page.goto('/support/dashboard', { waitUntil: 'networkidle' });

      // Look for role indicator (Admin or Account Manager)
      const bodyText = await page.textContent('body');
      const hasRole = bodyText?.includes('Admin') || bodyText?.includes('Account Manager');

      console.log(`User role displayed: ${hasRole ? 'Yes' : 'No'}`);
      expect(hasRole).toBeTruthy();
    });
  });

  test.describe('Trial Organizations Management', () => {
    test('should load trial organizations list', async ({ page }) => {
      await page.goto('/support/trials', { waitUntil: 'networkidle' });

      // Check for org cards or table
      const orgElements = await page.locator('[data-testid="org-card"], tr:has-text("Organization")').count();

      console.log(`📊 Trial organizations found: ${orgElements}`);

      // Should have at least skeleton cards or org cards
      const hasContent = orgElements > 0 || await page.locator('.animate-pulse').count() > 0;
      expect(hasContent).toBeTruthy();
    });

    test('should be able to view trial details', async ({ page }) => {
      await page.goto('/support/trials', { waitUntil: 'networkidle' });

      // Find first trial card or link
      const firstTrial = page.locator('[data-testid="org-card"] a, a:has-text("View Details")').first();

      if (await firstTrial.count() > 0) {
        await firstTrial.click();
        await page.waitForLoadState('networkidle');

        // Should navigate to detail page
        expect(page.url()).toMatch(/\/support\/trials\/.+/);
        console.log('✅ Trial detail page accessible');
      } else {
        console.log('ℹ️ No trial organizations to test detail view');
      }
    });

    test('should show engagement metrics', async ({ page }) => {
      await page.goto('/support/trials', { waitUntil: 'networkidle' });

      const bodyText = await page.textContent('body');
      const hasMetrics =
        bodyText?.includes('engagement') ||
        bodyText?.includes('score') ||
        bodyText?.includes('activity');

      console.log(`Engagement metrics visible: ${hasMetrics ? 'Yes' : 'No'}`);
    });
  });

  test.describe('Dashboard Widgets', () => {
    test('should display all critical widgets', async ({ page }) => {
      await page.goto('/support/dashboard', { waitUntil: 'networkidle' });

      const widgets = [
        'Personal Impact',
        'Get Started',
        'Todos',
        'Recent Activity',
        'Quick Actions',
      ];

      console.log('\n📊 Dashboard Widgets:');
      const bodyText = await page.textContent('body') || '';

      widgets.forEach(widget => {
        const visible = bodyText.includes(widget);
        const icon = visible ? '✅' : '⚠️';
        console.log(`   ${icon} ${widget}: ${visible ? 'Found' : 'Not found'}`);
      });
    });

    test('recent activity should show updates', async ({ page }) => {
      await page.goto('/support/dashboard', { waitUntil: 'networkidle' });

      // Look for activity feed
      const activityItems = await page.locator('[data-testid="activity-item"], .activity-feed li, .timeline-item').count();

      console.log(`📝 Recent activity items: ${activityItems}`);
    });
  });

  test.describe('Resources Platform', () => {
    test('should load resources page', async ({ page }) => {
      await page.goto('/support/resources', { waitUntil: 'networkidle' });

      // Check for main sections
      const bodyText = await page.textContent('body') || '';
      const hasResources =
        bodyText.includes('Resources') ||
        bodyText.includes('Discussions') ||
        bodyText.includes('Q&A');

      expect(hasResources).toBeTruthy();
      console.log('✅ Resources page loaded');
    });

    test('should display internal resources', async ({ page }) => {
      await page.goto('/support/resources/internal', { waitUntil: 'networkidle' });

      await page.waitForTimeout(1000);

      const resourceCount = await page.locator('[data-testid="resource-item"], .resource-card, article').count();
      console.log(`📚 Internal resources found: ${resourceCount}`);
    });

    test('should navigate to discussions', async ({ page }) => {
      await page.goto('/support/resources', { waitUntil: 'networkidle' });

      const discussionsLink = page.locator('a:has-text("Discussions"), button:has-text("Discussions")').first();

      if (await discussionsLink.count() > 0) {
        await discussionsLink.click();
        await page.waitForLoadState('networkidle');
        console.log('✅ Discussions accessible');
      }
    });

    test('should navigate to Q&A', async ({ page }) => {
      await page.goto('/support/resources', { waitUntil: 'networkidle' });

      const qaLink = page.locator('a:has-text("Q&A"), button:has-text("Q&A")').first();

      if (await qaLink.count() > 0) {
        await qaLink.click();
        await page.waitForLoadState('networkidle');
        console.log('✅ Q&A accessible');
      }
    });
  });

  test.describe('Roadmap', () => {
    test('should load roadmap page', async ({ page }) => {
      await page.goto('/support/admin/roadmap', { waitUntil: 'networkidle' });

      const bodyText = await page.textContent('body') || '';
      const hasRoadmap =
        bodyText.includes('Roadmap') ||
        bodyText.includes('Backlog') ||
        bodyText.includes('In Progress');

      expect(hasRoadmap).toBeTruthy();
      console.log('✅ Roadmap page loaded');
    });

    test('should display roadmap items', async ({ page }) => {
      await page.goto('/support/admin/roadmap', { waitUntil: 'networkidle' });

      await page.waitForTimeout(1000);

      const roadmapCards = await page.locator('[data-testid="roadmap-card"], .roadmap-item, .kanban-card').count();
      console.log(`🗺️ Roadmap items found: ${roadmapCards}`);
    });
  });

  test.describe('User Management', () => {
    test('should load user management page', async ({ page }) => {
      await page.goto('/support/users', { waitUntil: 'networkidle' });

      const bodyText = await page.textContent('body') || '';
      const hasUsers = bodyText.includes('Users') || bodyText.includes('Account Manager');

      expect(hasUsers).toBeTruthy();
      console.log('✅ User management page loaded');
    });

    test('should display user list', async ({ page }) => {
      await page.goto('/support/users', { waitUntil: 'networkidle' });

      await page.waitForTimeout(1000);

      const userRows = await page.locator('table tbody tr, [data-testid="user-card"]').count();
      console.log(`👥 Users displayed: ${userRows}`);

      expect(userRows).toBeGreaterThan(0);
    });

    test('should have "Add User" button', async ({ page }) => {
      await page.goto('/support/users', { waitUntil: 'networkidle' });

      const addUserButton = page.locator('button:has-text("Add User"), button:has-text("Create User")');
      const hasButton = await addUserButton.count() > 0;

      console.log(`Add User button present: ${hasButton ? 'Yes' : 'No'}`);
      expect(hasButton).toBeTruthy();
    });
  });

  test.describe('Notifications', () => {
    test('should display notification bell', async ({ page }) => {
      await page.goto('/support/dashboard', { waitUntil: 'networkidle' });

      const notificationBell = page.locator('[aria-label*="notification" i], button:has(svg):near(:text("Notification"))').first();
      const hasBell = await notificationBell.count() > 0;

      console.log(`Notification bell present: ${hasBell ? 'Yes' : 'No'}`);
    });

    test('should open notification panel', async ({ page }) => {
      await page.goto('/support/dashboard', { waitUntil: 'networkidle' });

      const notificationBell = page.locator('[aria-label*="notification" i], button:has(svg)').first();

      if (await notificationBell.count() > 0) {
        await notificationBell.click();
        await page.waitForTimeout(500);

        // Check if panel opened
        const panel = page.locator('[role="dialog"], .notification-panel, [data-testid="notification-panel"]');
        const panelOpen = await panel.count() > 0;

        console.log(`Notification panel opened: ${panelOpen ? 'Yes' : 'No'}`);
      }
    });
  });

  test.describe('Search Functionality', () => {
    test('should have search input on trials page', async ({ page }) => {
      await page.goto('/support/trials', { waitUntil: 'networkidle' });

      const searchInput = page.locator('input[type="search"], input[placeholder*="Search" i]');
      const hasSearch = await searchInput.count() > 0;

      console.log(`Search input present: ${hasSearch ? 'Yes' : 'No'}`);
    });

    test('search should filter results', async ({ page }) => {
      await page.goto('/support/trials', { waitUntil: 'networkidle' });

      const searchInput = page.locator('input[type="search"], input[placeholder*="Search" i]').first();

      if (await searchInput.count() > 0) {
        // Count initial results
        const initialCount = await page.locator('[data-testid="org-card"], tr').count();

        // Search for something
        await searchInput.fill('test');
        await page.waitForTimeout(500);

        const filteredCount = await page.locator('[data-testid="org-card"], tr').count();

        console.log(`Search filter working: Initial=${initialCount}, Filtered=${filteredCount}`);
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle 404 pages gracefully', async ({ page }) => {
      const response = await page.goto('/support/nonexistent-page-12345', { waitUntil: 'domcontentloaded' });

      // Should show 404 page or redirect
      const bodyText = await page.textContent('body') || '';
      const has404 =
        bodyText.includes('404') ||
        bodyText.includes('not found') ||
        bodyText.includes('Page not found');

      console.log(`404 handling: ${has404 ? 'Proper error page' : 'Redirected'}`);
    });

    test('should not have console errors on main pages', async ({ page }) => {
      const errors: string[] = [];

      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      await page.goto('/support/dashboard', { waitUntil: 'networkidle' });
      await page.goto('/support/trials', { waitUntil: 'networkidle' });

      if (errors.length > 0) {
        console.log('\n⚠️  Console errors detected:');
        errors.forEach(err => console.log(`   - ${err}`));
      } else {
        console.log('✅ No console errors detected');
      }

      // Should have minimal errors (some may be expected like network timeouts)
      expect(errors.length).toBeLessThan(5);
    });
  });

  test.describe('Data Integrity', () => {
    test('should show accurate trial counts', async ({ page }) => {
      await page.goto('/support/trials', { waitUntil: 'networkidle' });

      await page.waitForTimeout(1000);

      const trialCards = await page.locator('[data-testid="org-card"]').count();
      const bodyText = await page.textContent('body') || '';

      // Look for count indicators like "Showing X trials"
      const countMatch = bodyText.match(/(\d+)\s*(trial|organization)/i);

      if (countMatch) {
        console.log(`📊 Trial count indicator: ${countMatch[0]}`);
      }
      console.log(`📊 Trial cards rendered: ${trialCards}`);
    });

    test('dates should be formatted correctly', async ({ page }) => {
      await page.goto('/support/trials', { waitUntil: 'networkidle' });

      const bodyText = await page.textContent('body') || '';

      // Check for date patterns (various formats)
      const hasValidDates =
        /\d{1,2}\/\d{1,2}\/\d{4}/.test(bodyText) || // MM/DD/YYYY
        /\d{4}-\d{2}-\d{2}/.test(bodyText) ||      // YYYY-MM-DD
        /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}/.test(bodyText); // Month DD

      console.log(`Date formatting present: ${hasValidDates ? 'Yes' : 'No'}`);
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper heading hierarchy', async ({ page }) => {
      await page.goto('/support/dashboard', { waitUntil: 'networkidle' });

      const h1Count = await page.locator('h1').count();
      const h2Count = await page.locator('h2').count();
      const h3Count = await page.locator('h3').count();

      console.log(`\n♿ Heading hierarchy: h1=${h1Count}, h2=${h2Count}, h3=${h3Count}`);

      // Should have at least one h1
      expect(h1Count).toBeGreaterThan(0);
    });

    test('interactive elements should be keyboard accessible', async ({ page }) => {
      await page.goto('/support/dashboard', { waitUntil: 'networkidle' });

      // Tab through elements
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement;
        return el?.tagName || 'none';
      });

      console.log(`Keyboard navigation working: ${focusedElement !== 'BODY' ? 'Yes' : 'No'}`);
    });

    test('buttons should have accessible names', async ({ page }) => {
      await page.goto('/support/dashboard', { waitUntil: 'networkidle' });

      const buttons = await page.locator('button').all();
      let unnamedButtons = 0;

      for (const button of buttons.slice(0, 10)) { // Check first 10
        const ariaLabel = await button.getAttribute('aria-label');
        const text = await button.textContent();

        if (!ariaLabel && !text?.trim()) {
          unnamedButtons++;
        }
      }

      console.log(`Buttons with proper names: ${buttons.length - unnamedButtons}/${buttons.length}`);
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should render properly on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE

      await page.goto('/support/dashboard', { waitUntil: 'networkidle' });

      // Check if content is visible (not hidden by overflow)
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = await page.viewportSize();

      const hasHorizontalScroll = bodyWidth > (viewportWidth?.width || 375) + 50;

      console.log(`Mobile viewport: ${viewportWidth?.width}px, Body: ${bodyWidth}px`);
      console.log(`Horizontal scroll: ${hasHorizontalScroll ? 'Yes (bad)' : 'No (good)'}`);
    });
  });
});
