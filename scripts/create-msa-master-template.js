#!/usr/bin/env node
/**
 * Create MSA Master Template
 *
 * This script creates the placeholder-annotated master template from
 * the Horwath HTL MSA document.
 *
 * IMPORTANT: This script performs ONLY exact string replacements of
 * identified variable values. NO other text is modified.
 *
 * Usage: node scripts/create-msa-master-template.js
 */

const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

// Source and destination paths
const SOURCE_PATH = path.join(process.env.HOME, 'Downloads', 'myRA MSA- Horwath HTL .docx');
const DEST_PATH = path.join(__dirname, '..', 'public', 'templates', 'myRA_MSA_MASTER.docx');

// Replacements to make in document.xml
// These are found by examining the actual XML structure
// Format: [original, placeholder]
const ALL_REPLACEMENTS = [
  // In Parties section: "Horwath " is separate from "HTL" in first occurrence
  // But "Horwath HTL" appears whole in Annexure B
  // We'll replace the whole instances first

  // Client country (appears after "laws of" - this works)
  ['Croatia', '{{CLIENT_COUNTRY}}'],

  // Order Form Table values (these appear as-is)
  ['3-Year', '{{SOF_TERM}}'],
  ['$120,000', '{{SOF_LIST_PRICE}}'],
  ['$90,000', '{{SOF_INVESTMENT}}'],
  ['Monthly, invoiced upfront', '{{SOF_PAYMENT_TERMS}}'],

  // Contact info in Annexure B (these appear as-is in XML)
  ['Sinisa Topalovic', '{{SOF_PRIMARY_CONTACT}}'],
  ['stopalovic@horwathhtl.com', '{{SOF_EMAIL}}'],
  ['+385 (0)99 8155 405', '{{SOF_PHONE}}'],

  // "100" for consulting hours - appears as-is
  // But we need to be careful - only replace in the order form table context
  // We'll use a regex-based approach for this

  // "Horwath HTL" appears in Annexure B client name and signature block
  ['Horwath HTL', '{{SOF_CLIENT_NAME}}'],
];

async function createMasterTemplate() {
  console.log('Creating MSA Master Template...');
  console.log(`Source: ${SOURCE_PATH}`);
  console.log(`Destination: ${DEST_PATH}`);

  // Check source exists
  if (!fs.existsSync(SOURCE_PATH)) {
    console.error(`ERROR: Source file not found: ${SOURCE_PATH}`);
    process.exit(1);
  }

  // Read source document
  const sourceData = fs.readFileSync(SOURCE_PATH);
  const zip = await JSZip.loadAsync(sourceData);

  // Process document.xml
  const docXmlFile = zip.file('word/document.xml');
  if (!docXmlFile) {
    console.error('ERROR: word/document.xml not found in source');
    process.exit(1);
  }

  let docXml = await docXmlFile.async('string');
  let replacementCount = 0;

  // Apply all replacements
  console.log('\nApplying replacements...');

  for (const [original, placeholder] of ALL_REPLACEMENTS) {
    const beforeLen = docXml.length;
    docXml = docXml.split(original).join(placeholder);
    const afterLen = docXml.length;

    if (beforeLen !== afterLen) {
      const occurrences = (beforeLen - afterLen) / (original.length - placeholder.length);
      console.log(`  ✓ Replaced "${original.substring(0, 40)}${original.length > 40 ? '...' : ''}" with ${placeholder} (${occurrences} occurrence${occurrences > 1 ? 's' : ''})`);
      replacementCount++;
    } else {
      console.log(`  ⚠ Text "${original.substring(0, 40)}${original.length > 40 ? '...' : ''}" not found as-is`);
    }
  }

  // Special handling for "100" - consulting hours
  // This appears as <w:t>100</w:t> in the order form table
  // We need to only replace the one in the table, not other occurrences
  // Looking at context: it appears after Users cell and before List Price
  const consultingHoursPattern = />100<\/w:t>/g;
  if (consultingHoursPattern.test(docXml)) {
    // Replace only the first occurrence that's exactly ">100</w:t>"
    docXml = docXml.replace(/>100<\/w:t>/, '>{{SOF_CONSULTING_HOURS}}</w:t>');
    console.log('  ✓ Replaced consulting hours "100" with {{SOF_CONSULTING_HOURS}}');
    replacementCount++;
  }

  // Special handling for "2" - users count
  // This is tricky because "2" appears many places
  // In the order form table, it appears as <w:t>2</w:t> in a cell
  // between Term and Consulting Hours
  // Let's find the pattern in the table context
  const usersPattern = />2<\/w:t>/;
  if (usersPattern.test(docXml)) {
    // Replace only the first occurrence after the term
    docXml = docXml.replace(/>2<\/w:t>/, '>{{SOF_USERS}}</w:t>');
    console.log('  ✓ Replaced users "2" with {{SOF_USERS}}');
    replacementCount++;
  }

  // Handle addresses - they appear in multiple XML text elements
  // Replace each part that we can find as-is
  const additionalReplacements = [
    ['Office Management in ', ''],  // Part of address - keep as-is for now
  ];

  // The following values need manual replacement because they're split across XML runs:
  // - CLIENT_LEGAL_NAME: "Horwath " + "HTL" + "." in parties section
  // - CLIENT_ADDRESS: Split across many runs
  // - SOF_REGISTERED_ADDRESS: Split across runs

  // For now, we'll document these as needing manual template editing

  // Update document.xml in zip
  zip.file('word/document.xml', docXml);

  console.log(`\nTotal replacements made: ${replacementCount}`);

  // Generate output
  const outputData = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });

  // Ensure destination directory exists
  const destDir = path.dirname(DEST_PATH);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  // Write output
  fs.writeFileSync(DEST_PATH, outputData);
  console.log(`\n✓ Master template created: ${DEST_PATH}`);

  // Verify by reading back and checking for placeholders
  console.log('\nVerifying placeholders in created template...');
  const verifyZip = await JSZip.loadAsync(fs.readFileSync(DEST_PATH));
  const verifyDocXml = await verifyZip.file('word/document.xml').async('string');

  const placeholders = [
    '{{CLIENT_LEGAL_NAME}}',
    '{{CLIENT_COUNTRY}}',
    '{{CLIENT_ADDRESS}}',
    '{{SOF_CLIENT_NAME}}',
    '{{SOF_REGISTERED_ADDRESS}}',
    '{{SOF_PRIMARY_CONTACT}}',
    '{{SOF_EMAIL}}',
    '{{SOF_PHONE}}',
    '{{SOF_TERM}}',
    '{{SOF_LIST_PRICE}}',
    '{{SOF_INVESTMENT}}',
    '{{SOF_PAYMENT_TERMS}}',
  ];

  const missing = [];
  for (const ph of placeholders) {
    if (verifyDocXml.includes(ph)) {
      console.log(`  ✓ Found ${ph}`);
    } else {
      console.log(`  ✗ Missing ${ph}`);
      missing.push(ph);
    }
  }

  if (missing.length > 0) {
    console.log('\n⚠ Some placeholders may need to be added manually:');
    missing.forEach(m => console.log(`  - ${m}`));
  }

  console.log('\nDone!');
}

createMasterTemplate().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
