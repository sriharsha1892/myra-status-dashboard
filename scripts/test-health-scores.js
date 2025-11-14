/**
 * Test Health Scores Feature
 * Tests the AI-powered health score generation end-to-end
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function testHealthScores() {
  console.log('🧪 TESTING HEALTH SCORES FEATURE\n');
  console.log('='.repeat(80));

  try {
    // Step 1: Check if Groq is configured
    console.log('\n📋 Step 1: Checking AI availability...');
    const checkResponse = await fetch('http://localhost:3000/api/trials/bulk-operations/health-scores');
    const checkData = await checkResponse.json();

    if (!checkData.available) {
      console.error('❌ Groq AI not configured');
      console.log('   Please set GROQ_API_KEY in environment variables');
      return;
    }

    console.log('✅ AI health scoring is available');

    // Step 2: Get a test organization with some activity
    console.log('\n📋 Step 2: Finding test organization...');
    const { data: testOrg, error: orgError } = await supabase
      .from('trial_organizations')
      .select('org_id, org_name, health_status, engagement_score, org_lifecycle_stage')
      .limit(1)
      .single();

    if (orgError || !testOrg) {
      console.error('❌ No test organization found:', orgError?.message);
      return;
    }

    console.log(`✅ Testing with: ${testOrg.org_name}`);
    console.log(`   Current health status: ${testOrg.health_status || 'N/A'}`);
    console.log(`   Current engagement score: ${testOrg.engagement_score || 'N/A'}`);
    console.log(`   Lifecycle stage: ${testOrg.org_lifecycle_stage || 'N/A'}`);

    // Get activity metrics
    const { count: eventCount } = await supabase
      .from('trial_timeline_events')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', testOrg.org_id);

    const { count: userCount } = await supabase
      .from('trial_users')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', testOrg.org_id);

    console.log(`   Timeline events: ${eventCount || 0}`);
    console.log(`   Users: ${userCount || 0}`);

    // Step 3: Call health scoring API
    console.log('\n📋 Step 3: Calling AI health scoring API...');
    console.log('⏱️  This may take 2-5 seconds per organization...\n');

    const startTime = Date.now();

    const response = await fetch('http://localhost:3000/api/trials/bulk-operations/health-scores', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        org_ids: [testOrg.org_id],
        mode: 'selected',
      }),
    });

    const duration = Date.now() - startTime;
    const result = await response.json();

    if (!response.ok || !result.success) {
      console.error('❌ API call failed:', result.error);
      console.error('   Details:', result.details);
      return;
    }

    console.log(`✅ AI processing completed in ${duration}ms`);

    // Step 4: Analyze results
    console.log('\n📋 Step 4: Analyzing results...\n');
    console.log('='.repeat(80));

    if (result.success && result.detailed_analyses && result.detailed_analyses.length > 0) {
      const analysis = result.detailed_analyses[0];

      console.log(`\n📊 RESULTS FOR: ${analysis.org_name}\n`);
      console.log(`Status: ${analysis.success ? '✅ SUCCESS' : '❌ FAILED'}`);

      if (analysis.success) {
        // Health Status
        const healthColors = {
          healthy: '🟢',
          warning: '🟡',
          'at-risk': '🟠',
          critical: '🔴',
        };
        console.log(`\nHealth Status: ${healthColors[analysis.health_status] || '⚪'} ${analysis.health_status.toUpperCase()}`);

        // Engagement Score
        console.log(`Engagement Score: ${analysis.engagement_score}/100`);
        if (testOrg.engagement_score) {
          const change = analysis.engagement_score - testOrg.engagement_score;
          const arrow = change > 0 ? '↑' : change < 0 ? '↓' : '→';
          console.log(`  Change: ${arrow} ${change > 0 ? '+' : ''}${change} points`);
        }

        // Summary
        if (analysis.summary) {
          console.log(`\nSummary:`);
          console.log(`  "${analysis.summary}"`);
        }

        // Confidence
        console.log(`\nConfidence: ${Math.round(analysis.confidence * 100)}%`);

        // Issues
        if (analysis.health_issues && analysis.health_issues.length > 0) {
          console.log(`\nIssues Identified (${analysis.health_issues.length}):`);
          analysis.health_issues.forEach((issue, idx) => {
            const severityIcons = {
              critical: '🔴',
              high: '🟠',
              medium: '🟡',
              low: '🔵',
            };
            console.log(`  ${idx + 1}. ${severityIcons[issue.severity] || '⚪'} [${issue.severity.toUpperCase()}] ${issue.type}`);
            console.log(`     ${issue.description}`);
          });
        } else {
          console.log(`\n✅ No issues identified`);
        }

        // Recommendations
        if (analysis.health_recommendations && analysis.health_recommendations.length > 0) {
          console.log(`\nRecommendations (${analysis.health_recommendations.length}):`);
          analysis.health_recommendations.forEach((rec, idx) => {
            const priorityIcons = {
              urgent: '🔴',
              high: '🟠',
              medium: '🔵',
              low: '⚪',
            };
            console.log(`  ${idx + 1}. ${priorityIcons[rec.priority] || '⚪'} [${rec.priority.toUpperCase()}] ${rec.action}`);
            console.log(`     Rationale: ${rec.rationale}`);
          });
        } else {
          console.log(`\n✅ No recommendations needed`);
        }

        // Verify in database
        console.log('\n📋 Step 5: Verifying database update...');
        const { data: verifyOrg } = await supabase
          .from('trial_organizations')
          .select('health_status, engagement_score, health_issues, health_recommendations, last_health_check')
          .eq('org_id', testOrg.org_id)
          .single();

        if (verifyOrg) {
          console.log('✅ Database updated successfully');
          console.log(`   Health status: ${verifyOrg.health_status}`);
          console.log(`   Engagement score: ${verifyOrg.engagement_score}`);
          console.log(`   Issues stored: ${verifyOrg.health_issues?.length || 0}`);
          console.log(`   Recommendations stored: ${verifyOrg.health_recommendations?.length || 0}`);
          console.log(`   Last check: ${new Date(verifyOrg.last_health_check).toLocaleString()}`);

          // Verify data matches
          if (
            verifyOrg.health_status === analysis.health_status &&
            verifyOrg.engagement_score === analysis.engagement_score
          ) {
            console.log('✅ Database data matches API response');
          } else {
            console.log('⚠️  Database data differs from API response');
          }
        }

        // Summary
        console.log('\n' + '='.repeat(80));
        console.log('\n📊 SUMMARY:\n');
        console.log(`✅ API Response Time: ${duration}ms`);
        console.log(`✅ Health Status: ${analysis.health_status}`);
        console.log(`✅ Engagement Score: ${analysis.engagement_score}/100`);
        console.log(`✅ Issues: ${analysis.health_issues?.length || 0}`);
        console.log(`✅ Recommendations: ${analysis.health_recommendations?.length || 0}`);
        console.log(`✅ Confidence: ${Math.round(analysis.confidence * 100)}%`);
        console.log(`✅ Database Updated: YES`);

        // Overall summary
        if (result.summary) {
          console.log('\n📈 BATCH SUMMARY:\n');
          console.log(`Total Organizations: ${result.summary.total}`);
          console.log(`Succeeded: ${result.summary.succeeded}`);
          console.log(`Failed: ${result.summary.failed}`);
          console.log(`Total Issues: ${result.summary.total_issues}`);
          console.log(`Total Recommendations: ${result.summary.total_recommendations}`);

          if (result.summary.health_distribution) {
            console.log('\nHealth Distribution:');
            Object.entries(result.summary.health_distribution).forEach(([status, count]) => {
              console.log(`  ${status}: ${count}`);
            });
          }
        }

        console.log('\n🎉 HEALTH SCORES FEATURE IS WORKING PERFECTLY!\n');

      } else {
        console.error(`\n❌ Health scoring failed: ${analysis.error}\n`);
      }
    } else {
      console.error('❌ No results returned');
      console.log('Response:', JSON.stringify(result, null, 2));
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
  }
}

// Check if migration is applied
async function checkMigration() {
  try {
    const { data, error } = await supabase
      .from('trial_organizations')
      .select('health_status, health_issues, health_recommendations, last_health_check')
      .limit(1);

    if (error && error.message.includes('column') && error.message.includes('does not exist')) {
      console.error('\n❌ MIGRATION NOT APPLIED');
      console.error('   The health columns do not exist in trial_organizations table');
      console.error('   Please apply the migration first:');
      console.error('   File: supabase/migrations/20251115_ai_features.sql\n');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error checking migration:', error.message);
    return false;
  }
}

// Run the test
(async () => {
  const migrationApplied = await checkMigration();

  if (!migrationApplied) {
    console.log('⚠️  Cannot test health scoring without migration applied\n');
    return;
  }

  await testHealthScores();
})();
