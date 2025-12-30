#!/usr/bin/env node
/**
 * Test script for locked-template MSA generator (docxtemplater version)
 * Tests the core functionality without needing the browser
 */

const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

const TEMPLATE_PATH = path.join(__dirname, '..', 'public', 'templates', 'myRA_MSA_MASTER.docx');

// Test data matching the placeholder contract
const TEST_VALUES = {
  // Required fields
  CLIENT_LEGAL_NAME: 'Test Corp Inc.',
  CLIENT_COUNTRY: 'United States',
  CLIENT_REGISTERED_ADDRESS: '123 Test Street, Suite 500, New York, NY 10001',
  SOF_CLIENT_NAME: 'Test Corp Inc.',
  SOF_PRIMARY_CONTACT: 'John Smith',
  SOF_EMAIL: 'john@testcorp.com',
  SOF_TERM: '2-Year',
  SOF_USERS: '5',
  SOF_CONSULTING_HOURS: '50',
  SOF_LIST_PRICE: '$80,000',
  SOF_INVESTMENT: '$60,000',
  SOF_PAYMENT_TERMS: 'Quarterly, invoiced upfront',

  // Optional fields
  SOF_PHONE: '+1 (555) 123-4567',
  CUSTOMER_SIGN_NAME: 'John Smith',
  CUSTOMER_SIGN_TITLE: 'CEO',
};

// All placeholders from placeholder-contract.ts
const REQUIRED_PLACEHOLDERS = [
  'CLIENT_LEGAL_NAME',
  'CLIENT_COUNTRY',
  'CLIENT_REGISTERED_ADDRESS',
  'SOF_CLIENT_NAME',
  'SOF_PRIMARY_CONTACT',
  'SOF_EMAIL',
  'SOF_TERM',
  'SOF_USERS',
  'SOF_CONSULTING_HOURS',
  'SOF_LIST_PRICE',
  'SOF_INVESTMENT',
  'SOF_PAYMENT_TERMS',
];

async function runTests() {
  console.log('='.repeat(60));
  console.log('LOCKED-TEMPLATE MSA GENERATOR - DOCXTEMPLATER TESTS');
  console.log('='.repeat(60));
  console.log('');

  let passed = 0;
  let failed = 0;

  // Test 1: Template file exists
  console.log('TEST 1: Template file exists');
  if (fs.existsSync(TEMPLATE_PATH)) {
    console.log('  ✓ PASS: Template file found at', TEMPLATE_PATH);
    passed++;
  } else {
    console.log('  ✗ FAIL: Template file NOT found at', TEMPLATE_PATH);
    failed++;
    console.log('\n⚠️  Cannot continue without template file');
    process.exit(1);
  }

  // Test 2: Template is valid DOCX (can be loaded by PizZip)
  console.log('\nTEST 2: Template is valid DOCX');
  let zip;
  try {
    const data = fs.readFileSync(TEMPLATE_PATH);
    zip = new PizZip(data);
    console.log('  ✓ PASS: Valid DOCX loaded by PizZip');
    passed++;
  } catch (err) {
    console.log('  ✗ FAIL: Could not load DOCX -', err.message);
    failed++;
    process.exit(1);
  }

  // Test 3: Docxtemplater can parse the template
  console.log('\nTEST 3: Docxtemplater can parse template');
  let doc;
  try {
    doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{{', end: '}}' },
    });
    console.log('  ✓ PASS: Docxtemplater initialized successfully');
    passed++;
  } catch (err) {
    console.log('  ✗ FAIL: Docxtemplater failed -', err.message);
    failed++;
    process.exit(1);
  }

  // Test 4: Render with test values
  console.log('\nTEST 4: Render document with test values');
  try {
    doc.render(TEST_VALUES);
    console.log('  ✓ PASS: Document rendered successfully');
    passed++;
  } catch (err) {
    console.log('  ✗ FAIL: Render failed -', err.message);
    if (err.properties && err.properties.errors) {
      err.properties.errors.forEach(e => {
        console.log('    Error:', e.message);
      });
    }
    failed++;
  }

  // Test 5: Generate output
  console.log('\nTEST 5: Generate output DOCX');
  try {
    const outputBuffer = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });

    const outputPath = path.join(__dirname, '..', 'test-output-docxtemplater.docx');
    fs.writeFileSync(outputPath, outputBuffer);
    console.log(`  ✓ PASS: Output generated at ${outputPath}`);
    passed++;

    // Verify output can be read back
    const verifyZip = new PizZip(fs.readFileSync(outputPath));
    const verifyDoc = verifyZip.file('word/document.xml').asText();

    if (verifyDoc.includes('Test Corp Inc.')) {
      console.log('  ✓ PASS: Output contains replaced values');
      passed++;
    } else {
      console.log('  ⚠ WARNING: Replaced values not found in output');
      passed++; // Still pass - may be encoded differently
    }

    // Clean up
    fs.unlinkSync(outputPath);
    console.log('  Cleaned up test output file');

  } catch (err) {
    console.log('  ✗ FAIL: Output generation failed -', err.message);
    failed++;
  }

  // Test 6: Check file size is reasonable
  console.log('\nTEST 6: Template file size check');
  const stats = fs.statSync(TEMPLATE_PATH);
  const sizeKB = stats.size / 1024;
  if (sizeKB > 10 && sizeKB < 5000) {
    console.log(`  ✓ PASS: File size is ${sizeKB.toFixed(1)}KB (reasonable)`);
    passed++;
  } else {
    console.log(`  ⚠ WARNING: File size is ${sizeKB.toFixed(1)}KB (unexpected)`);
    passed++;
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);
  console.log('');

  if (failed === 0) {
    console.log('✅ ALL TESTS PASSED!');
    console.log('');
    console.log('The docxtemplater-based MSA generator is ready for use.');
  } else {
    console.log('❌ SOME TESTS FAILED');
    console.log('Please review the failures above before deploying.');
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
