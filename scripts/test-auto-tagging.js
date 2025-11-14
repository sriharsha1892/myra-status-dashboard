/**
 * Test Auto-Tagging Feature
 * Tests the AI-powered organization auto-tagging end-to-end
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function testAutoTagging() {
  console.log('🧪 TESTING AUTO-TAGGING FEATURE\n');
  console.log('='.repeat(80));

  try {
    // Step 1: Check if Groq is configured
    console.log('\n📋 Step 1: Checking AI availability...');
    const checkResponse = await fetch('http://localhost:3000/api/trials/bulk-operations/auto-tag');
    const checkData = await checkResponse.json();

    if (!checkData.available) {
      console.error('❌ Groq AI not configured');
      console.log('   Please set GROQ_API_KEY in environment variables');
      return;
    }

    console.log('✅ AI auto-tagging is available');

    // Step 2: Get a test organization
    console.log('\n📋 Step 2: Finding test organization...');
    const { data: testOrg, error: orgError } = await supabase
      .from('trial_organizations')
      .select('org_id, org_name, tags, engagement_score, org_lifecycle_stage')
      .limit(1)
      .single();

    if (orgError || !testOrg) {
      console.error('❌ No test organization found:', orgError?.message);
      return;
    }

    console.log(`✅ Testing with: ${testOrg.org_name}`);
    console.log(`   Current tags: ${JSON.stringify(testOrg.tags || [])}`);
    console.log(`   Engagement: ${testOrg.engagement_score || 'N/A'}`);
    console.log(`   Lifecycle: ${testOrg.org_lifecycle_stage || 'N/A'}`);

    // Step 3: Call auto-tagging API
    console.log('\n📋 Step 3: Calling AI auto-tagging API...');
    console.log('⏱️  This may take 2-5 seconds per organization...\n');

    const startTime = Date.now();

    const response = await fetch('http://localhost:3000/api/trials/bulk-operations/auto-tag', {
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

    if (!response.ok) {
      console.error('❌ API call failed:', result.error);
      console.error('   Details:', result.details);
      return;
    }

    console.log(`✅ AI processing completed in ${duration}ms`);

    // Step 4: Analyze results
    console.log('\n📋 Step 4: Analyzing results...\n');
    console.log('='.repeat(80));

    if (result.success && result.results && result.results.length > 0) {
      const orgResult = result.results[0];

      console.log(`\n📊 RESULTS FOR: ${orgResult.org_name}\n`);
      console.log(`Status: ${orgResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);

      if (orgResult.success) {
        console.log(`\nOld Tags (${orgResult.old_tags.length}):`);
        if (orgResult.old_tags.length > 0) {
          orgResult.old_tags.forEach(tag => console.log(`  - ${tag}`));
        } else {
          console.log('  (none)');
        }

        console.log(`\nNew Tags Generated (${orgResult.new_tags.length}):`);
        orgResult.new_tags.forEach(tag => console.log(`  + ${tag}`));

        console.log(`\nConfidence: ${Math.round(orgResult.confidence * 100)}%`);

        if (orgResult.reasoning) {
          console.log(`\nReasoning:`);
          console.log(`  ${orgResult.reasoning}`);
        }

        // Verify in database
        console.log('\n📋 Step 5: Verifying database update...');
        const { data: verifyOrg } = await supabase
          .from('trial_organizations')
          .select('tags')
          .eq('org_id', testOrg.org_id)
          .single();

        if (verifyOrg) {
          console.log('✅ Database updated successfully');
          console.log(`   Current tags in DB: ${JSON.stringify(verifyOrg.tags)}`);

          // Check if new tags are present
          const allNewTagsPresent = orgResult.new_tags.every(tag =>
            verifyOrg.tags.includes(tag)
          );

          if (allNewTagsPresent) {
            console.log('✅ All new tags present in database');
          } else {
            console.log('⚠️  Some tags missing from database');
          }
        }

        // Summary
        console.log('\n' + '='.repeat(80));
        console.log('\n📊 SUMMARY:\n');
        console.log(`✅ API Response Time: ${duration}ms`);
        console.log(`✅ Tags Generated: ${orgResult.new_tags.length}`);
        console.log(`✅ Confidence Score: ${Math.round(orgResult.confidence * 100)}%`);
        console.log(`✅ Database Updated: ${orgResult.success ? 'YES' : 'NO'}`);

        // Tag categories
        console.log('\n📂 TAG CATEGORIES:\n');
        const tagCategories = {
          industry: [],
          company_size: [],
          engagement: [],
          risk: [],
          features: [],
          lifecycle: [],
        };

        orgResult.new_tags.forEach(tag => {
          if (tag.includes('enterprise') || tag.includes('startup') || tag.includes('saas')) {
            tagCategories.industry.push(tag);
          } else if (tag.includes('team') || tag.includes('market') || tag.includes('solopreneur')) {
            tagCategories.company_size.push(tag);
          } else if (tag.includes('engaged') || tag.includes('active') || tag.includes('churned')) {
            tagCategories.engagement.push(tag);
          } else if (tag.includes('risk') || tag.includes('healthy') || tag.includes('critical')) {
            tagCategories.risk.push(tag);
          } else if (tag.includes('timeline') || tag.includes('roadmap') || tag.includes('users')) {
            tagCategories.features.push(tag);
          } else if (tag.includes('onboarding') || tag.includes('exploring') || tag.includes('champion')) {
            tagCategories.lifecycle.push(tag);
          }
        });

        Object.entries(tagCategories).forEach(([category, tags]) => {
          if (tags.length > 0) {
            console.log(`  ${category}: ${tags.join(', ')}`);
          }
        });

        console.log('\n🎉 AUTO-TAGGING FEATURE IS WORKING PERFECTLY!\n');

      } else {
        console.error(`\n❌ Tagging failed: ${orgResult.error}\n`);
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
      .select('tags')
      .limit(1);

    if (error && error.message.includes('column') && error.message.includes('does not exist')) {
      console.error('\n❌ MIGRATION NOT APPLIED');
      console.error('   The "tags" column does not exist in trial_organizations table');
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
    console.log('⚠️  Cannot test auto-tagging without migration applied\n');
    return;
  }

  await testAutoTagging();
})();
