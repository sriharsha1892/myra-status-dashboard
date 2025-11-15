#!/usr/bin/env node
/**
 * Debug Account Manager Extraction
 *
 * This script tests the full account manager extraction and matching flow:
 * 1. Groq extraction from text
 * 2. Finding extracted account manager
 * 3. Fuzzy matching against database users
 * 4. Auto-selection logic
 */

const Groq = require('groq-sdk');
const { createClient } = require('@supabase/supabase-js');
const fuzz = require('fuzzball');

require('dotenv').config({ path: '.env.local' });

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Test data with explicit account manager mention
const TEST_TEXTS = [
  {
    name: "Test 1: Standard format - AM: Satish Boini",
    text: `Meeting with TEST-Company today.
Contact: john@test.com
$50K deal, 25 users, 14 days trial
AM: Satish Boini
Great demo!`
  },
  {
    name: "Test 2: Full phrase - Account Manager: Satish",
    text: `Demo with TestCorp.
Contact: sarah@testcorp.io
Account Manager: Satish
Very interested in AI features.`
  },
  {
    name: "Test 3: Just first name - AM: Satish",
    text: `Quick meeting notes:
Company: DataTest Inc
Contact: alex@datatest.com
AM: Satish
Follow-up scheduled`
  },
  {
    name: "Test 4: Different AM - Rupak",
    text: `Trial setup for BigCorp
Contact: manager@bigcorp.com
Account Manager: Rupak
$100K contract`
  }
];

const EXTRACTION_PROMPT = `Extract trial organization data from unstructured text (emails, meeting notes, call summaries).

**CONTEXT:** myRA = AI market research platform for trial management by Mordor Intelligence
**GOAL:** Extract trial intelligence: contacts, business metrics, engagement signals, sentiment, trial stage

**OUTPUT FORMAT:**
{
  "organization": {
    "name": "Company Name",
    "website": "https://example.com",
    "logo_url": "https://logo.clearbit.com/example.com",
    "description": "Brief third-person description"
  },
  "contacts": [{
    "name": "Full Name",
    "email": "email@example.com",
    "role": "Job Title",
    "phone": "+1-555-0123",
    "is_primary": true,
    "engagement_type": "champion" | "decision_maker" | "blocker" | "active" | "silent"
  }],
  "account_manager": {"name": "First Name Only", "confidence": "high" | "medium" | "low"},
  "business_metrics": {
    "contract_value": 50000,
    "team_size": 25,
    "trial_duration_days": 14
  },
  "activities": [{
    "type": "demo" | "call" | "meeting" | "email" | "training",
    "title": "Brief summary",
    "description": "Details",
    "date": "2025-01-15"
  }],
  "trial_stage": "initial_contact" | "demo" | "trial_start" | "onboarding" | "active_usage" | "feedback" | "decision" | "unknown",
  "engagement_signals": {
    "adoption_level": "high" | "medium" | "low" | "unknown",
    "sentiment": "positive" | "neutral" | "negative" | "mixed",
    "feedback": ["Feature request 1"],
    "objections": ["Security concern"],
    "usage_indicators": ["Using daily"]
  },
  "market_intelligence": {
    "use_case": "Problem they're solving",
    "industry_context": "Industry vertical and context",
    "competitive_mentions": ["Tool1"],
    "ai_adoption_signals": ["AI maturity indicator"],
    "research_needs": ["Market size data"]
  }
}

**ACCOUNT MANAGER EXTRACTION RULES:**
- Known AMs: Rupak, Kartheek, Sudeshana, Satish, Nikita, Satyananth, Krati
- Look for: "AM:", "Account Manager:", "managed by", "POC:"
- ONLY extract first name: "Satish Boini" → "Satish"
- Confidence: high (exact keyword match), medium (inferred), low (guessed)

Return ONLY valid JSON (no markdown, no explanation).`;

async function extractWithGroq(text) {
  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: EXTRACTION_PROMPT
        },
        {
          role: 'user',
          content: `Extract structured data from this text:\n\n${text}`
        }
      ],
      temperature: 0.1,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('No response from Groq');
    }

    return JSON.parse(responseText);
  } catch (error) {
    console.error('Groq extraction failed:', error.message);
    throw error;
  }
}

async function getAccountManagers() {
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, email, role')
    .or('role.eq.Account Manager,role.eq.Admin')
    .order('full_name', { ascending: true });

  if (error) {
    console.error('Error fetching account managers:', error.message);
    return [];
  }

  return data.map(user => ({
    id: user.id,
    name: user.full_name,
    email: user.email,
    role: user.role
  }));
}

function fuzzyMatchAccountManager(extractedName, accountManagers) {
  if (!extractedName || !accountManagers || accountManagers.length === 0) {
    return null;
  }

  // Try exact match first
  let matchedManager = accountManagers.find((m) =>
    m.name?.toLowerCase() === extractedName.toLowerCase()
  );

  // If no exact match, try fuzzy matching
  if (!matchedManager) {
    const fuzzMatches = accountManagers.map((m) => ({
      manager: m,
      score: m.name ?
        Math.max(
          // Token sort ratio for partial matches
          fuzz.token_sort_ratio(extractedName.toLowerCase(), m.name.toLowerCase()),
          // Partial ratio for substring matches
          fuzz.partial_ratio(extractedName.toLowerCase(), m.name.toLowerCase())
        )
        : 0
    }));

    // Get best match if score > 70
    const bestMatch = fuzzMatches.sort((a, b) => b.score - a.score)[0];
    if (bestMatch && bestMatch.score > 70) {
      matchedManager = bestMatch.manager;
      console.log(`      Fuzzy matched "${extractedName}" to "${matchedManager.name}" (${bestMatch.score}% confidence)`);
      return { manager: matchedManager, score: bestMatch.score };
    }
  } else {
    console.log(`      Exact match: "${extractedName}" = "${matchedManager.name}"`);
    return { manager: matchedManager, score: 100 };
  }

  return null;
}

async function runDiagnostics() {
  console.log('\n' + '='.repeat(80));
  console.log('  ACCOUNT MANAGER EXTRACTION DIAGNOSTICS');
  console.log('='.repeat(80) + '\n');

  // Step 1: Check environment
  console.log('Step 1: Environment Check');
  console.log('------------------------');
  console.log(`GROQ_API_KEY: ${process.env.GROQ_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}`);
  console.log(`SERVICE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log('');

  // Step 2: Fetch account managers from database
  console.log('Step 2: Fetch Account Managers from Database');
  console.log('--------------------------------------------');
  const accountManagers = await getAccountManagers();
  console.log(`Found ${accountManagers.length} account managers:`);
  accountManagers.forEach(am => {
    console.log(`   - ${am.name} (${am.email}) [${am.role}]`);
  });
  console.log('');

  if (accountManagers.length === 0) {
    console.error('❌ CRITICAL: No account managers found in database!');
    console.error('   This explains why auto-selection is not working.');
    console.error('   The fuzzy matching logic cannot match against an empty list.\n');
    process.exit(1);
  }

  // Step 3: Test Groq extraction for each test case
  console.log('Step 3: Test Groq Extraction and Matching');
  console.log('-----------------------------------------\n');

  for (const testCase of TEST_TEXTS) {
    console.log(`\n📝 ${testCase.name}`);
    console.log('   ' + '-'.repeat(70));
    console.log(`   Input text:\n   "${testCase.text.trim().substring(0, 100)}..."\n`);

    try {
      // Extract with Groq
      console.log('   🤖 Groq extraction...');
      const extracted = await extractWithGroq(testCase.text);

      // Check if account manager was extracted
      if (extracted.account_manager) {
        const extractedName = extracted.account_manager.name;
        const confidence = extracted.account_manager.confidence;
        console.log(`   ✅ Account Manager extracted: "${extractedName}" (confidence: ${confidence})`);

        // Try fuzzy matching
        console.log('   🔍 Attempting fuzzy match...');
        const match = fuzzyMatchAccountManager(extractedName, accountManagers);

        if (match) {
          console.log(`   ✅ MATCH FOUND: "${extractedName}" → "${match.manager.name}" (${match.score}% confidence)`);
          console.log(`   ✅ Would auto-select: ${match.manager.name} (${match.manager.id})`);
        } else {
          console.log(`   ❌ NO MATCH: "${extractedName}" did not match any account manager (score < 70%)`);
          console.log(`   ⚠️ Dropdown would remain empty`);
        }
      } else {
        console.log(`   ❌ Account Manager NOT extracted by Groq`);
        console.log(`   ⚠️ This means Groq did not find account manager in the text`);
      }

      console.log('');
    } catch (error) {
      console.error(`   ❌ ERROR: ${error.message}\n`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('  DIAGNOSTICS COMPLETE');
  console.log('='.repeat(80) + '\n');

  console.log('💡 TROUBLESHOOTING TIPS:\n');
  console.log('1. If "Account Manager NOT extracted by Groq":');
  console.log('   → Groq prompt may need adjustment');
  console.log('   → Try different patterns: "AM:", "Account Manager:", "POC:"\n');

  console.log('2. If "NO MATCH" (score < 70%):');
  console.log('   → Extracted name does not match any user in database');
  console.log('   → Check if account manager exists in users table');
  console.log('   → Check if full_name matches what Groq extracted\n');

  console.log('3. If "No account managers found in database":');
  console.log('   → Query is failing or no users with role "Account Manager"');
  console.log('   → Check database: SELECT * FROM users WHERE role IN (\'Account Manager\', \'Admin\');\n');

  console.log('4. If everything works in script but not in UI:');
  console.log('   → Timing issue: accountManagers may not be loaded when extraction happens');
  console.log('   → Check browser console for errors\n');
}

// Run diagnostics
runDiagnostics().catch(error => {
  console.error('\n❌ FATAL ERROR:', error.message);
  process.exit(1);
});
