#!/usr/bin/env node

/**
 * Test Groq-Powered Text Extraction
 *
 * Usage:
 *   node scripts/test-groq-extraction.js
 */

require('dotenv').config({ path: '.env.local' });
const Groq = require('groq-sdk').default;

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

const TEST_TEXT = `Ella.Morris@frieslandcampina.com
Esther.obafemi@frieslandcampina.com
Account Manager: Satish Boini

We had a great demo with FrieslandCampina today. They're interested in a 30-day trial for their team of 45 users. Looking at a $75K annual contract. Both Ella and Esther from the product team attended the demo.`;

const EXTRACTION_PROMPT = `You are an expert at extracting structured trial organization data from unstructured text like emails, meeting notes, and call summaries.

Extract the following information from the provided text:

1. **Organization**: Company name, website URL (infer from email domains if not explicit)
2. **Contacts**: Names, emails, roles/titles, phone numbers. Mark one as primary contact.
3. **Account Manager**: The person managing this account (look for phrases like "Account Manager:", "AM:", "managed by", "POC:", "contact", etc.)
4. **Business Metrics**:
   - Contract value (look for amounts like "$50K", "100K ARR", "six-figure deal")
   - Team size (look for "team of X", "X users", "X employees")
   - Trial duration in days (convert weeks to days: "2 weeks" = 14 days)
5. **Activities**: Demos, calls, meetings mentioned in the text

Return ONLY valid JSON matching this exact structure (no markdown, no explanation):
{
  "organization": {
    "name": "Company Name",
    "website": "https://example.com",
    "description": "Brief description if available"
  },
  "contacts": [
    {
      "name": "Full Name",
      "email": "email@example.com",
      "role": "Job Title",
      "phone": "+1-555-0123",
      "is_primary": true
    }
  ],
  "account_manager": {
    "name": "Full Name",
    "confidence": "high"
  },
  "business_metrics": {
    "contract_value": 50000,
    "team_size": 25,
    "trial_duration_days": 14
  },
  "activities": [
    {
      "type": "demo",
      "title": "Product Demo",
      "description": "Details about the activity",
      "date": "2025-01-15"
    }
  ]
}

**Important Instructions**:
- Extract company name from email domains if not explicitly mentioned (e.g., "john@acmecorp.com" → "AcmeCorp")
- Capitalize company names properly: "frieslandcampina" → "FrieslandCampina"
- Look for account manager in various forms: "Account Manager: John", "managed by Jane", "POC is Mike", "talk to Sarah"
- Infer values when possible: "six-figure deal" → 100000, "small team" → 10
- Convert weeks to days: "2 week trial" → 14
- Activity types: demo, call, meeting, email, training, support
- Return null for organization/account_manager if not found, empty arrays for contacts/activities if none
- All fields are optional except the top-level structure`;

async function testGroqExtraction() {
  console.log('🧪 Testing Groq-Powered Text Extraction\n');
  console.log('=' .repeat(60));
  console.log('TEST INPUT:\n');
  console.log(TEST_TEXT);
  console.log('\n' + '='.repeat(60));

  if (!process.env.GROQ_API_KEY) {
    console.error('\n❌ GROQ_API_KEY not found in .env.local');
    console.error('   Please add: GROQ_API_KEY=your_key_here');
    process.exit(1);
  }

  try {
    console.log('\n🤖 Calling Groq API (llama-3.1-8b-instant)...\n');

    const startTime = Date.now();

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
      max_tokens: 2000,
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
    console.log('=' .repeat(60));
    console.log('EXTRACTED DATA:\n');
    console.log(JSON.stringify(extracted, null, 2));
    console.log('\n' + '='.repeat(60));

    // Validation
    console.log('\n📊 VALIDATION:\n');

    const validations = [
      {
        label: 'Organization Name',
        expected: 'FrieslandCampina',
        actual: extracted.organization?.name,
        pass: extracted.organization?.name === 'FrieslandCampina'
      },
      {
        label: 'Contact 1 Email',
        expected: 'Ella.Morris@frieslandcampina.com',
        actual: extracted.contacts?.[0]?.email,
        pass: extracted.contacts?.some(c => c.email === 'Ella.Morris@frieslandcampina.com')
      },
      {
        label: 'Contact 2 Email',
        expected: 'Esther.obafemi@frieslandcampina.com',
        actual: extracted.contacts?.[1]?.email,
        pass: extracted.contacts?.some(c => c.email === 'Esther.obafemi@frieslandcampina.com')
      },
      {
        label: 'Account Manager',
        expected: 'Satish Boini',
        actual: extracted.account_manager?.name,
        pass: extracted.account_manager?.name === 'Satish Boini'
      },
      {
        label: 'Team Size',
        expected: 45,
        actual: extracted.business_metrics?.team_size,
        pass: extracted.business_metrics?.team_size === 45
      },
      {
        label: 'Contract Value',
        expected: 75000,
        actual: extracted.business_metrics?.contract_value,
        pass: extracted.business_metrics?.contract_value === 75000
      },
      {
        label: 'Trial Duration',
        expected: 30,
        actual: extracted.business_metrics?.trial_duration_days,
        pass: extracted.business_metrics?.trial_duration_days === 30
      }
    ];

    let passCount = 0;
    validations.forEach(v => {
      const status = v.pass ? '✅ PASS' : '❌ FAIL';
      console.log(`   ${status} ${v.label}: ${v.actual} ${v.pass ? '' : `(expected: ${v.expected})`}`);
      if (v.pass) passCount++;
    });

    const passRate = ((passCount / validations.length) * 100).toFixed(1);

    console.log('\n' + '='.repeat(60));
    console.log(`\n📈 TEST RESULTS: ${passCount}/${validations.length} passed (${passRate}%)`);
    console.log(`⏱️  Response Time: ${duration}ms`);
    console.log(`💰 Cost: ~$0.000015 (Groq free tier: 30 req/min, 14,400/day)\n`);

    if (passCount === validations.length) {
      console.log('🎉 All validations passed! Groq extraction is working perfectly.\n');
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

testGroqExtraction();
