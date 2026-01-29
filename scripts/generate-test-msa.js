#!/usr/bin/env node
/**
 * Generate a test MSA document for manual verification
 */

const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

const TEMPLATE_PATH = path.join(__dirname, '..', 'public', 'templates', 'myRA_MSA_MASTER.docx');
const OUTPUT_PATH = path.join(__dirname, '..', 'TEST_MSA_OUTPUT.docx');

const TEST_VALUES = {
  CLIENT_COUNTRY: 'United States',
  SOF_CLIENT_NAME: 'Acme Corporation',
  SOF_PRIMARY_CONTACT: 'John Smith',
  SOF_EMAIL: 'john.smith@acme.com',
  SOF_PHONE: '+1 (555) 123-4567',
  SOF_TERM: '2-Year',
  SOF_USERS: '5',
  SOF_CONSULTING_HOURS: '80',
  SOF_LIST_PRICE: '$100,000',
  SOF_INVESTMENT: '$75,000',
  SOF_PAYMENT_TERMS: 'Quarterly, invoiced upfront',
};

async function generateTestMSA() {
  console.log('Generating test MSA document...\n');

  // Load template
  const data = fs.readFileSync(TEMPLATE_PATH);
  const zip = await JSZip.loadAsync(data);

  // Read document.xml
  let docXml = await zip.file('word/document.xml').async('string');

  // Replace all placeholders
  console.log('Replacing placeholders:');
  for (const [key, value] of Object.entries(TEST_VALUES)) {
    const token = `{{${key}}}`;
    if (docXml.includes(token)) {
      docXml = docXml.split(token).join(value);
      console.log(`  ✓ {{${key}}} → "${value}"`);
    }
  }

  // Update document.xml
  zip.file('word/document.xml', docXml);

  // Generate output
  const output = await zip.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync(OUTPUT_PATH, output);

  console.log(`\n✅ Test MSA generated: ${OUTPUT_PATH}`);
  console.log('\nPlease open this file in Word to verify:');
  console.log('  1. Document opens without errors');
  console.log('  2. Client name "Acme Corporation" appears in the order form');
  console.log('  3. Country "United States" appears in the parties section');
  console.log('  4. All other values are correctly replaced');
  console.log('  5. All legal text is preserved');
  console.log('\n⚠️  Remember to delete this test file before committing!');
}

generateTestMSA().catch(console.error);
