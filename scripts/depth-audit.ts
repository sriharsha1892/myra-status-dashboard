/**
 * Depth Audit - Verify each feature works END-TO-END
 * Not just API responds, but data actually flows correctly through the entire pipeline
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const API_BASE = 'http://localhost:3000/api/admin/imports';

interface AuditResult {
  feature: string;
  step: string;
  passed: boolean;
  issue?: string;
  severity: 'critical' | 'major' | 'minor';
}

const results: AuditResult[] = [];

function log(msg: string) {
  console.log(`\n${'─'.repeat(60)}\n${msg}\n${'─'.repeat(60)}`);
}

// ============================================================================
// AUDIT 1: Column Mapping - Full Pipeline
// ============================================================================

async function auditColumnMapping() {
  log('AUDIT 1: Column Mapping - Full Pipeline');

  // Step 1: Stage data with mismatched columns
  console.log('Step 1: Stage CSV with non-standard column names...');
  const csvData = `Company Name,Site URL,Email Address,Industry
Audit Test Corp,audittest.com,test@audit.com,Technology`;

  const columnMapping = {
    'Company Name': 'org_name',
    'Site URL': 'website_url',
    'Email Address': 'contact_email',
    'Industry': 'domain_category',
  };

  const prepareRes = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'prepare',
      entityType: 'organization',
      name: 'Column Mapping Audit',
      data: csvData,
      columnMapping,
    }),
  });

  const prepareResult = await prepareRes.json();
  if (!prepareRes.ok) {
    results.push({ feature: 'Column Mapping', step: 'Stage with mapping', passed: false, issue: prepareResult.error, severity: 'critical' });
    return;
  }
  results.push({ feature: 'Column Mapping', step: 'Stage with mapping', passed: true, severity: 'critical' });

  const batchId = prepareResult.batchId;

  // Step 2: Verify data was ACTUALLY transformed in DB
  console.log('Step 2: Verify data transformation in DB...');
  const { data: rows } = await supabase
    .from('import_staging')
    .select('raw_data')
    .eq('batch_id', batchId);

  if (!rows || rows.length === 0) {
    results.push({ feature: 'Column Mapping', step: 'Data in DB', passed: false, issue: 'No rows found in DB', severity: 'critical' });
  } else {
    const rawData = rows[0].raw_data;
    const hasCorrectKeys = rawData.org_name && rawData.website_url && rawData.contact_email;
    const hasOldKeys = rawData['Company Name'] || rawData['Site URL'];

    if (hasCorrectKeys && !hasOldKeys) {
      results.push({ feature: 'Column Mapping', step: 'Data transformed correctly', passed: true, severity: 'critical' });
    } else {
      results.push({
        feature: 'Column Mapping',
        step: 'Data transformed correctly',
        passed: false,
        issue: `Keys: ${Object.keys(rawData).join(', ')}`,
        severity: 'critical'
      });
    }
  }

  // Step 3: Validate the batch
  console.log('Step 3: Validate batch...');
  const validateRes = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'validate', batchId }),
  });

  const validateResult = await validateRes.json();
  if (validateResult.validated > 0) {
    results.push({ feature: 'Column Mapping', step: 'Validation works after mapping', passed: true, severity: 'critical' });
  } else {
    results.push({
      feature: 'Column Mapping',
      step: 'Validation works after mapping',
      passed: false,
      issue: `Validated: ${validateResult.validated}, Failed: ${validateResult.failed}`,
      severity: 'critical'
    });
  }

  // Cleanup
  await supabase.from('import_staging').delete().eq('batch_id', batchId);
  await supabase.from('import_batches').delete().eq('batch_id', batchId);
}

// ============================================================================
// AUDIT 2: AI Parsing - Full Pipeline
// ============================================================================

async function auditAIParsing() {
  log('AUDIT 2: AI Parsing - Full Pipeline');

  if (!process.env.GROQ_API_KEY) {
    results.push({ feature: 'AI Parsing', step: 'API Key', passed: false, issue: 'GROQ_API_KEY not set', severity: 'critical' });
    return;
  }

  // Step 1: Parse unstructured text
  console.log('Step 1: Parse unstructured text...');
  const text = `Met with Sarah Johnson from TechStart Inc today. They're a software company at techstart.io. Sarah is the CEO, email sarah@techstart.io.`;

  const parseRes = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'ai_parse',
      entityType: 'organization',
      data: text,
    }),
  });

  const parseResult = await parseRes.json();
  if (!parseRes.ok || !parseResult.items || parseResult.items.length === 0) {
    results.push({ feature: 'AI Parsing', step: 'Extract entities', passed: false, issue: parseResult.error || 'No items extracted', severity: 'critical' });
    return;
  }

  const extractedOrg = parseResult.items[0];
  console.log('Extracted:', extractedOrg);

  // Check quality of extraction
  const hasOrgName = !!extractedOrg.org_name;
  const hasContact = !!extractedOrg.contact_name || !!extractedOrg.contact_email;

  if (hasOrgName) {
    results.push({ feature: 'AI Parsing', step: 'Extract org_name', passed: true, severity: 'critical' });
  } else {
    results.push({ feature: 'AI Parsing', step: 'Extract org_name', passed: false, issue: 'Missing org_name', severity: 'critical' });
  }

  if (hasContact) {
    results.push({ feature: 'AI Parsing', step: 'Extract contact info', passed: true, severity: 'major' });
  } else {
    results.push({ feature: 'AI Parsing', step: 'Extract contact info', passed: false, issue: 'Missing contact details', severity: 'major' });
  }

  // Step 2: Stage the parsed items
  console.log('Step 2: Stage parsed items...');
  const stageRes = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'prepare',
      entityType: 'organization',
      name: 'AI Parse Audit',
      data: JSON.stringify(parseResult.items),
    }),
  });

  const stageResult = await stageRes.json();
  if (!stageRes.ok) {
    results.push({ feature: 'AI Parsing', step: 'Stage parsed items', passed: false, issue: stageResult.error, severity: 'critical' });
    return;
  }
  results.push({ feature: 'AI Parsing', step: 'Stage parsed items', passed: true, severity: 'critical' });

  // Step 3: Verify and validate
  console.log('Step 3: Validate staged items...');
  const validateRes = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'validate', batchId: stageResult.batchId }),
  });

  const validateResult = await validateRes.json();
  if (validateResult.validated > 0) {
    results.push({ feature: 'AI Parsing', step: 'Validate after staging', passed: true, severity: 'critical' });
  } else {
    results.push({ feature: 'AI Parsing', step: 'Validate after staging', passed: false, issue: `Failed: ${validateResult.failed}`, severity: 'critical' });
  }

  // Cleanup
  await supabase.from('import_staging').delete().eq('batch_id', stageResult.batchId);
  await supabase.from('import_batches').delete().eq('batch_id', stageResult.batchId);
}

// ============================================================================
// AUDIT 3: myRA Usage Import - Full Pipeline
// ============================================================================

async function auditMyRAUsage() {
  log('AUDIT 3: myRA Usage Import - Full Pipeline');

  // Step 1: Stage myRA usage data
  console.log('Step 1: Stage myRA usage CSV...');
  const csvData = `org_name,user_name,title,timestamp,cost
"Audit Test Corp","John Doe","Market Analysis Query","Dec 05, Fri, 02:30 PM","$12.50"`;

  const prepareRes = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'prepare',
      entityType: 'myra_usage',
      name: 'myRA Usage Audit',
      data: csvData,
    }),
  });

  const prepareResult = await prepareRes.json();
  if (!prepareRes.ok) {
    results.push({ feature: 'myRA Usage', step: 'Stage data', passed: false, issue: prepareResult.error, severity: 'critical' });
    return;
  }
  results.push({ feature: 'myRA Usage', step: 'Stage data', passed: true, severity: 'critical' });

  const batchId = prepareResult.batchId;

  // Step 2: Validate
  console.log('Step 2: Validate...');
  const validateRes = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'validate', batchId }),
  });

  const validateResult = await validateRes.json();
  console.log('Validate result:', validateResult);

  if (validateResult.validated > 0) {
    results.push({ feature: 'myRA Usage', step: 'Validate (parse timestamp/cost)', passed: true, severity: 'critical' });
  } else {
    // Check what went wrong
    const { data: failedRows } = await supabase
      .from('import_staging')
      .select('error_message, parsed_data')
      .eq('batch_id', batchId);

    results.push({
      feature: 'myRA Usage',
      step: 'Validate (parse timestamp/cost)',
      passed: false,
      issue: failedRows?.[0]?.error_message || 'Unknown',
      severity: 'critical'
    });
  }

  // Step 3: Import and check if data lands in myra_activity_staging
  console.log('Step 3: Import to myra_activity_staging...');
  const importRes = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'import', batchId }),
  });

  const importResult = await importRes.json();
  console.log('Import result:', importResult);

  // Check for errors if failed
  if (importResult.failed > 0) {
    const { data: failedRows } = await supabase
      .from('import_staging')
      .select('error_message, parsed_data')
      .eq('batch_id', batchId)
      .eq('status', 'import_failed');
    console.log('Import failure details:', failedRows?.[0]);
  }

  if (importResult.imported > 0) {
    results.push({ feature: 'myRA Usage', step: 'Import executes', passed: true, severity: 'critical' });

    // Verify data in myra_activity_staging
    const { data: stagingRows } = await supabase
      .from('myra_activity_staging')
      .select('*')
      .eq('raw_org_name', 'Audit Test Corp')
      .eq('raw_user_name', 'John Doe')
      .limit(1);

    if (stagingRows && stagingRows.length > 0) {
      results.push({ feature: 'myRA Usage', step: 'Data in myra_activity_staging', passed: true, severity: 'critical' });

      // Check parsed values
      const row = stagingRows[0];
      if (row.parsed_cost === 12.5) {
        results.push({ feature: 'myRA Usage', step: 'Cost parsed correctly ($12.50 -> 12.5)', passed: true, severity: 'major' });
      } else {
        results.push({ feature: 'myRA Usage', step: 'Cost parsed correctly', passed: false, issue: `Got: ${row.parsed_cost}`, severity: 'major' });
      }

      if (row.parsed_timestamp) {
        results.push({ feature: 'myRA Usage', step: 'Timestamp parsed', passed: true, severity: 'major' });
      } else {
        results.push({ feature: 'myRA Usage', step: 'Timestamp parsed', passed: false, issue: 'null timestamp', severity: 'major' });
      }

      // Cleanup myra_activity_staging
      await supabase.from('myra_activity_staging').delete().eq('staging_id', row.staging_id);
    } else {
      results.push({ feature: 'myRA Usage', step: 'Data in myra_activity_staging', passed: false, issue: 'Row not found', severity: 'critical' });
    }
  } else {
    results.push({ feature: 'myRA Usage', step: 'Import executes', passed: false, issue: importResult.error || `Failed: ${importResult.failed}`, severity: 'critical' });
  }

  // Cleanup
  await supabase.from('import_staging').delete().eq('batch_id', batchId);
  await supabase.from('import_batches').delete().eq('batch_id', batchId);
}

// ============================================================================
// AUDIT 4: Row Editing - Full Pipeline
// ============================================================================

async function auditRowEditing() {
  log('AUDIT 4: Row Editing - Full Pipeline');

  // Step 1: Create batch with intentionally bad data
  console.log('Step 1: Stage row with missing required field...');
  const csvData = `website_url,contact_email
baddata.com,test@bad.com`;  // Missing org_name!

  const prepareRes = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'prepare',
      entityType: 'organization',
      name: 'Row Edit Audit',
      data: csvData,
    }),
  });

  const prepareResult = await prepareRes.json();
  const batchId = prepareResult.batchId;
  results.push({ feature: 'Row Editing', step: 'Stage incomplete data', passed: true, severity: 'critical' });

  // Step 2: Validate - should fail
  console.log('Step 2: Validate (should fail)...');
  const validateRes = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'validate', batchId }),
  });

  const validateResult = await validateRes.json();
  if (validateResult.failed > 0) {
    results.push({ feature: 'Row Editing', step: 'Validation catches missing field', passed: true, severity: 'critical' });
  } else {
    results.push({ feature: 'Row Editing', step: 'Validation catches missing field', passed: false, issue: 'Should have failed', severity: 'critical' });
  }

  // Step 3: Get the row and edit it
  console.log('Step 3: Get row and fix it via edit...');
  const getRes = await fetch(`${API_BASE}?batchId=${batchId}&action=rows`);
  const getResult = await getRes.json();
  const stagingId = getResult.rows[0]?.staging_id;

  if (!stagingId) {
    results.push({ feature: 'Row Editing', step: 'Get row for editing', passed: false, issue: 'No staging_id', severity: 'critical' });
    return;
  }

  const updateRes = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'update_row',
      stagingId,
      updates: {
        raw_data: {
          org_name: 'Fixed Org Name',  // Add the missing field!
          website_url: 'baddata.com',
          contact_email: 'test@bad.com',
        },
      },
    }),
  });

  const updateResult = await updateRes.json();
  if (updateRes.ok && updateResult.row?.status === 'pending') {
    results.push({ feature: 'Row Editing', step: 'Edit resets to pending', passed: true, severity: 'critical' });
  } else {
    results.push({ feature: 'Row Editing', step: 'Edit resets to pending', passed: false, issue: updateResult.error, severity: 'critical' });
  }

  // Step 4: Re-validate - should now pass
  console.log('Step 4: Re-validate (should pass now)...');
  const revalidateRes = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'validate', batchId }),
  });

  const revalidateResult = await revalidateRes.json();
  if (revalidateResult.validated > 0) {
    results.push({ feature: 'Row Editing', step: 'Re-validation passes after fix', passed: true, severity: 'critical' });
  } else {
    results.push({ feature: 'Row Editing', step: 'Re-validation passes after fix', passed: false, issue: `Still failing: ${revalidateResult.failed}`, severity: 'critical' });
  }

  // Cleanup
  await supabase.from('import_staging').delete().eq('batch_id', batchId);
  await supabase.from('import_batches').delete().eq('batch_id', batchId);
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('\n🔬 DEPTH AUDIT - Verifying End-to-End Feature Completeness\n');

  await auditColumnMapping();
  await auditAIParsing();
  await auditMyRAUsage();
  await auditRowEditing();

  // Summary
  log('AUDIT SUMMARY');

  const critical = results.filter(r => r.severity === 'critical');
  const major = results.filter(r => r.severity === 'major');

  const criticalPassed = critical.filter(r => r.passed).length;
  const criticalFailed = critical.filter(r => !r.passed).length;
  const majorPassed = major.filter(r => r.passed).length;
  const majorFailed = major.filter(r => !r.passed).length;

  console.log(`\n🔴 CRITICAL: ${criticalPassed}/${critical.length} passed`);
  console.log(`🟡 MAJOR: ${majorPassed}/${major.length} passed`);

  if (criticalFailed > 0) {
    console.log('\n❌ CRITICAL FAILURES (must fix):');
    results.filter(r => !r.passed && r.severity === 'critical').forEach(r => {
      console.log(`   [${r.feature}] ${r.step}: ${r.issue}`);
    });
  }

  if (majorFailed > 0) {
    console.log('\n⚠️  MAJOR ISSUES:');
    results.filter(r => !r.passed && r.severity === 'major').forEach(r => {
      console.log(`   [${r.feature}] ${r.step}: ${r.issue}`);
    });
  }

  console.log('\nAll results:');
  results.forEach(r => {
    const icon = r.passed ? '✅' : (r.severity === 'critical' ? '❌' : '⚠️');
    console.log(`  ${icon} [${r.feature}] ${r.step}`);
  });

  const hasCriticalFailure = criticalFailed > 0;
  process.exit(hasCriticalFailure ? 1 : 0);
}

main().catch(console.error);
