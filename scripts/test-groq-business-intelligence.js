#!/usr/bin/env node

/**
 * Test Enhanced Groq Extraction with Business Intelligence
 *
 * Usage:
 *   GROQ_API_KEY=xxx node scripts/test-groq-business-intelligence.js
 */

require('dotenv').config({ path: '.env.local' });
const Groq = require('groq-sdk').default;

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// Rich test case with business intelligence signals
const TEST_TEXT = `Had an amazing demo with Protiviti today! Naresh Tulsani (naresh.tulsani@protivitiglobal.me, Associate Director) was really impressed with our AI research capabilities. He's championing this internally and mentioned they currently use Gartner but find it too expensive.

Their team of 50 analysts would use myRA daily for client consulting projects. Main concerns: data security for confidential client work and integration with their existing tools.

Naresh will present to the board next week for final approval. Looking at a $120K annual contract. Account Manager: Sudeshana Boini.

They need: competitive intelligence, market sizing data, and industry trend analysis for their clients in the consulting space. This is clearly an AI-first organization - they're already using AI tools for research.`;

async function testEnhancedExtraction() {
  console.log('🧪 Testing Enhanced Groq Extraction with Business Intelligence\n');
  console.log('='.repeat(70));
  console.log('TEST INPUT:\n');
  console.log(TEST_TEXT);
  console.log('\n' + '='.repeat(70));

  if (!process.env.GROQ_API_KEY) {
    console.error('\n❌ GROQ_API_KEY not found in environment');
    process.exit(1);
  }

  try {
    console.log('\n🤖 Calling Groq API with enhanced business intelligence extraction...\n');

    const startTime = Date.now();

    // Import the extraction prompt from groqParser.ts
    const fs = require('fs');
    const groqParserContent = fs.readFileSync('./lib/trials/groqParser.ts', 'utf8');

    // Extract the EXTRACTION_PROMPT from the file
    const promptMatch = groqParserContent.match(/const EXTRACTION_PROMPT = `([^`]+)`/s);
    if (!promptMatch) {
      throw new Error('Could not find EXTRACTION_PROMPT in groqParser.ts');
    }
    const EXTRACTION_PROMPT = promptMatch[1];

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: EXTRACTION_PROMPT
        },
        {
          role: 'user',
          content: `Extract structured data from this text:\n\n${TEST_TEXT}`
        }
      ],
      temperature: 0.1,
      max_tokens: 3000,
      response_format: { type: 'json_object' }
    });

    const duration = Date.now() - startTime;

    const responseText = completion.choices[0]?.message?.content;

    if (!responseText) {
      throw new Error('No response from Groq');
    }

    // Parse JSON response
    const extracted = JSON.parse(responseText);

    console.log('✅ Groq Extraction Successful!\n');
    console.log('='.repeat(70));
    console.log('EXTRACTED DATA:\n');
    console.log(JSON.stringify(extracted, null, 2));
    console.log('\n' + '='.repeat(70));

    // Validation
    console.log('\n📊 CORE DATA VALIDATION:\n');

    const coreValidations = [
      {
        label: 'Organization Name',
        expected: 'Protiviti',
        actual: extracted.organization?.name,
        pass: extracted.organization?.name === 'Protiviti'
      },
      {
        label: 'Website URL',
        expected: 'https://protiviti.com',
        actual: extracted.organization?.website,
        pass: extracted.organization?.website?.includes('protiviti.com')
      },
      {
        label: 'Logo URL',
        expected: 'https://logo.clearbit.com/protiviti.com',
        actual: extracted.organization?.logo_url,
        pass: extracted.organization?.logo_url?.includes('logo.clearbit.com')
      },
      {
        label: 'Description',
        expected: 'Present (company context)',
        actual: extracted.organization?.description ? 'Present' : 'Missing',
        pass: !!extracted.organization?.description
      },
      {
        label: 'Contact Email',
        expected: 'naresh.tulsani@protivitiglobal.me',
        actual: extracted.contacts?.[0]?.email,
        pass: extracted.contacts?.some(c => c.email?.toLowerCase().includes('naresh'))
      },
      {
        label: 'Contact Name',
        expected: 'Naresh Tulsani',
        actual: extracted.contacts?.[0]?.name,
        pass: extracted.contacts?.[0]?.name?.includes('Naresh')
      },
      {
        label: 'Account Manager (First Name Only)',
        expected: 'Sudeshana',
        actual: extracted.account_manager?.name,
        pass: extracted.account_manager?.name === 'Sudeshana'
      },
      {
        label: 'Team Size',
        expected: 50,
        actual: extracted.business_metrics?.team_size,
        pass: extracted.business_metrics?.team_size === 50
      },
      {
        label: 'Contract Value',
        expected: 120000,
        actual: extracted.business_metrics?.contract_value,
        pass: extracted.business_metrics?.contract_value === 120000
      }
    ];

    let corePassCount = 0;
    coreValidations.forEach(v => {
      const status = v.pass ? '✅ PASS' : '❌ FAIL';
      console.log(`   ${status} ${v.label}: ${v.actual} ${v.pass ? '' : `(expected: ${v.expected})`}`);
      if (v.pass) corePassCount++;
    });

    console.log('\n📊 BUSINESS INTELLIGENCE VALIDATION:\n');

    const biValidations = [
      {
        label: 'Trial Stage Detected',
        expected: 'demo or feedback',
        actual: extracted.trial_stage,
        pass: ['demo', 'feedback', 'decision'].includes(extracted.trial_stage)
      },
      {
        label: 'Engagement Type (Champion)',
        expected: 'champion',
        actual: extracted.contacts?.[0]?.engagement_type,
        pass: extracted.contacts?.[0]?.engagement_type === 'champion'
      },
      {
        label: 'Sentiment',
        expected: 'positive',
        actual: extracted.engagement_signals?.sentiment,
        pass: extracted.engagement_signals?.sentiment === 'positive'
      },
      {
        label: 'Adoption Level',
        expected: 'high or medium',
        actual: extracted.engagement_signals?.adoption_level,
        pass: ['high', 'medium'].includes(extracted.engagement_signals?.adoption_level)
      },
      {
        label: 'Feedback Captured',
        expected: 'Array with items',
        actual: `${extracted.engagement_signals?.feedback?.length || 0} items`,
        pass: (extracted.engagement_signals?.feedback?.length || 0) > 0
      },
      {
        label: 'Objections Captured',
        expected: 'Array with items',
        actual: `${extracted.engagement_signals?.objections?.length || 0} items`,
        pass: (extracted.engagement_signals?.objections?.length || 0) > 0
      },
      {
        label: 'Use Case Extracted',
        expected: 'Present',
        actual: extracted.market_intelligence?.use_case ? 'Present' : 'Missing',
        pass: !!extracted.market_intelligence?.use_case
      },
      {
        label: 'Industry Context',
        expected: 'Consulting',
        actual: extracted.market_intelligence?.industry_context,
        pass: extracted.market_intelligence?.industry_context?.toLowerCase().includes('consult')
      },
      {
        label: 'Competitive Mentions',
        expected: 'Gartner',
        actual: extracted.market_intelligence?.competitive_mentions?.join(', ') || 'None',
        pass: extracted.market_intelligence?.competitive_mentions?.some(c => c.toLowerCase().includes('gartner'))
      },
      {
        label: 'AI Adoption Signals',
        expected: 'Detected',
        actual: `${extracted.market_intelligence?.ai_adoption_signals?.length || 0} signals`,
        pass: (extracted.market_intelligence?.ai_adoption_signals?.length || 0) > 0
      },
      {
        label: 'Research Needs',
        expected: 'Array with items',
        actual: `${extracted.market_intelligence?.research_needs?.length || 0} items`,
        pass: (extracted.market_intelligence?.research_needs?.length || 0) > 0
      }
    ];

    let biPassCount = 0;
    biValidations.forEach(v => {
      const status = v.pass ? '✅ PASS' : '❌ FAIL';
      console.log(`   ${status} ${v.label}: ${v.actual} ${v.pass ? '' : `(expected: ${v.expected})`}`);
      if (v.pass) biPassCount++;
    });

    const totalValidations = coreValidations.length + biValidations.length;
    const totalPassCount = corePassCount + biPassCount;
    const passRate = ((totalPassCount / totalValidations) * 100).toFixed(1);

    console.log('\n' + '='.repeat(70));
    console.log(`\n📈 TEST RESULTS: ${totalPassCount}/${totalValidations} passed (${passRate}%)`);
    console.log(`   Core Data: ${corePassCount}/${coreValidations.length} passed`);
    console.log(`   Business Intelligence: ${biPassCount}/${biValidations.length} passed`);
    console.log(`⏱️  Response Time: ${duration}ms`);
    console.log(`💰 Cost: ~$0.000020 (Groq free tier: 30 req/min, 14,400/day)\n`);

    if (totalPassCount === totalValidations) {
      console.log('🎉 All validations passed! Enhanced Groq extraction is working perfectly.\n');
    } else if (totalPassCount >= totalValidations * 0.8) {
      console.log('✅ Good performance! Most validations passed.\n');
    } else {
      console.log('⚠️  Some validations failed. Review the output above.\n');
    }

  } catch (error) {
    console.error('\n❌ Groq API Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
}

testEnhancedExtraction();
