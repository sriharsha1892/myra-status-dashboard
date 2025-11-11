#!/usr/bin/env tsx
/**
 * PRE-LAUNCH CRITICAL TEST: Unassigned Domain
 * Tests the newly added "Unassigned" domain functionality
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];
let testOrgId: string | null = null;

async function runTest(name: string, testFn: () => Promise<void>) {
  try {
    console.log(`\n🧪 Testing: ${name}...`);
    await testFn();
    results.push({ name, passed: true });
    console.log(`✅ PASS: ${name}`);
  } catch (error: any) {
    results.push({ name, passed: false, error: error.message });
    console.log(`❌ FAIL: ${name}`);
    console.error(`   Error: ${error.message}`);
  }
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 PRE-LAUNCH TEST: UNASSIGNED DOMAIN FUNCTIONALITY');
  console.log('='.repeat(60));

  // Test 1: Create trial org with "Unassigned" domain
  await runTest('Create trial org with "Unassigned" domain', async () => {
    const testOrg = {
      org_name: `Test Unassigned Org ${Date.now()}`,
      domain: 'Unassigned',  // CRITICAL: Test the new value
      parent_company: 'Mordor Intelligence',
      org_url: `https://test-unassigned-${Date.now()}.com`,
      logo_url: `https://logo.clearbit.com/test-unassigned.com`,
      description: 'Test org for Unassigned domain validation',
      org_lifecycle_stage: 'prospect',
      trial_status: 'requested',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('trial_organizations')
      .insert(testOrg)
      .select('org_id, org_name, domain')
      .single();

    if (error) throw new Error(`Database error: ${error.message}`);
    if (!data) throw new Error('No data returned after insert');
    if (data.domain !== 'Unassigned') {
      throw new Error(`Domain mismatch: expected "Unassigned", got "${data.domain}"`);
    }

    testOrgId = data.org_id;
    console.log(`   Created org: ${data.org_name} (ID: ${testOrgId})`);
  });

  // Test 2: Read org with "Unassigned" domain
  await runTest('Read org with "Unassigned" domain', async () => {
    if (!testOrgId) throw new Error('No test org created');

    const { data, error } = await supabase
      .from('trial_organizations')
      .select('org_id, org_name, domain')
      .eq('org_id', testOrgId)
      .single();

    if (error) throw new Error(`Read error: ${error.message}`);
    if (!data) throw new Error('Org not found');
    if (data.domain !== 'Unassigned') {
      throw new Error(`Domain mismatch on read: expected "Unassigned", got "${data.domain}"`);
    }
  });

  // Test 3: Update org from "Unassigned" to another domain
  await runTest('Update domain from "Unassigned" to "TMT"', async () => {
    if (!testOrgId) throw new Error('No test org created');

    const { data, error } = await supabase
      .from('trial_organizations')
      .update({ domain: 'TMT', updated_at: new Date().toISOString() })
      .eq('org_id', testOrgId)
      .select('org_id, domain')
      .single();

    if (error) throw new Error(`Update error: ${error.message}`);
    if (!data) throw new Error('Update returned no data');
    if (data.domain !== 'TMT') {
      throw new Error(`Domain not updated: expected "TMT", got "${data.domain}"`);
    }
  });

  // Test 4: Update org back to "Unassigned"
  await runTest('Update domain back to "Unassigned"', async () => {
    if (!testOrgId) throw new Error('No test org created');

    const { data, error } = await supabase
      .from('trial_organizations')
      .update({ domain: 'Unassigned', updated_at: new Date().toISOString() })
      .eq('org_id', testOrgId)
      .select('org_id, domain')
      .single();

    if (error) throw new Error(`Update error: ${error.message}`);
    if (!data) throw new Error('Update returned no data');
    if (data.domain !== 'Unassigned') {
      throw new Error(`Domain not updated: expected "Unassigned", got "${data.domain}"`);
    }
  });

  // Test 5: Query orgs filtered by "Unassigned" domain
  await runTest('Query orgs with domain="Unassigned"', async () => {
    const { data, error } = await supabase
      .from('trial_organizations')
      .select('org_id, org_name, domain')
      .eq('domain', 'Unassigned');

    if (error) throw new Error(`Query error: ${error.message}`);
    if (!data) throw new Error('Query returned no data');

    const foundTestOrg = data.find(org => org.org_id === testOrgId);
    if (!foundTestOrg) {
      throw new Error('Test org not found in Unassigned filter results');
    }

    console.log(`   Found ${data.length} org(s) with Unassigned domain`);
  });

  // Test 6: Verify all valid domains still work
  await runTest('Verify all valid domains accepted', async () => {
    const validDomains = ['TMT', 'NEO', 'AF&B', 'E&C', 'HC', 'AAD', 'Unassigned'];

    for (const domain of validDomains) {
      const { error } = await supabase
        .from('trial_organizations')
        .update({ domain, updated_at: new Date().toISOString() })
        .eq('org_id', testOrgId!);

      if (error) {
        throw new Error(`Domain "${domain}" rejected: ${error.message}`);
      }
    }

    console.log(`   All ${validDomains.length} domains accepted`);
  });

  // Cleanup
  await runTest('Cleanup: Delete test org', async () => {
    if (!testOrgId) throw new Error('No test org to delete');

    const { error } = await supabase
      .from('trial_organizations')
      .delete()
      .eq('org_id', testOrgId);

    if (error) throw new Error(`Delete error: ${error.message}`);
    console.log(`   Deleted test org: ${testOrgId}`);
  });

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  results.forEach(r => {
    const status = r.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status}: ${r.name}`);
    if (r.error) {
      console.log(`        ${r.error}`);
    }
  });

  console.log('\n' + '-'.repeat(60));
  console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`);
  console.log('-'.repeat(60));

  if (failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! "Unassigned" domain functionality is READY FOR LAUNCH!\n');
    process.exit(0);
  } else {
    console.log(`\n🚨 ${failed} TEST(S) FAILED! DO NOT LAUNCH until these are fixed!\n`);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('\n💥 CRITICAL ERROR:', error.message);
  process.exit(1);
});
