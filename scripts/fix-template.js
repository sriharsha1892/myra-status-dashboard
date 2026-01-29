const fs = require('fs');
const JSZip = require('jszip');

const TEMPLATE_PATH = './public/templates/myRA_MSA_MASTER.docx';

async function fixTemplate() {
  const data = fs.readFileSync(TEMPLATE_PATH);
  const zip = await JSZip.loadAsync(data);
  let docXml = await zip.file('word/document.xml').async('string');

  console.log('Analyzing XML structure for remaining placeholders...\n');

  let modified = false;

  // Try to replace client legal name patterns
  const clientNamePatterns = [
    ['Horwath HTL.,', '{{CLIENT_LEGAL_NAME}},'],
    ['Horwath HTL.', '{{CLIENT_LEGAL_NAME}}'],
  ];

  for (const [find, replace] of clientNamePatterns) {
    if (docXml.includes(find)) {
      docXml = docXml.split(find).join(replace);
      console.log(`  ✓ Replaced "${find}" with "${replace}"`);
      modified = true;
    }
  }

  if (modified) {
    zip.file('word/document.xml', docXml);
    const output = await zip.generateAsync({ type: 'nodebuffer' });
    fs.writeFileSync(TEMPLATE_PATH, output);
    console.log('\nTemplate updated!');
  } else {
    console.log('\nNo additional string-based modifications made.');
  }

  // Final verification
  console.log('\n--- Final Placeholder Check ---');
  const allPlaceholders = [
    'CLIENT_LEGAL_NAME',
    'CLIENT_COUNTRY',
    'CLIENT_ADDRESS',
    'SOF_CLIENT_NAME',
    'SOF_REGISTERED_ADDRESS',
    'SOF_PRIMARY_CONTACT',
    'SOF_EMAIL',
    'SOF_PHONE',
    'SOF_TERM',
    'SOF_USERS',
    'SOF_CONSULTING_HOURS',
    'SOF_LIST_PRICE',
    'SOF_INVESTMENT',
    'SOF_PAYMENT_TERMS',
  ];

  const found = [];
  const missing = [];

  for (const ph of allPlaceholders) {
    if (docXml.includes('{{' + ph + '}}')) {
      found.push(ph);
    } else {
      missing.push(ph);
    }
  }

  console.log('\nFound:', found.join(', '));
  console.log('\nMissing:', missing.join(', '));

  if (missing.length > 0) {
    console.log('\n⚠ Missing placeholders need to be added manually in Word');
    console.log('  These values are split across XML runs in the original document.');
  }
}

fixTemplate().catch(console.error);
