/**
 * TypeScript test for locked-template modules
 * Run with: npx tsx scripts/test-typescript-modules.ts
 */

import {
  REQUIRED_PLACEHOLDERS,
  OPTIONAL_PLACEHOLDERS,
  ALL_PLACEHOLDERS,
  isValidPlaceholder,
  toPlaceholderToken,
  type PlaceholderValues,
} from '../lib/msa/locked-template/placeholder-contract';

import {
  MSAValidationError,
  validateRequiredPlaceholders,
} from '../lib/msa/locked-template/validation';

console.log('='.repeat(60));
console.log('TYPESCRIPT MODULE TESTS');
console.log('='.repeat(60));

let passed = 0;
let failed = 0;

// Test 1: Placeholder contract exports
console.log('\nTEST 1: Placeholder contract exports');
try {
  if (REQUIRED_PLACEHOLDERS.length === 10) {
    console.log('  ✓ REQUIRED_PLACEHOLDERS has 10 entries');
    passed++;
  } else {
    console.log(`  ✗ REQUIRED_PLACEHOLDERS has ${REQUIRED_PLACEHOLDERS.length} entries, expected 10`);
    failed++;
  }

  if (OPTIONAL_PLACEHOLDERS.length === 8) {
    console.log('  ✓ OPTIONAL_PLACEHOLDERS has 8 entries');
    passed++;
  } else {
    console.log(`  ✗ OPTIONAL_PLACEHOLDERS has ${OPTIONAL_PLACEHOLDERS.length} entries, expected 8`);
    failed++;
  }

  if (ALL_PLACEHOLDERS.length === 18) {
    console.log('  ✓ ALL_PLACEHOLDERS has 18 entries');
    passed++;
  } else {
    console.log(`  ✗ ALL_PLACEHOLDERS has ${ALL_PLACEHOLDERS.length} entries, expected 18`);
    failed++;
  }
} catch (err) {
  console.log('  ✗ Error:', err);
  failed++;
}

// Test 2: isValidPlaceholder function
console.log('\nTEST 2: isValidPlaceholder function');
try {
  if (isValidPlaceholder('CLIENT_COUNTRY')) {
    console.log('  ✓ CLIENT_COUNTRY is valid');
    passed++;
  } else {
    console.log('  ✗ CLIENT_COUNTRY should be valid');
    failed++;
  }

  if (!isValidPlaceholder('INVALID_PLACEHOLDER')) {
    console.log('  ✓ INVALID_PLACEHOLDER is correctly rejected');
    passed++;
  } else {
    console.log('  ✗ INVALID_PLACEHOLDER should be rejected');
    failed++;
  }
} catch (err) {
  console.log('  ✗ Error:', err);
  failed++;
}

// Test 3: toPlaceholderToken function
console.log('\nTEST 3: toPlaceholderToken function');
try {
  const token = toPlaceholderToken('CLIENT_COUNTRY');
  if (token === '{{CLIENT_COUNTRY}}') {
    console.log('  ✓ Token format correct');
    passed++;
  } else {
    console.log(`  ✗ Expected "{{CLIENT_COUNTRY}}", got "${token}"`);
    failed++;
  }
} catch (err) {
  console.log('  ✗ Error:', err);
  failed++;
}

// Test 4: PlaceholderValues type works
console.log('\nTEST 4: PlaceholderValues type');
try {
  const values: PlaceholderValues = {
    CLIENT_COUNTRY: 'USA',
    SOF_CLIENT_NAME: 'Test Corp',
    SOF_PRIMARY_CONTACT: 'John Doe',
    SOF_EMAIL: 'john@test.com',
    SOF_TERM: '1-Year',
    SOF_USERS: '5',
    SOF_CONSULTING_HOURS: '50',
    SOF_LIST_PRICE: '$10,000',
    SOF_INVESTMENT: '$8,000',
    SOF_PAYMENT_TERMS: 'Monthly',
    // Optional
    CLIENT_LEGAL_NAME: 'Test Corp Inc.',
  };

  if (values.CLIENT_COUNTRY === 'USA') {
    console.log('  ✓ PlaceholderValues type works correctly');
    passed++;
  } else {
    console.log('  ✗ PlaceholderValues type issue');
    failed++;
  }
} catch (err) {
  console.log('  ✗ Error:', err);
  failed++;
}

// Test 5: Validation - missing required fields
console.log('\nTEST 5: Validation - missing required fields');
try {
  const incompleteValues: PlaceholderValues = {
    CLIENT_COUNTRY: 'USA',
    SOF_CLIENT_NAME: '', // Empty!
    SOF_PRIMARY_CONTACT: 'John Doe',
    SOF_EMAIL: 'john@test.com',
    SOF_TERM: '1-Year',
    SOF_USERS: '5',
    SOF_CONSULTING_HOURS: '50',
    SOF_LIST_PRICE: '$10,000',
    SOF_INVESTMENT: '$8,000',
    SOF_PAYMENT_TERMS: 'Monthly',
  };

  try {
    validateRequiredPlaceholders(incompleteValues);
    console.log('  ✗ Should have thrown for missing SOF_CLIENT_NAME');
    failed++;
  } catch (err) {
    if (err instanceof MSAValidationError && err.code === 'MISSING_REQUIRED') {
      console.log('  ✓ Correctly throws MSAValidationError for missing field');
      console.log(`    Error message: "${err.message}"`);
      passed++;
    } else {
      console.log('  ✗ Wrong error type:', err);
      failed++;
    }
  }
} catch (err) {
  console.log('  ✗ Error:', err);
  failed++;
}

// Test 6: Validation - all required present
console.log('\nTEST 6: Validation - all required present');
try {
  const completeValues: PlaceholderValues = {
    CLIENT_COUNTRY: 'USA',
    SOF_CLIENT_NAME: 'Test Corp',
    SOF_PRIMARY_CONTACT: 'John Doe',
    SOF_EMAIL: 'john@test.com',
    SOF_TERM: '1-Year',
    SOF_USERS: '5',
    SOF_CONSULTING_HOURS: '50',
    SOF_LIST_PRICE: '$10,000',
    SOF_INVESTMENT: '$8,000',
    SOF_PAYMENT_TERMS: 'Monthly',
  };

  validateRequiredPlaceholders(completeValues);
  console.log('  ✓ Validation passes for complete values');
  passed++;
} catch (err) {
  console.log('  ✗ Should not throw for complete values:', err);
  failed++;
}

// Test 7: MSAValidationError structure
console.log('\nTEST 7: MSAValidationError structure');
try {
  const error = new MSAValidationError('Test error', 'MISSING_REQUIRED', ['FIELD1', 'FIELD2']);
  if (error.message === 'Test error' && error.code === 'MISSING_REQUIRED' && error.details?.length === 2) {
    console.log('  ✓ MSAValidationError has correct structure');
    passed++;
  } else {
    console.log('  ✗ MSAValidationError structure incorrect');
    console.log(`    message: ${error.message}, code: ${error.code}, details: ${error.details}`);
    failed++;
  }
} catch (err) {
  console.log('  ✗ Error:', err);
  failed++;
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('TEST SUMMARY');
console.log('='.repeat(60));
console.log(`  Passed: ${passed}`);
console.log(`  Failed: ${failed}`);
console.log('');

if (failed === 0) {
  console.log('✅ ALL TYPESCRIPT TESTS PASSED!');
} else {
  console.log('❌ SOME TESTS FAILED');
  process.exit(1);
}
