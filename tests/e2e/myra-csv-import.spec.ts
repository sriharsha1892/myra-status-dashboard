import { test, expect } from '@playwright/test';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mkkhwiyolmowomojvtel.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ra2h3aXlvbG1vd29tb2p2dGVsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjA5MjI4MywiZXhwIjoyMDc3NjY4MjgzfQ.pI6BFTzH_Lo7ST9T7Gw6rAMtf4hd21HP_4Jbo4ng5R4';

// Use authentication from setup
test.use({ storageState: 'playwright/.auth/user.json' });

test.describe('myRA CSV Import', () => {
  let supabase: any;
  let testOrgIds: string[] = [];
  let testUserIds: string[] = [];
  let testQueryIds: string[] = [];

  test.beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseKey);
  });

  test.afterAll(async () => {
    // Cleanup: Delete all test data
    if (testQueryIds.length > 0) {
      await supabase.from('platform_queries').delete().in('query_id', testQueryIds);
      console.log(`🧹 Cleaned up ${testQueryIds.length} test queries`);
    }

    if (testUserIds.length > 0) {
      await supabase.from('trial_users').delete().in('user_id', testUserIds);
      console.log(`🧹 Cleaned up ${testUserIds.length} test users`);
    }

    if (testOrgIds.length > 0) {
      await supabase.from('trial_organizations').delete().in('org_id', testOrgIds);
      console.log(`🧹 Cleaned up ${testOrgIds.length} test organizations`);
    }
  });

  test('should complete full CSV import flow', async ({ page }) => {
    test.setTimeout(180000); // 3 minutes for AI processing

    // Step 1: Navigate to import page
    await page.goto('/support/admin/myra-csv-import');
    await expect(page.locator('text=myRA CSV Import')).toBeVisible();

    // Step 2: Upload CSV file
    const csvPath = '/tmp/myra-test-data.csv';
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(csvPath);

    // Verify file name is displayed
    await expect(page.locator('text=myra-test-data.csv')).toBeVisible();

    // Step 3: Click "Analyze with AI"
    await page.click('button:has-text("Analyze with AI")');

    // Wait for analysis to complete (should show "Analyzing CSV Data")
    await expect(page.locator('text=Analyzing CSV Data')).toBeVisible();

    // Wait for review screen (this may take time for AI processing)
    await expect(page.locator('text=Review Import')).toBeVisible({ timeout: 120000 });

    // Step 4: Verify three-tier summary cards are displayed
    await expect(page.locator('text=Auto-Approve')).toBeVisible();
    await expect(page.locator('text=Needs Review')).toBeVisible();
    await expect(page.locator('text=Requires Fix')).toBeVisible();

    // Step 5: Get the counts from the summary
    const autoApproveCard = page.locator('div:has-text("Auto-Approve")').first();
    const autoApproveText = await autoApproveCard.textContent();
    console.log('📊 Auto-Approve section:', autoApproveText);

    // Step 6: Click import button from Auto-Approve tier (number of queries may vary)
    const importButton = page.locator('button').filter({ hasText: /^Import \d+ Queries?$/ }).first();

    // Wait for button to be visible and enabled
    await expect(importButton).toBeVisible();
    const buttonText = await importButton.textContent();
    console.log(`✅ Import button is visible: "${buttonText}"`);

    await importButton.click();
    console.log('✅ Clicked import button');

    // Wait for importing state
    await expect(page.locator('text=Importing Queries')).toBeVisible({ timeout: 10000 });

    // Wait for completion (should show "Import Complete!")
    await expect(page.locator('text=Import Complete!')).toBeVisible({ timeout: 60000 });

    // Step 7: Verify success stats are displayed
    await expect(page.locator('text=Queries Imported')).toBeVisible();
    await expect(page.locator('text=Orgs Created')).toBeVisible();
    await expect(page.locator('text=Users Created')).toBeVisible();

    // Extract the import results
    const resultsSection = page.locator('div:has-text("Queries Imported")').first();
    const resultsText = await resultsSection.textContent();
    console.log('✅ Import Results:', resultsText);

    // Step 8: Verify data in database
    const { data: queries, error } = await supabase
      .from('platform_queries')
      .select('query_id, org_id, user_id, query_text, query_category')
      .order('created_at', { ascending: false })
      .limit(20);

    expect(error).toBeNull();
    expect(queries).toBeDefined();
    expect(queries.length).toBeGreaterThan(0);

    // Store IDs for cleanup
    testQueryIds = queries.map((q: any) => q.query_id);

    console.log(`📊 Verified ${queries.length} queries in database`);

    // Get unique org_ids and user_ids from imported queries
    const orgIds = [...new Set(queries.map((q: any) => q.org_id))];
    const userIds = [...new Set(queries.map((q: any) => q.user_id))];

    // Verify organizations were created
    const { data: orgs } = await supabase
      .from('trial_organizations')
      .select('org_id, org_name')
      .in('org_id', orgIds);

    testOrgIds = orgs?.map((o: any) => o.org_id) || [];
    console.log(`🏢 Verified ${orgs?.length} organizations created`);

    // Verify users were created
    const { data: users } = await supabase
      .from('trial_users')
      .select('user_id, name, email')
      .in('user_id', userIds);

    testUserIds = users?.map((u: any) => u.user_id) || [];
    console.log(`👥 Verified ${users?.length} users created`);

    // Step 9: Verify AI categorization worked
    const categorizedQueries = queries.filter((q: any) => q.category !== null);
    expect(categorizedQueries.length).toBeGreaterThan(0);
    console.log(`🤖 AI categorized ${categorizedQueries.length} queries`);

    // Sample categories
    const categories = [...new Set(queries.map((q: any) => q.category))];
    console.log(`📁 Categories assigned: ${categories.join(', ')}`);
  });

  test('should handle validation errors', async ({ page }) => {
    // Create an invalid CSV
    const invalidCSV = `org_name,user_email,user_name,query_text,executed_at
Invalid Org,not-an-email,Test User,What is the market size?,2024-10-15
,valid@email.com,Test User,Query text here,2024-10-16
Valid Org,,Test User,Query text here,2024-10-17`;

    // Write to temp file
    const fs = require('fs');
    const invalidPath = '/tmp/invalid-test.csv';
    fs.writeFileSync(invalidPath, invalidCSV);

    await page.goto('/support/admin/myra-csv-import');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(invalidPath);

    await page.click('button:has-text("Analyze with AI")');

    // Should show error
    await expect(page.locator('text=validation failed')).toBeVisible({ timeout: 30000 });

    // Cleanup
    fs.unlinkSync(invalidPath);
  });
});
