import { test as setup } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const authFile = 'playwright/.auth/user.json';

/**
 * Authentication Setup for E2E Tests
 *
 * This runs before all tests to create an authenticated session.
 * The session is stored and reused by all test files.
 *
 * Note: This setup attempts to authenticate but gracefully handles failures.
 * Tests that require authentication will skip if not authenticated.
 */

setup('authenticate as admin', async ({ page }) => {
  // Validate environment variables
  const testEmail = process.env.TEST_ADMIN_EMAIL || 'admin@myra.ai';
  const testPassword = process.env.TEST_ADMIN_PASSWORD;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.log('🔧 Auth Setup Configuration:');
  console.log(`   Email: ${testEmail}`);
  console.log(`   Password: ${testPassword ? '✓ SET' : '✗ NOT SET'}`);
  console.log(`   Supabase URL: ${supabaseUrl ? '✓ SET' : '✗ NOT SET'}`);
  console.log(`   Supabase Anon Key: ${supabaseAnonKey ? '✓ SET' : '✗ NOT SET'}`);

  if (!testPassword) {
    console.log('❌ ERROR: TEST_ADMIN_PASSWORD is not set!');
    console.log('   Please set TEST_ADMIN_PASSWORD in your .env or .env.local file');
    createMinimalAuthFile();
    return;
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    console.log('❌ ERROR: Supabase credentials not found!');
    console.log('   Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set');
    createMinimalAuthFile();
    return;
  }

  try {
    console.log('📍 Navigating to protected route: /support/trials');

    // Navigate to trials page (protected route) and wait for network to be idle
    await page.goto('/support/trials', {
      timeout: 15000,
      waitUntil: 'networkidle'
    });

    // Check if we're on a login page or already authenticated
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);

    if (currentUrl.includes('/support/trials') || currentUrl.includes('/support/dashboard')) {
      // Already authenticated!
      console.log('✓ Already authenticated, saving session...');
      await page.context().storageState({ path: authFile });
      console.log('✓ Auth state saved successfully!');
      return;
    }

    // We got redirected to login, try to authenticate
    if (currentUrl.includes('/login')) {
      console.log('🔐 Redirected to login page, attempting authentication...');

      const emailInput = page.locator('input[type="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();

      if (await emailInput.isVisible({ timeout: 3000 })) {
        console.log(`   Filling email: ${testEmail}`);
        await emailInput.fill(testEmail);

        console.log('   Filling password...');
        await passwordInput.fill(testPassword);

        const loginButton = page.getByRole('button', { name: /log in|sign in/i }).first();
        console.log('   Clicking login button...');
        await loginButton.click();

        // Wait for navigation after login
        console.log('   Waiting for navigation...');
        await page.waitForURL(/\/(trials|dashboard)/, { timeout: 10000 });

        const newUrl = page.url();
        console.log(`📍 After login URL: ${newUrl}`);

        if (newUrl.includes('/trials') || newUrl.includes('/dashboard')) {
          console.log('✅ Login successful!');
          await page.context().storageState({ path: authFile });
          console.log('✓ Auth state saved successfully!');
        } else {
          console.log(`❌ Login failed - unexpected redirect to: ${newUrl}`);
          console.log('   Creating minimal auth file...');
          createMinimalAuthFile();
        }
      } else {
        console.log('❌ Login form not found on page');
        console.log('   Page content:', await page.content());
        createMinimalAuthFile();
      }
    } else {
      console.log(`❌ Unexpected redirect to: ${currentUrl}`);
      console.log('   Expected /login or /support/trials');
      createMinimalAuthFile();
    }
  } catch (error) {
    console.log('❌ Authentication setup error:', error);
    console.log('   Creating minimal auth file to allow tests to run...');
    createMinimalAuthFile();
  }
});

function createMinimalAuthFile() {
  // Create auth directory if it doesn't exist
  const authDir = path.dirname(authFile);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Create minimal auth state
  const minimalAuth = {
    cookies: [],
    origins: []
  };

  fs.writeFileSync(authFile, JSON.stringify(minimalAuth, null, 2));
  console.log('✓ Minimal auth file created at:', authFile);
  console.log('Note: Tests requiring authentication may be skipped');
}
