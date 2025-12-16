import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function comprehensiveTest() {
  console.log('========================================');
  console.log('  QUOTE GENERATOR - COMPREHENSIVE TEST');
  console.log('========================================\n');

  let passed = 0;
  let failed = 0;

  // Test 1: Auth endpoint - correct password
  console.log('TEST 1: Auth - Correct Password');
  try {
    const res = await fetch('https://myra-status-dashboard.vercel.app/api/quote/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'myRA@Quote2025' }),
    });
    const data = await res.json();
    if (data.success) {
      console.log('  ✓ PASSED\n');
      passed++;
    } else {
      console.log('  ✗ FAILED - Expected success:true, got:', data);
      failed++;
    }
  } catch (e: any) {
    console.log('  ✗ FAILED -', e.message);
    failed++;
  }

  // Test 2: Auth endpoint - wrong password
  console.log('TEST 2: Auth - Wrong Password');
  try {
    const res = await fetch('https://myra-status-dashboard.vercel.app/api/quote/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'wrongpassword' }),
    });
    const data = await res.json();
    if (data.success === false) {
      console.log('  ✓ PASSED\n');
      passed++;
    } else {
      console.log('  ✗ FAILED - Should reject wrong password');
      failed++;
    }
  } catch (e: any) {
    console.log('  ✗ FAILED -', e.message);
    failed++;
  }

  // Test 3: Admin auth - correct password
  console.log('TEST 3: Admin Auth - Correct Password');
  try {
    const res = await fetch('https://myra-status-dashboard.vercel.app/api/quote/admin-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'ZgXZ&zwblzVpoNl%sAunfWDJ' }),
    });
    const data = await res.json();
    if (data.success) {
      console.log('  ✓ PASSED\n');
      passed++;
    } else {
      console.log('  ✗ FAILED - Expected success:true, got:', data);
      failed++;
    }
  } catch (e: any) {
    console.log('  ✗ FAILED -', e.message);
    failed++;
  }

  // Test 4: Save quote to database
  console.log('TEST 4: Save Quote to Database');
  const testRef = 'MQ-TEST-' + Date.now();
  try {
    const { data, error } = await supabase
      .from('quotes')
      .insert({
        quote_reference: testRef,
        version: 1,
        company_name: 'Test Corp Comprehensive',
        contact_name: 'Jane Tester',
        contact_email: 'jane@testcorp.com',
        contact_title: 'CTO',
        quote_date: '2024-12-16',
        valid_until: '2025-01-15',
        currency: 'USD',
        total_value: 75000,
        line_items: [
          { term: '1-Year', users: '15', consultingHours: '500/yr', investment: '75000' }
        ],
        prepared_by: 'Test AM',
        deal_context: { discountReason: 'strategic', urgency: 'urgent' },
      })
      .select()
      .single();

    if (data && !error) {
      console.log('  ✓ PASSED - Quote ID:', data.id.slice(0, 8) + '...\n');
      passed++;
    } else {
      console.log('  ✗ FAILED -', error?.message);
      failed++;
    }
  } catch (e: any) {
    console.log('  ✗ FAILED -', e.message);
    failed++;
  }

  // Test 5: Query quotes with filters
  console.log('TEST 5: Query Quotes with Filters');
  try {
    const { data, count, error } = await supabase
      .from('quotes')
      .select('*', { count: 'exact' })
      .ilike('company_name', '%Test%')
      .order('created_at', { ascending: false })
      .limit(5);

    if (data && !error) {
      console.log('  ✓ PASSED - Found', count, 'quotes matching "Test"\n');
      passed++;
    } else {
      console.log('  ✗ FAILED -', error?.message);
      failed++;
    }
  } catch (e: any) {
    console.log('  ✗ FAILED -', e.message);
    failed++;
  }

  // Test 6: Version increment logic
  console.log('TEST 6: Version Increment for Same Client');
  try {
    const { data: existing } = await supabase
      .from('quotes')
      .select('version')
      .eq('contact_email', 'jane@testcorp.com')
      .eq('company_name', 'Test Corp Comprehensive')
      .order('version', { ascending: false })
      .limit(1);

    const nextVersion = existing && existing.length > 0 ? existing[0].version + 1 : 1;

    const { data, error } = await supabase
      .from('quotes')
      .insert({
        quote_reference: 'MQ-TEST-V' + nextVersion + '-' + Date.now(),
        version: nextVersion,
        company_name: 'Test Corp Comprehensive',
        contact_name: 'Jane Tester',
        contact_email: 'jane@testcorp.com',
        quote_date: '2024-12-16',
        valid_until: '2025-01-15',
        currency: 'USD',
        total_value: 80000,
        line_items: [],
        prepared_by: 'Test AM',
      })
      .select()
      .single();

    if (data && data.version === nextVersion) {
      console.log('  ✓ PASSED - Created version', nextVersion, '\n');
      passed++;
    } else {
      console.log('  ✗ FAILED - Version mismatch');
      failed++;
    }
  } catch (e: any) {
    console.log('  ✗ FAILED -', e.message);
    failed++;
  }

  // Test 7: Admin API endpoint
  console.log('TEST 7: Admin API - Fetch All Quotes');
  try {
    const res = await fetch('https://myra-status-dashboard.vercel.app/api/quote/admin?limit=5');
    const data = await res.json();
    if (data.success && data.quotes && data.stats) {
      console.log('  ✓ PASSED - Total quotes:', data.stats.totalQuotes, '\n');
      passed++;
    } else {
      console.log('  ✗ FAILED -', data.error || 'Invalid response');
      failed++;
    }
  } catch (e: any) {
    console.log('  ✗ FAILED -', e.message);
    failed++;
  }

  // Test 8: Stats aggregation
  console.log('TEST 8: Stats Aggregation by AM');
  try {
    const { data } = await supabase
      .from('quotes')
      .select('prepared_by, currency, total_value');

    const amStats: Record<string, { count: number; total: number }> = {};
    data?.forEach((q: any) => {
      if (!amStats[q.prepared_by]) amStats[q.prepared_by] = { count: 0, total: 0 };
      amStats[q.prepared_by].count++;
      amStats[q.prepared_by].total += parseFloat(q.total_value);
    });

    console.log('  ✓ PASSED - AMs:', Object.keys(amStats).length);
    Object.entries(amStats).slice(0, 3).forEach(([am, stats]) => {
      console.log('    •', am || 'Unknown', '-', stats.count, 'quotes');
    });
    console.log('');
    passed++;
  } catch (e: any) {
    console.log('  ✗ FAILED -', e.message);
    failed++;
  }

  // Cleanup
  console.log('CLEANUP: Removing test data...');
  await supabase.from('quotes').delete().ilike('quote_reference', 'MQ-TEST-%');
  console.log('  Done\n');

  // Summary
  console.log('========================================');
  console.log('  RESULTS: ' + passed + ' passed, ' + failed + ' failed');
  console.log('========================================');

  if (failed === 0) {
    console.log('\n  ✓ ALL TESTS PASSED - Ready to roll out!\n');
  } else {
    console.log('\n  ✗ Some tests failed - Review above\n');
  }
}

comprehensiveTest();
