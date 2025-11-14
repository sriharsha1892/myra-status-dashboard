import { test, expect } from '@playwright/test';

test.describe('Robust Authentication Testing', () => {
  test('Debug login page structure', async ({ page }) => {
    console.log('🔍 Starting debug test...');

    // Navigate to login with explicit wait
    console.log('📍 Navigating to login page...');
    await page.goto('http://localhost:3000/support/login', {
      waitUntil: 'domcontentloaded',
      timeout: 10000
    });

    // Wait a bit for any client-side hydration
    await page.waitForTimeout(2000);

    // Debug: Take screenshot
    await page.screenshot({ path: 'login-page-debug.png', fullPage: true });
    console.log('📸 Screenshot saved: login-page-debug.png');

    // Debug: Check page URL
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);

    // Debug: Check page title
    const title = await page.title();
    console.log(`📄 Page title: ${title}`);

    // Debug: Check if page has any content
    const bodyText = await page.locator('body').textContent();
    console.log(`📝 Page has content: ${bodyText?.length || 0} characters`);

    // Debug: Look for ANY input fields
    const allInputs = await page.locator('input').count();
    console.log(`🔢 Total input fields found: ${allInputs}`);

    // Try different selectors for email field
    const selectors = [
      'input#email',
      'input[id="email"]',
      'input[type="email"]',
      'input[name="email"]',
      'input[placeholder*="email"]',
      'input[placeholder*="@"]'
    ];

    for (const selector of selectors) {
      try {
        const element = page.locator(selector);
        const count = await element.count();
        const isVisible = count > 0 ? await element.first().isVisible() : false;
        console.log(`  ${selector}: found=${count}, visible=${isVisible}`);

        if (count > 0 && isVisible) {
          // Try to get more info about the element
          const placeholder = await element.first().getAttribute('placeholder');
          const type = await element.first().getAttribute('type');
          const id = await element.first().getAttribute('id');
          console.log(`    → placeholder="${placeholder}", type="${type}", id="${id}"`);
        }
      } catch (e) {
        console.log(`  ${selector}: ERROR - ${e.message}`);
      }
    }

    // Check for password field
    console.log('\n🔑 Checking password field...');
    const passwordSelectors = [
      'input#password',
      'input[id="password"]',
      'input[type="password"]',
      'input[name="password"]'
    ];

    for (const selector of passwordSelectors) {
      try {
        const element = page.locator(selector);
        const count = await element.count();
        const isVisible = count > 0 ? await element.first().isVisible() : false;
        console.log(`  ${selector}: found=${count}, visible=${isVisible}`);
      } catch (e) {
        console.log(`  ${selector}: ERROR - ${e.message}`);
      }
    }

    // Check for submit button
    console.log('\n🔘 Checking submit button...');
    const buttonSelectors = [
      'button[type="submit"]',
      'button:has-text("Sign in")',
      'button:has-text("Login")',
      'button:has-text("sign")',
      'button:has-text("log")'
    ];

    for (const selector of buttonSelectors) {
      try {
        const element = page.locator(selector);
        const count = await element.count();
        const isVisible = count > 0 ? await element.first().isVisible() : false;
        const text = count > 0 ? await element.first().textContent() : '';
        console.log(`  ${selector}: found=${count}, visible=${isVisible}, text="${text}"`);
      } catch (e) {
        console.log(`  ${selector}: ERROR - ${e.message}`);
      }
    }

    // Try to check if there's an error or loading state
    const errorMessages = await page.locator('text=/error|fail|problem|issue/i').count();
    console.log(`\n⚠️  Error messages found: ${errorMessages}`);

    const loadingIndicators = await page.locator('text=/loading|please wait/i').count();
    console.log(`⏳ Loading indicators found: ${loadingIndicators}`);

    // Final check: Try the most reliable selector with explicit wait
    console.log('\n🎯 Final attempt with explicit wait...');
    try {
      const emailInput = page.locator('input#email');
      await emailInput.waitFor({ state: 'visible', timeout: 5000 });
      console.log('✅ Email input is now visible!');

      // Try to fill it
      await emailInput.fill('test@example.com');
      console.log('✅ Successfully filled email field!');

      // Clear it
      await emailInput.clear();
      console.log('✅ Successfully cleared email field!');
    } catch (e) {
      console.log(`❌ Final attempt failed: ${e.message}`);
    }
  });

  test('Login with improved wait strategy', async ({ page }) => {
    console.log('🚀 Starting improved login test...');

    // Navigate and wait for network to be idle
    await page.goto('http://localhost:3000/support/login', {
      waitUntil: 'networkidle',
      timeout: 15000
    });

    console.log('📍 Page loaded, waiting for hydration...');

    // Wait for React hydration
    await page.waitForTimeout(3000);

    // Wait for the email input to be visible and stable
    console.log('⏳ Waiting for email input...');
    const emailInput = page.locator('input#email');
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await emailInput.waitFor({ state: 'attached', timeout: 5000 });

    console.log('✅ Email input ready, filling form...');

    // Fill the form with explicit waits between actions
    await emailInput.click();
    await page.waitForTimeout(100);
    await emailInput.fill('admin@myra.ai');

    const passwordInput = page.locator('input#password');
    await passwordInput.click();
    await page.waitForTimeout(100);
    await passwordInput.fill('admin@myRA2025');

    // Find and click submit button
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeEnabled();

    console.log('🔐 Submitting login form...');
    await submitButton.click();

    // Wait for navigation
    try {
      await page.waitForURL('**/support/dashboard', { timeout: 10000 });
      console.log('✅ Login successful! Redirected to dashboard.');
    } catch (e) {
      const currentUrl = page.url();
      console.log(`⚠️  Navigation timeout. Current URL: ${currentUrl}`);

      // Check for error messages
      const pageContent = await page.locator('body').textContent();
      if (pageContent?.includes('error') || pageContent?.includes('invalid')) {
        console.log('❌ Login failed with error message');
      }
    }

    // Verify we're logged in
    const dashboardUrl = page.url();
    expect(dashboardUrl).toContain('/support/dashboard');
  });

  test('Alternative login approach using page.evaluate', async ({ page }) => {
    console.log('🔄 Trying alternative login approach...');

    await page.goto('http://localhost:3000/support/login', {
      waitUntil: 'load'
    });

    // Wait for any animations or transitions
    await page.waitForTimeout(3000);

    // Use page.evaluate to directly set input values
    const fillResult = await page.evaluate(() => {
      try {
        const emailInput = document.getElementById('email') as HTMLInputElement;
        const passwordInput = document.getElementById('password') as HTMLInputElement;

        if (!emailInput || !passwordInput) {
          return {
            success: false,
            error: 'Inputs not found',
            emailFound: !!emailInput,
            passwordFound: !!passwordInput
          };
        }

        // Set values directly
        emailInput.value = 'admin@myra.ai';
        passwordInput.value = 'admin@myRA2025';

        // Trigger input events
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
        passwordInput.dispatchEvent(new Event('input', { bubbles: true }));

        return {
          success: true,
          emailValue: emailInput.value,
          passwordValue: passwordInput.value.replace(/./g, '*')
        };
      } catch (e) {
        return { success: false, error: e.message };
      }
    });

    console.log('📝 Fill result:', fillResult);

    if (fillResult.success) {
      // Click submit button
      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();

      // Wait for navigation
      await page.waitForURL('**/support/dashboard', { timeout: 10000 });
      console.log('✅ Alternative login successful!');
    } else {
      console.log('❌ Alternative login failed:', fillResult.error);
    }
  });
});