/**
 * Comprehensive test script for myRA Quote Generator
 * Run with: npx tsx scripts/test-quote-generator.ts
 */

import { writeFileSync } from 'fs';
import { join } from 'path';

// Import the modules we're testing
import {
  generateQuotePDF,
  generateFilename,
  formatCurrency,
  generateClientCode,
} from '../lib/quote/pdf-generator';
import type { QuoteFormData, Currency } from '../lib/quote/types';
import { CURRENCY_SYMBOLS } from '../lib/quote/types';
import { TEMPLATE_PRESETS, STATIC_CONTENT } from '../lib/quote/constants';

// Test results tracking
interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function test(name: string, fn: () => void | Promise<void>) {
  return (async () => {
    try {
      await fn();
      results.push({ name, passed: true });
      console.log(`✅ ${name}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      results.push({ name, passed: false, error: errorMsg });
      console.log(`❌ ${name}: ${errorMsg}`);
    }
  })();
}

function assertEqual<T>(actual: T, expected: T, message?: string) {
  if (actual !== expected) {
    throw new Error(message || `Expected "${expected}" but got "${actual}"`);
  }
}

function assertTrue(condition: boolean, message?: string) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// ==================== TEST DATA ====================

const sampleQuote: QuoteFormData = {
  preparedFor: 'Acme Corporation',
  contactName: 'John Smith',
  contactTitle: 'VP of Strategy',
  contactEmail: 'john.smith@acme.com',
  quoteDate: '2025-12-15',
  currency: 'USD',
  rows: [
    {
      term: '1-Year',
      users: '10',
      consultingHours: '500/yr',
      listPrice: '75000',
      offerPrice: '60000',
    },
    {
      term: '2-Year',
      users: '25',
      consultingHours: '1,000/yr',
      listPrice: '200000',
      offerPrice: '160000',
    },
  ],
  validUntil: '2026-01-14',
  preparedBy: 'Sarah Johnson',
  showConfidential: true,
  dealContext: {
    discountReason: 'strategic',
    specialTerms: 'Net 45 payment terms agreed',
    decisionDate: '2025-12-30',
    urgency: 'standard',
  },
};

// ==================== TESTS ====================

async function runTests() {
  console.log('\n🧪 myRA Quote Generator - Comprehensive Test Suite\n');
  console.log('='.repeat(60) + '\n');

  // -------------------- Client Code Generation --------------------
  console.log('📋 Testing Client Code Generation\n');

  await test('Client code: Single word after suffix removal', () => {
    // "Corporation" is filtered, leaving "Acme" → take first 4 chars
    assertEqual(generateClientCode('Acme Corporation'), 'ACME');
  });

  await test('Client code: Multiple words (no suffixes)', () => {
    // 3 words, first letter of each → TCS
    assertEqual(generateClientCode('Tata Consultancy Services'), 'TCS');
  });

  await test('Client code: With suffix removal (Ltd)', () => {
    // "Ltd" is filtered, leaving "Ergomed" → take first 4 chars
    assertEqual(generateClientCode('Ergomed Ltd'), 'ERGO');
  });

  await test('Client code: With suffix removal (Group)', () => {
    // "Group" is filtered, leaving "Ergomed" → take first 4 chars
    assertEqual(generateClientCode('Ergomed Group'), 'ERGO');
  });

  await test('Client code: Max 4 characters', () => {
    const code = generateClientCode('Alpha Beta Gamma Delta Epsilon');
    assertTrue(code.length <= 4, `Code "${code}" exceeds 4 characters`);
  });

  await test('Client code: With Private Limited suffix', () => {
    // "Private" and "Limited" are filtered, leaving "Infosys" → first 4 chars
    assertEqual(generateClientCode('Infosys Private Limited'), 'INFO');
  });

  await test('Client code: Complex company name', () => {
    // "Group" and "Inc" are filtered, leaving "Boston Consulting" → BC
    const code = generateClientCode('Boston Consulting Group Inc');
    assertEqual(code, 'BC');
  });

  await test('Client code: Empty fallback', () => {
    assertEqual(generateClientCode('Ltd'), 'QUOTE');
  });

  // -------------------- Currency Formatting --------------------
  console.log('\n📋 Testing Currency Formatting\n');

  await test('Currency: USD formatting', () => {
    assertEqual(formatCurrency('150000', 'USD'), '$150,000');
  });

  await test('Currency: EUR formatting (PDF-safe)', () => {
    // Uses "EUR " prefix for PDF compatibility
    assertEqual(formatCurrency('150000', 'EUR'), 'EUR 150,000');
  });

  await test('Currency: GBP formatting (PDF-safe)', () => {
    // Uses "GBP " prefix for PDF compatibility
    assertEqual(formatCurrency('150000', 'GBP'), 'GBP 150,000');
  });

  await test('Currency: INR formatting (Indian numbering)', () => {
    // Uses "INR " prefix since ₹ not supported in standard PDF fonts
    const formatted = formatCurrency('150000', 'INR');
    assertEqual(formatted, 'INR 1,50,000');
  });

  await test('Currency: INR large number (lakhs)', () => {
    const formatted = formatCurrency('1500000', 'INR');
    assertEqual(formatted, 'INR 15,00,000');
  });

  await test('Currency: INR very large (crores)', () => {
    const formatted = formatCurrency('10000000', 'INR');
    assertEqual(formatted, 'INR 1,00,00,000');
  });

  await test('Currency: Handles commas in input', () => {
    assertEqual(formatCurrency('150,000', 'USD'), '$150,000');
  });

  await test('Currency: Handles invalid input gracefully', () => {
    assertEqual(formatCurrency('invalid', 'USD'), 'invalid');
  });

  await test('Currency: Decimal values', () => {
    const formatted = formatCurrency('15000.50', 'USD');
    assertTrue(formatted.includes('$'), 'Should include dollar sign');
  });

  // -------------------- Filename Generation --------------------
  console.log('\n📋 Testing Filename Generation\n');

  await test('Filename: Correct format', () => {
    // "Acme Corporation" → "ACME" (Corporation filtered, single word → first 4 chars)
    const filename = generateFilename(sampleQuote);
    assertEqual(filename, 'myRA_Quote_ACME_20251215.pdf');
  });

  await test('Filename: Different company', () => {
    const quote = { ...sampleQuote, preparedFor: 'Tata Consultancy Services' };
    const filename = generateFilename(quote);
    assertEqual(filename, 'myRA_Quote_TCS_20251215.pdf');
  });

  await test('Filename: Different date', () => {
    const quote = { ...sampleQuote, quoteDate: '2025-01-05' };
    const filename = generateFilename(quote);
    assertTrue(filename.includes('20250105'), 'Should contain formatted date');
  });

  // -------------------- Template Presets --------------------
  console.log('\n📋 Testing Template Presets\n');

  await test('Template presets: All 3 presets exist', () => {
    assertEqual(TEMPLATE_PRESETS.length, 3);
  });

  await test('Template presets: 1-Year Standard values', () => {
    const preset = TEMPLATE_PRESETS.find(p => p.name === '1-Year Standard');
    assertTrue(!!preset, 'Preset should exist');
    assertEqual(preset!.rows[0].users, '10');
    assertEqual(preset!.rows[0].consultingHours, '500/yr');
  });

  await test('Template presets: 2-Year Growth values', () => {
    const preset = TEMPLATE_PRESETS.find(p => p.name === '2-Year Growth');
    assertTrue(!!preset, 'Preset should exist');
    assertEqual(preset!.rows[0].users, '25');
  });

  await test('Template presets: 3-Year Enterprise values', () => {
    const preset = TEMPLATE_PRESETS.find(p => p.name === '3-Year Enterprise');
    assertTrue(!!preset, 'Preset should exist');
    assertEqual(preset!.rows[0].users, '50');
  });

  // -------------------- Static Content --------------------
  console.log('\n📋 Testing Static Content\n');

  await test('Static content: The Proposal exists', () => {
    assertTrue(STATIC_CONTENT.theProposal.length > 100, 'Should have substantial content');
    assertTrue(STATIC_CONTENT.theProposal.includes('myRA AI'), 'Should mention myRA AI');
  });

  await test('Static content: Platform Access has 6 bullets', () => {
    assertEqual(STATIC_CONTENT.platformAccessBullets.length, 6);
  });

  await test('Static content: How We Work has 4 bullets', () => {
    assertEqual(STATIC_CONTENT.howWeWorkBullets.length, 4);
  });

  await test('Static content: Security has 4 bullets', () => {
    assertEqual(STATIC_CONTENT.securityBullets.length, 4);
  });

  await test('Static content: Important notice exists', () => {
    assertTrue(STATIC_CONTENT.importantNotice.includes('Important Notice'));
  });

  await test('Static content: Footer lines exist', () => {
    assertTrue(STATIC_CONTENT.footerLine1.includes('Mordor Intelligence'));
    assertTrue(STATIC_CONTENT.footerLine2.includes('ISO 9001'));
  });

  // -------------------- PDF Generation --------------------
  console.log('\n📋 Testing PDF Generation\n');

  await test('PDF: Generate with USD', async () => {
    const pdfBytes = await generateQuotePDF(sampleQuote);
    console.log(`   📊 PDF size: ${pdfBytes.length} bytes`);
    assertTrue(pdfBytes.length > 5000, `PDF should have substantial content (got ${pdfBytes.length} bytes)`);
    // Check PDF header
    const header = String.fromCharCode(...pdfBytes.slice(0, 8));
    assertTrue(header.startsWith('%PDF'), 'Should be valid PDF');
  });

  await test('PDF: Generate with EUR', async () => {
    const quote = { ...sampleQuote, currency: 'EUR' as Currency };
    const pdfBytes = await generateQuotePDF(quote);
    assertTrue(pdfBytes.length > 5000, `PDF should have substantial content (got ${pdfBytes.length} bytes)`);
  });

  await test('PDF: Generate with GBP', async () => {
    const quote = { ...sampleQuote, currency: 'GBP' as Currency };
    const pdfBytes = await generateQuotePDF(quote);
    assertTrue(pdfBytes.length > 5000, `PDF should have substantial content (got ${pdfBytes.length} bytes)`);
  });

  await test('PDF: Generate with INR', async () => {
    const quote = { ...sampleQuote, currency: 'INR' as Currency };
    const pdfBytes = await generateQuotePDF(quote);
    assertTrue(pdfBytes.length > 5000, `PDF should have substantial content (got ${pdfBytes.length} bytes)`);
  });

  await test('PDF: Generate with empty rows', async () => {
    const quote = {
      ...sampleQuote,
      rows: [{ term: '', users: '', consultingHours: '', listPrice: '', offerPrice: '' }],
    };
    const pdfBytes = await generateQuotePDF(quote);
    assertTrue(pdfBytes.length > 3000, 'PDF should still generate');
  });

  await test('PDF: Generate with single row', async () => {
    const quote = {
      ...sampleQuote,
      rows: [sampleQuote.rows[0]],
    };
    const pdfBytes = await generateQuotePDF(quote);
    assertTrue(pdfBytes.length > 5000, `PDF should have substantial content (got ${pdfBytes.length} bytes)`);
  });

  await test('PDF: Generate with many rows', async () => {
    const quote = {
      ...sampleQuote,
      rows: [
        ...sampleQuote.rows,
        { term: '3-Year', users: '50', consultingHours: '2,000/yr', listPrice: '500000', offerPrice: '400000' },
        { term: '5-Year', users: '100', consultingHours: '5,000/yr', listPrice: '1000000', offerPrice: '800000' },
      ],
    };
    const pdfBytes = await generateQuotePDF(quote);
    assertTrue(pdfBytes.length > 5000, `PDF should have substantial content (got ${pdfBytes.length} bytes)`);
  });

  await test('PDF: Generate without contact title', async () => {
    const quote = { ...sampleQuote, contactTitle: '' };
    const pdfBytes = await generateQuotePDF(quote);
    assertTrue(pdfBytes.length > 5000, `PDF should generate without title (got ${pdfBytes.length} bytes)`);
  });

  await test('PDF: Generate with long company name', async () => {
    const quote = {
      ...sampleQuote,
      preparedFor: 'The Very Long Company Name International Holdings Corporation Limited',
    };
    const pdfBytes = await generateQuotePDF(quote);
    assertTrue(pdfBytes.length > 5000, `PDF should handle long names (got ${pdfBytes.length} bytes)`);
  });

  // -------------------- Save Sample PDFs --------------------
  console.log('\n📋 Generating Sample PDFs\n');

  const outputDir = join(process.cwd(), 'test-results');

  try {
    const { mkdirSync } = await import('fs');
    mkdirSync(outputDir, { recursive: true });
  } catch {
    // Directory may already exist
  }

  for (const currency of ['USD', 'EUR', 'GBP', 'INR'] as Currency[]) {
    await test(`PDF: Save sample ${currency} quote`, async () => {
      const quote = {
        ...sampleQuote,
        currency,
        preparedFor: `Sample Company (${currency})`,
      };
      const pdfBytes = await generateQuotePDF(quote);
      const filename = `sample_quote_${currency}.pdf`;
      writeFileSync(join(outputDir, filename), pdfBytes);
      console.log(`   📄 Saved: test-results/${filename}`);
    });
  }

  // -------------------- Edge Cases --------------------
  console.log('\n📋 Testing Edge Cases\n');

  await test('Edge: Special characters in company name', async () => {
    const quote = {
      ...sampleQuote,
      preparedFor: 'ABC & Co. (India) Pvt. Ltd.',
    };
    const pdfBytes = await generateQuotePDF(quote);
    assertTrue(pdfBytes.length > 5000, `Should handle special characters (got ${pdfBytes.length} bytes)`);
  });

  await test('Edge: ASCII contact name', async () => {
    // Note: Standard PDF fonts only support ASCII/Latin-1
    const quote = {
      ...sampleQuote,
      contactName: 'Jose Garcia',
    };
    const pdfBytes = await generateQuotePDF(quote);
    assertTrue(pdfBytes.length > 5000, `Should handle ASCII names (got ${pdfBytes.length} bytes)`);
  });

  await test('Edge: Very large price values', async () => {
    const quote = {
      ...sampleQuote,
      rows: [{
        term: '5-Year',
        users: '1000',
        consultingHours: '50,000/yr',
        listPrice: '99999999',
        offerPrice: '88888888',
      }],
    };
    const pdfBytes = await generateQuotePDF(quote);
    assertTrue(pdfBytes.length > 5000, `Should handle large values (got ${pdfBytes.length} bytes)`);
  });

  await test('Edge: Zero price values', async () => {
    const quote = {
      ...sampleQuote,
      rows: [{
        term: 'Trial',
        users: '5',
        consultingHours: '0',
        listPrice: '0',
        offerPrice: '0',
      }],
    };
    const pdfBytes = await generateQuotePDF(quote);
    assertTrue(pdfBytes.length > 5000, `Should handle zero values (got ${pdfBytes.length} bytes)`);
  });

  // -------------------- Validation Logic --------------------
  console.log('\n📋 Testing Validation Logic\n');

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  await test('Validation: Valid email passes', () => {
    assertTrue(EMAIL_REGEX.test('john@example.com'));
  });

  await test('Validation: Invalid email fails (no @)', () => {
    assertTrue(!EMAIL_REGEX.test('johnexample.com'));
  });

  await test('Validation: Invalid email fails (no domain)', () => {
    assertTrue(!EMAIL_REGEX.test('john@'));
  });

  await test('Validation: Invalid email fails (spaces)', () => {
    assertTrue(!EMAIL_REGEX.test('john @example.com'));
  });

  await test('Validation: Complex valid email passes', () => {
    assertTrue(EMAIL_REGEX.test('john.smith+tag@sub.example.co.uk'));
  });

  // -------------------- Summary --------------------
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 TEST SUMMARY\n');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  console.log(`Total:  ${total}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);
  console.log(`Rate:   ${((passed / total) * 100).toFixed(1)}%`);

  if (failed > 0) {
    console.log('\n❌ Failed Tests:\n');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}`);
      console.log(`    Error: ${r.error}`);
    });
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!\n');
    console.log('📄 Sample PDFs saved to: test-results/');
    console.log('   - sample_quote_USD.pdf');
    console.log('   - sample_quote_EUR.pdf');
    console.log('   - sample_quote_GBP.pdf');
    console.log('   - sample_quote_INR.pdf');
  }
}

runTests().catch(console.error);
