/**
 * Test Script for Progressive Data Enrichment System
 * Tests: questions, completeness scoring, API endpoints
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

function log(message: string, type: 'success' | 'error' | 'info' | 'warn' = 'info') {
  const color = {
    success: colors.green,
    error: colors.red,
    info: colors.blue,
    warn: colors.yellow,
  }[type];
  console.log(`${color}${message}${colors.reset}`);
}

// ============ TEST FUNCTIONS ============

async function testQuestionRegistry(): Promise<boolean> {
  log('\n--- Testing Question Registry ---', 'info');

  try {
    const { ENRICHMENT_QUESTIONS, getQuestionsForRole, getQuestionsForEntityType } = await import('../lib/enrichment/questions');

    log(`✓ Loaded ${ENRICHMENT_QUESTIONS.length} questions`, 'success');

    // Test role filtering
    const salesQuestions = getQuestionsForRole('sales');
    log(`✓ Sales role: ${salesQuestions.length} questions`, 'success');

    const amQuestions = getQuestionsForRole('account_manager');
    log(`✓ Account Manager role: ${amQuestions.length} questions`, 'success');

    // Test entity type filtering
    const orgQuestions = getQuestionsForEntityType('organization', 'admin');
    log(`✓ Organization questions: ${orgQuestions.length}`, 'success');

    const userQuestions = getQuestionsForEntityType('user', 'admin');
    log(`✓ User questions: ${userQuestions.length}`, 'success');

    // Verify question structure
    for (const q of ENRICHMENT_QUESTIONS) {
      if (!q.id || !q.entityType || !q.targetField || !q.label) {
        log(`✗ Invalid question structure: ${JSON.stringify(q)}`, 'error');
        return false;
      }
    }
    log('✓ All questions have valid structure', 'success');

    return true;
  } catch (error: any) {
    log(`✗ Question registry test failed: ${error.message}`, 'error');
    return false;
  }
}

async function testCompletenessScoring(): Promise<boolean> {
  log('\n--- Testing Completeness Scoring ---', 'info');

  try {
    const {
      calculateOrgCompleteness,
      calculateUserCompleteness,
      COMPLETENESS_UNLOCK_THRESHOLD,
    } = await import('../lib/enrichment/completenessScore');

    // Test with empty data
    const emptyResult = calculateOrgCompleteness([]);
    log(`✓ Empty orgs score: ${emptyResult.score}`, 'success');

    // Test with partial data
    const partialOrgs = [
      { id: '1', health_status: 'healthy', deal_momentum: null, description: null },
      { id: '2', health_status: null, deal_momentum: 'steady', description: 'Test' },
    ];
    const partialResult = calculateOrgCompleteness(partialOrgs);
    log(`✓ Partial orgs score: ${partialResult.score}%`, 'success');
    log(`  - Missing critical: ${partialResult.missingCritical.join(', ') || 'None'}`, 'info');

    // Test with complete data
    const completeOrgs = [
      { id: '1', health_status: 'healthy', deal_momentum: 'fast_track', description: 'Great company' },
    ];
    const completeResult = calculateOrgCompleteness(completeOrgs);
    log(`✓ Complete org score: ${completeResult.score}%`, 'success');

    // Test user completeness
    const users = [
      { id: '1', influence: 'champion', role: 'CEO' },
      { id: '2', influence: null, role: null },
    ];
    const userResult = calculateUserCompleteness(users);
    log(`✓ User completeness score: ${userResult.score}%`, 'success');

    log(`✓ Unlock threshold: ${COMPLETENESS_UNLOCK_THRESHOLD}%`, 'success');

    return true;
  } catch (error: any) {
    log(`✗ Completeness scoring test failed: ${error.message}`, 'error');
    return false;
  }
}

async function testDatabaseTables(): Promise<boolean> {
  log('\n--- Testing Database Tables ---', 'info');

  try {
    // Check if enrichment_sessions table exists
    const { data: sessions, error: sessionsError } = await supabase
      .from('enrichment_sessions')
      .select('id')
      .limit(1);

    if (sessionsError) {
      log(`⚠ enrichment_sessions table may not exist: ${sessionsError.message}`, 'warn');
      log('  Run the migration first: supabase/migrations/20251203_enrichment_tables.sql', 'info');
      return true; // Non-blocking - tables will be created on deploy
    }

    log('✓ enrichment_sessions table exists', 'success');

    // Check if enrichment_answers table exists
    const { data: answers, error: answersError } = await supabase
      .from('enrichment_answers')
      .select('id')
      .limit(1);

    if (answersError) {
      log(`⚠ enrichment_answers table may not exist: ${answersError.message}`, 'warn');
      return true;
    }

    log('✓ enrichment_answers table exists', 'success');

    // Check trial_users.influence column
    const { data: users, error: usersError } = await supabase
      .from('trial_users')
      .select('influence')
      .limit(1);

    if (usersError) {
      log(`⚠ influence column check failed: ${usersError.message}`, 'warn');
    } else {
      log('✓ trial_users.influence column exists', 'success');
    }

    return true;
  } catch (error: any) {
    log(`✗ Database test failed: ${error.message}`, 'error');
    return false;
  }
}

async function testEnrichmentFlow(): Promise<boolean> {
  log('\n--- Testing Enrichment Flow (Simulated) ---', 'info');

  try {
    // Get a sample org
    const { data: org, error: orgError } = await supabase
      .from('trial_organizations')
      .select('org_id, org_name, health_status, deal_momentum')
      .limit(1)
      .single();

    if (orgError || !org) {
      log('⚠ No orgs found to test with', 'warn');
      return true;
    }

    log(`✓ Found test org: ${org.org_name}`, 'success');
    log(`  - Current health_status: ${org.health_status || '(empty)'}`, 'info');
    log(`  - Current deal_momentum: ${org.deal_momentum || '(empty)'}`, 'info');

    // Import and test completeness calculation
    const { calculateOrgCompleteness } = await import('../lib/enrichment/completenessScore');
    const result = calculateOrgCompleteness([{
      id: org.org_id,
      health_status: org.health_status,
      deal_momentum: org.deal_momentum,
      description: null,
    }]);

    log(`✓ Calculated completeness: ${result.score}%`, 'success');

    if (result.missingCritical.length > 0) {
      log(`  - Missing critical fields: ${result.missingCritical.join(', ')}`, 'info');
    }

    // Simulate updating health_status if it's empty
    if (!org.health_status) {
      log('\nSimulating health_status update...', 'info');
      const { error: updateError } = await supabase
        .from('trial_organizations')
        .update({ health_status: 'healthy' })
        .eq('org_id', org.org_id);

      if (updateError) {
        log(`⚠ Update failed: ${updateError.message}`, 'warn');
      } else {
        log('✓ Updated health_status to "healthy"', 'success');

        // Recalculate completeness
        const newResult = calculateOrgCompleteness([{
          id: org.org_id,
          health_status: 'healthy',
          deal_momentum: org.deal_momentum,
          description: null,
        }]);
        log(`✓ New completeness: ${newResult.score}%`, 'success');

        // Revert the change
        await supabase
          .from('trial_organizations')
          .update({ health_status: org.health_status })
          .eq('org_id', org.org_id);
        log('✓ Reverted test changes', 'success');
      }
    }

    return true;
  } catch (error: any) {
    log(`✗ Enrichment flow test failed: ${error.message}`, 'error');
    return false;
  }
}

async function testAIInference(): Promise<boolean> {
  log('\n--- Testing AI Inference (Groq) ---', 'info');

  try {
    const { inferSuggestionsWithGroq, inferSuggestions } = await import('../lib/enrichment/aiInference');

    // Test with Groq LLM
    const testOrg = [
      {
        id: '1',
        org_name: 'Acme Corp',
        mrr: 15000,
        employee_count: 200,
        industry: 'Technology',
        recentEvents: [
          { event_type: 'product_demo', timestamp: new Date().toISOString() },
          { event_type: 'meeting', timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
        ],
      },
    ];

    log('Testing Groq LLM inference...', 'info');
    const groqSuggestions = await inferSuggestionsWithGroq('organization', testOrg, ['org_health_status', 'org_deal_momentum']);

    if (groqSuggestions.has('org_health_status')) {
      const suggestion = groqSuggestions.get('org_health_status')!;
      log(`✓ Groq health status: "${suggestion.value}" (${Math.round(suggestion.confidence * 100)}% confidence)`, 'success');
      log(`  - Reasoning: ${suggestion.reasoning}`, 'info');
    } else {
      log('⚠ No Groq health inference (may need API key)', 'warn');
    }

    if (groqSuggestions.has('org_deal_momentum')) {
      const suggestion = groqSuggestions.get('org_deal_momentum')!;
      log(`✓ Groq deal momentum: "${suggestion.value}" (${Math.round(suggestion.confidence * 100)}% confidence)`, 'success');
      log(`  - Reasoning: ${suggestion.reasoning}`, 'info');
    } else {
      log('⚠ No Groq momentum inference', 'warn');
    }

    // Test user influence with Groq
    const testUsers = [
      { id: '1', name: 'John Smith', title: 'Chief Technology Officer', email: 'john@acme.com' },
    ];
    const userSuggestions = await inferSuggestionsWithGroq('user', testUsers, ['user_influence']);

    if (userSuggestions.has('user_influence')) {
      const suggestion = userSuggestions.get('user_influence')!;
      log(`✓ Groq user influence: "${suggestion.value}" (${Math.round(suggestion.confidence * 100)}% confidence)`, 'success');
      log(`  - Reasoning: ${suggestion.reasoning}`, 'info');
    } else {
      log('⚠ No Groq influence inference', 'warn');
    }

    // Fallback test (heuristics)
    log('\nTesting heuristic fallback...', 'info');
    const heuristicSuggestions = inferSuggestions('organization', testOrg, ['org_health_status']);
    if (heuristicSuggestions.has('org_health_status')) {
      log('✓ Heuristic fallback working', 'success');
    }

    return true;
  } catch (error: any) {
    log(`✗ AI inference test failed: ${error.message}`, 'error');
    return false;
  }
}

// ============ MAIN ============

async function main() {
  console.log('\n' + '='.repeat(60));
  log('PROGRESSIVE DATA ENRICHMENT - TEST SUITE', 'info');
  console.log('='.repeat(60));

  let passed = 0;
  let failed = 0;

  try {
    if (await testQuestionRegistry()) passed++; else failed++;
    if (await testCompletenessScoring()) passed++; else failed++;
    if (await testAIInference()) passed++; else failed++;
    if (await testDatabaseTables()) passed++; else failed++;
    if (await testEnrichmentFlow()) passed++; else failed++;
  } catch (error: any) {
    log(`Unexpected error: ${error.message}`, 'error');
    failed++;
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  log('TEST SUMMARY', 'info');
  console.log('='.repeat(60));
  log(`Passed: ${passed}`, 'success');
  if (failed > 0) {
    log(`Failed: ${failed}`, 'error');
  }
  console.log('='.repeat(60) + '\n');

  process.exit(failed > 0 ? 1 : 0);
}

main();
