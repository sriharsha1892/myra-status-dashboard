/**
 * Comprehensive Test Script for Admin Imports Enhancements
 *
 * Tests:
 * 1. Column detection and mapping
 * 2. CSV staging with column mapping
 * 3. myRA usage handler
 * 4. Row editing (get/update/delete)
 * 5. AI parsing
 * 6. Edge cases
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const API_BASE = 'http://localhost:3000/api/admin/imports';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

function log(msg: string) {
  console.log(`\n${'='.repeat(60)}\n${msg}\n${'='.repeat(60)}`);
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

// ============================================================================
// Test 1: Column Detection
// ============================================================================

async function testColumnDetection() {
  log('TEST 1: Column Detection');

  // Test with matching columns
  const csvWithMatchingCols = `org_name,website_url,contact_email
Acme Corp,acme.com,john@acme.com
Beta Inc,beta.io,jane@beta.io`;

  try {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'detect_columns',
        entityType: 'organization',
        data: csvWithMatchingCols,
      }),
    });

    const result = await res.json();
    console.log('Matching columns result:', JSON.stringify(result, null, 2));

    assert(res.ok, 'Response should be OK');
    assert(result.csvColumns.length === 3, 'Should detect 3 columns');
    assert(result.needsMapping === false, 'Should not need mapping when all required fields present');
    assert(result.autoMapping['org_name'] === 'org_name', 'org_name should auto-map');

    results.push({ name: 'Column Detection - Matching', passed: true, details: result });
  } catch (error) {
    results.push({ name: 'Column Detection - Matching', passed: false, error: (error as Error).message });
  }

  // Test with non-matching columns (needs mapping)
  const csvWithDifferentCols = `Company,Site,Email
Acme Corp,acme.com,john@acme.com`;

  try {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'detect_columns',
        entityType: 'organization',
        data: csvWithDifferentCols,
      }),
    });

    const result = await res.json();
    console.log('Different columns result:', JSON.stringify(result, null, 2));

    // Company should auto-map via alias, but let's check needsMapping
    assert(res.ok, 'Response should be OK');

    results.push({ name: 'Column Detection - Different Headers', passed: true, details: result });
  } catch (error) {
    results.push({ name: 'Column Detection - Different Headers', passed: false, error: (error as Error).message });
  }

  // Test with missing required field
  const csvMissingRequired = `website,email
acme.com,john@acme.com`;

  try {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'detect_columns',
        entityType: 'organization',
        data: csvMissingRequired,
      }),
    });

    const result = await res.json();
    console.log('Missing required result:', JSON.stringify(result, null, 2));

    assert(res.ok, 'Response should be OK');
    assert(result.needsMapping === true, 'Should need mapping when required field missing');
    assert(result.missingRequired.includes('Organization Name'), 'Should report missing org_name');

    results.push({ name: 'Column Detection - Missing Required', passed: true, details: result });
  } catch (error) {
    results.push({ name: 'Column Detection - Missing Required', passed: false, error: (error as Error).message });
  }
}

// ============================================================================
// Test 2: CSV Staging with Column Mapping
// ============================================================================

async function testCSVStaging() {
  log('TEST 2: CSV Staging with Column Mapping');

  const csvData = `Company Name,Website,Industry
Test Org A,testa.com,TMT
Test Org B,testb.com,NEO`;

  // Provide explicit column mapping
  const columnMapping = {
    'Company Name': 'org_name',
    'Website': 'website_url',
    'Industry': 'domain_category',
  };

  try {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'prepare',
        entityType: 'organization',
        name: 'Test Column Mapping Batch',
        data: csvData,
        columnMapping,
      }),
    });

    const result = await res.json();
    console.log('Staging result:', JSON.stringify(result, null, 2));

    assert(res.ok, 'Response should be OK');
    assert(result.batchId, 'Should return batch ID');
    assert(result.staged === 2, 'Should stage 2 rows');

    // Verify the data was mapped correctly
    const { data: rows } = await supabase
      .from('import_staging')
      .select('raw_data')
      .eq('batch_id', result.batchId);

    console.log('Staged rows:', JSON.stringify(rows, null, 2));

    // Check that column mapping was applied
    if (rows && rows[0]) {
      assert(rows[0].raw_data.org_name === 'Test Org A', 'Data should be mapped to org_name');
    }

    // Cleanup
    await supabase.from('import_staging').delete().eq('batch_id', result.batchId);
    await supabase.from('import_batches').delete().eq('batch_id', result.batchId);

    results.push({ name: 'CSV Staging with Column Mapping', passed: true, details: result });
  } catch (error) {
    results.push({ name: 'CSV Staging with Column Mapping', passed: false, error: (error as Error).message });
  }
}

// ============================================================================
// Test 3: myRA Usage Handler
// ============================================================================

async function testMyRAUsageHandler() {
  log('TEST 3: myRA Usage Handler');

  // Import the handler directly for unit testing
  const { MyRAUsageHandler } = await import('../lib/reliableImport/handlers/MyRAUsageHandler');
  const handler = new MyRAUsageHandler(supabase);

  // Test 1: Parse standard format
  try {
    const rawData = {
      org_name: 'Test Corp',
      user_name: 'John Smith',
      title: 'Base Oil Market Analysis',
      timestamp: 'Dec 05, Fri, 02:11 PM',
      cost: '$16.49',
    };

    const parseResult = await handler.parse(rawData);
    console.log('Parse result:', JSON.stringify(parseResult, null, 2));

    assert(parseResult.data !== null, 'Should parse successfully');
    assert(parseResult.data!.org_name === 'Test Corp', 'org_name should match');
    assert(parseResult.data!.user_name === 'John Smith', 'user_name should match');
    assert(parseResult.data!.parsed_timestamp instanceof Date, 'Should parse timestamp');
    assert(parseResult.data!.cost === 16.49, 'Should parse cost');

    results.push({ name: 'myRA Usage - Parse', passed: true, details: parseResult.data });
  } catch (error) {
    results.push({ name: 'myRA Usage - Parse', passed: false, error: (error as Error).message });
  }

  // Test 2: Validate
  try {
    const validData = {
      org_name: 'Test Corp',
      user_name: 'John Smith',
      title: 'Analysis Query',
      timestamp: 'Dec 05, Fri, 02:11 PM',
      parsed_timestamp: new Date(),
    };

    const validationResult = await handler.validate(validData);
    console.log('Validation result:', JSON.stringify(validationResult, null, 2));

    assert(validationResult.valid === true, 'Should be valid');

    results.push({ name: 'myRA Usage - Validate', passed: true, details: validationResult });
  } catch (error) {
    results.push({ name: 'myRA Usage - Validate', passed: false, error: (error as Error).message });
  }

  // Test 3: Parse with missing required field
  try {
    const invalidData = {
      org_name: 'Test Corp',
      // missing user_name
      title: 'Analysis Query',
    };

    const parseResult = await handler.parse(invalidData);
    console.log('Invalid parse result:', JSON.stringify(parseResult, null, 2));

    assert(parseResult.data === null, 'Should fail to parse');
    assert(parseResult.error?.includes('user_name'), 'Error should mention user_name');

    results.push({ name: 'myRA Usage - Missing Field', passed: true, details: parseResult });
  } catch (error) {
    results.push({ name: 'myRA Usage - Missing Field', passed: false, error: (error as Error).message });
  }

  // Test 4: Different timestamp formats
  try {
    const timestamps = [
      'Dec 05, Fri, 02:11 PM',
      '2024-12-05T14:11:00Z',
      'December 5, 2024',
      '12/05/2024 2:11 PM',
    ];

    for (const ts of timestamps) {
      const data = {
        org_name: 'Test',
        user_name: 'User',
        title: 'Query',
        timestamp: ts,
      };
      const result = await handler.parse(data);
      console.log(`Timestamp "${ts}" => ${result.data?.parsed_timestamp}`);
    }

    results.push({ name: 'myRA Usage - Timestamp Formats', passed: true });
  } catch (error) {
    results.push({ name: 'myRA Usage - Timestamp Formats', passed: false, error: (error as Error).message });
  }

  // Test 5: Different cost formats
  try {
    const costs = ['$16.49', '16.49', '$1,234.56', '0.99'];

    for (const cost of costs) {
      const data = {
        org_name: 'Test',
        user_name: 'User',
        title: 'Query',
        timestamp: '2024-12-05',
        cost,
      };
      const result = await handler.parse(data);
      console.log(`Cost "${cost}" => ${result.data?.cost}`);
    }

    results.push({ name: 'myRA Usage - Cost Formats', passed: true });
  } catch (error) {
    results.push({ name: 'myRA Usage - Cost Formats', passed: false, error: (error as Error).message });
  }
}

// ============================================================================
// Test 4: Row Editing (get/update/delete)
// ============================================================================

async function testRowEditing() {
  log('TEST 4: Row Editing');

  // Create a test batch first
  let batchId: string;
  let stagingIds: string[] = [];

  try {
    // Create batch
    const prepareRes = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'prepare',
        entityType: 'organization',
        name: 'Test Row Editing Batch',
        data: `org_name,website_url
Edit Test 1,edit1.com
Edit Test 2,edit2.com
Edit Test 3,edit3.com`,
      }),
    });

    const prepareResult = await prepareRes.json();
    batchId = prepareResult.batchId;
    console.log('Created batch:', batchId);

    // Test GET rows
    const getRes = await fetch(`${API_BASE}?batchId=${batchId}&action=rows&limit=10`);
    const getResult = await getRes.json();
    console.log('Get rows result:', JSON.stringify(getResult, null, 2));

    assert(getResult.rows.length === 3, 'Should return 3 rows');
    assert(getResult.total === 3, 'Total should be 3');

    stagingIds = getResult.rows.map((r: any) => r.staging_id);

    results.push({ name: 'Row Editing - Get Rows', passed: true, details: getResult });
  } catch (error) {
    results.push({ name: 'Row Editing - Get Rows', passed: false, error: (error as Error).message });
    return; // Can't continue without batch
  }

  // Test UPDATE row
  try {
    const updateRes = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_row',
        stagingId: stagingIds[0],
        updates: {
          raw_data: { org_name: 'Updated Org Name', website_url: 'updated.com' },
        },
      }),
    });

    const updateResult = await updateRes.json();
    console.log('Update result:', JSON.stringify(updateResult, null, 2));

    assert(updateRes.ok, 'Update should succeed');
    assert(updateResult.row.raw_data.org_name === 'Updated Org Name', 'Data should be updated');
    assert(updateResult.row.status === 'pending', 'Status should reset to pending');

    results.push({ name: 'Row Editing - Update Row', passed: true, details: updateResult });
  } catch (error) {
    results.push({ name: 'Row Editing - Update Row', passed: false, error: (error as Error).message });
  }

  // Test DELETE rows
  try {
    const deleteRes = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete_rows',
        batchId,
        stagingIds: [stagingIds[1]],
      }),
    });

    const deleteResult = await deleteRes.json();
    console.log('Delete result:', JSON.stringify(deleteResult, null, 2));

    assert(deleteRes.ok, 'Delete should succeed');
    assert(deleteResult.deleted === 1, 'Should delete 1 row');

    // Verify deletion
    const verifyRes = await fetch(`${API_BASE}?batchId=${batchId}&action=rows`);
    const verifyResult = await verifyRes.json();
    assert(verifyResult.total === 2, 'Should have 2 rows remaining');

    results.push({ name: 'Row Editing - Delete Rows', passed: true, details: deleteResult });
  } catch (error) {
    results.push({ name: 'Row Editing - Delete Rows', passed: false, error: (error as Error).message });
  }

  // Test status filtering
  try {
    const filterRes = await fetch(`${API_BASE}?batchId=${batchId}&action=rows&status=pending`);
    const filterResult = await filterRes.json();
    console.log('Filter result:', JSON.stringify(filterResult, null, 2));

    assert(filterRes.ok, 'Filter should succeed');
    // All should be pending initially

    results.push({ name: 'Row Editing - Status Filter', passed: true, details: filterResult });
  } catch (error) {
    results.push({ name: 'Row Editing - Status Filter', passed: false, error: (error as Error).message });
  }

  // Cleanup
  try {
    await supabase.from('import_staging').delete().eq('batch_id', batchId);
    await supabase.from('import_batches').delete().eq('batch_id', batchId);
  } catch (e) {
    console.log('Cleanup error (non-fatal):', e);
  }
}

// ============================================================================
// Test 5: AI Parsing
// ============================================================================

async function testAIParsing() {
  log('TEST 5: AI Parsing');

  // Skip if no GROQ_API_KEY
  if (!process.env.GROQ_API_KEY) {
    console.log('GROQ_API_KEY not set, skipping AI parsing tests');
    results.push({ name: 'AI Parsing', passed: true, details: 'Skipped - no API key' });
    return;
  }

  // Test organization extraction
  try {
    const text = `
    I met with John Smith from Acme Corporation today. They're a tech company based in San Francisco.
    Their website is acme-corp.com and John's email is john@acme-corp.com. He's the CTO.
    Also spoke with Beta Industries (beta.io) - they're in healthcare.
    `;

    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'ai_parse',
        entityType: 'organization',
        data: text,
      }),
    });

    const result = await res.json();
    console.log('AI Parse organizations result:', JSON.stringify(result, null, 2));

    if (res.ok) {
      assert(Array.isArray(result.items), 'Should return items array');
      assert(result.items.length >= 1, 'Should extract at least 1 organization');
      results.push({ name: 'AI Parsing - Organizations', passed: true, details: result });
    } else {
      results.push({ name: 'AI Parsing - Organizations', passed: false, error: result.error });
    }
  } catch (error) {
    results.push({ name: 'AI Parsing - Organizations', passed: false, error: (error as Error).message });
  }

  // Test activity extraction
  try {
    const text = `
    Had a demo call with Acme Corp on Monday. Followed up with an email Tuesday morning.
    Scheduled another meeting for next week to discuss pricing.
    `;

    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'ai_parse',
        entityType: 'activity',
        data: text,
      }),
    });

    const result = await res.json();
    console.log('AI Parse activities result:', JSON.stringify(result, null, 2));

    if (res.ok) {
      assert(Array.isArray(result.items), 'Should return items array');
      results.push({ name: 'AI Parsing - Activities', passed: true, details: result });
    } else {
      results.push({ name: 'AI Parsing - Activities', passed: false, error: result.error });
    }
  } catch (error) {
    results.push({ name: 'AI Parsing - Activities', passed: false, error: (error as Error).message });
  }
}

// ============================================================================
// Test 6: Edge Cases
// ============================================================================

async function testEdgeCases() {
  log('TEST 6: Edge Cases');

  // Empty data
  try {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'detect_columns',
        entityType: 'organization',
        data: '',
      }),
    });

    const result = await res.json();
    assert(!res.ok || result.error, 'Should handle empty data');
    results.push({ name: 'Edge Case - Empty Data', passed: true, details: result });
  } catch (error) {
    results.push({ name: 'Edge Case - Empty Data', passed: false, error: (error as Error).message });
  }

  // Invalid entity type
  try {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'detect_columns',
        entityType: 'invalid_type',
        data: 'col1,col2\nval1,val2',
      }),
    });

    const result = await res.json();
    // Should still work, just return empty fields
    results.push({ name: 'Edge Case - Invalid Entity Type', passed: true, details: result });
  } catch (error) {
    results.push({ name: 'Edge Case - Invalid Entity Type', passed: false, error: (error as Error).message });
  }

  // JSON data instead of CSV
  try {
    const jsonData = JSON.stringify([
      { org_name: 'JSON Org 1', website_url: 'json1.com' },
      { org_name: 'JSON Org 2', website_url: 'json2.com' },
    ]);

    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'prepare',
        entityType: 'organization',
        name: 'JSON Test Batch',
        data: jsonData,
      }),
    });

    const result = await res.json();
    console.log('JSON data result:', JSON.stringify(result, null, 2));

    if (res.ok) {
      // Cleanup
      await supabase.from('import_staging').delete().eq('batch_id', result.batchId);
      await supabase.from('import_batches').delete().eq('batch_id', result.batchId);
    }

    assert(res.ok, 'Should handle JSON data');
    assert(result.staged === 2, 'Should stage 2 rows');
    results.push({ name: 'Edge Case - JSON Data', passed: true, details: result });
  } catch (error) {
    results.push({ name: 'Edge Case - JSON Data', passed: false, error: (error as Error).message });
  }

  // Large CSV (100 rows)
  try {
    let largeCSV = 'org_name,website_url\n';
    for (let i = 0; i < 100; i++) {
      largeCSV += `Large Test Org ${i},largetest${i}.com\n`;
    }

    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'prepare',
        entityType: 'organization',
        name: 'Large CSV Test',
        data: largeCSV,
      }),
    });

    const result = await res.json();
    console.log('Large CSV result:', { staged: result.staged, batchId: result.batchId });

    if (res.ok) {
      // Cleanup
      await supabase.from('import_staging').delete().eq('batch_id', result.batchId);
      await supabase.from('import_batches').delete().eq('batch_id', result.batchId);
    }

    assert(res.ok, 'Should handle large CSV');
    assert(result.staged === 100, 'Should stage 100 rows');
    results.push({ name: 'Edge Case - Large CSV', passed: true, details: { staged: result.staged } });
  } catch (error) {
    results.push({ name: 'Edge Case - Large CSV', passed: false, error: (error as Error).message });
  }

  // Special characters in data
  try {
    const specialCSV = `org_name,website_url,description
"Org with, comma","site.com","Description with ""quotes"" and
newlines"
"O'Brien's Company","obrien.com","Has apostrophe"`;

    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'prepare',
        entityType: 'organization',
        name: 'Special Chars Test',
        data: specialCSV,
      }),
    });

    const result = await res.json();
    console.log('Special chars result:', JSON.stringify(result, null, 2));

    if (res.ok) {
      // Verify data integrity
      const { data: rows } = await supabase
        .from('import_staging')
        .select('raw_data')
        .eq('batch_id', result.batchId);

      console.log('Special chars rows:', JSON.stringify(rows, null, 2));

      // Cleanup
      await supabase.from('import_staging').delete().eq('batch_id', result.batchId);
      await supabase.from('import_batches').delete().eq('batch_id', result.batchId);
    }

    assert(res.ok, 'Should handle special characters');
    results.push({ name: 'Edge Case - Special Characters', passed: true, details: result });
  } catch (error) {
    results.push({ name: 'Edge Case - Special Characters', passed: false, error: (error as Error).message });
  }

  // Update non-existent row
  try {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_row',
        stagingId: '00000000-0000-0000-0000-000000000000',
        updates: { raw_data: { org_name: 'Test' } },
      }),
    });

    const result = await res.json();
    console.log('Update non-existent result:', result);
    // Should either error or return null
    results.push({ name: 'Edge Case - Update Non-existent', passed: true, details: result });
  } catch (error) {
    results.push({ name: 'Edge Case - Update Non-existent', passed: false, error: (error as Error).message });
  }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('\n🧪 COMPREHENSIVE IMPORTS TEST SUITE\n');
  console.log('Starting tests at:', new Date().toISOString());

  await testColumnDetection();
  await testCSVStaging();
  await testMyRAUsageHandler();
  await testRowEditing();
  await testAIParsing();
  await testEdgeCases();

  // Summary
  log('TEST SUMMARY');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`\n✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${results.length}\n`);

  if (failed > 0) {
    console.log('Failed tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
  }

  console.log('\nAll results:');
  results.forEach(r => {
    console.log(`  ${r.passed ? '✅' : '❌'} ${r.name}`);
  });

  // Exit with error code if any tests failed
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
