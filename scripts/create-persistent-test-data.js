require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const testData = {
  trialOrgId: null,
  createdIds: {
    activities: [],
    documents: [],
    notes: [],
  }
};

async function createPersistentTestData() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║                                                           ║');
  console.log('║     📦 CREATING PERSISTENT TEST DATA                      ║');
  console.log('║                                                           ║');
  console.log('║     Data will remain until you run cleanup script        ║');
  console.log('║                                                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  try {
    // Use existing trial org
    console.log('📋 Finding existing trial organization...');
    const { data: org, error: orgError } = await supabase
      .from('trial_organizations')
      .select('org_id, org_name')
      .limit(1)
      .single();

    if (orgError || !org) {
      console.log('❌ No trial organization found');
      return;
    }

    testData.trialOrgId = org.org_id;
    console.log(`✅ Using trial org: ${org.org_name}`);
    console.log(`   ID: ${org.org_id}\n`);

    // Create activities
    console.log('📝 Creating test activities...');
    const activities = [
      {
        activity_type: 'user_login',
        title: 'User logged into the platform',
        description: '[TEST] User login activity for testing',
        metadata: { test: true },
      },
      {
        activity_type: 'questions_asked',
        title: 'User asked questions',
        description: '[TEST] Questions about features and pricing',
        metadata: { test: true, count: 5 },
      },
      {
        activity_type: 'report_generated',
        title: 'User generated a report',
        description: '[TEST] Competitive analysis report',
        metadata: { test: true, report_title: 'Test Report Q4 2024' },
      },
    ];

    for (const activity of activities) {
      const { data, error } = await supabase
        .from('trial_activities')
        .insert({ trial_org_id: testData.trialOrgId, ...activity })
        .select()
        .single();

      if (!error) {
        testData.createdIds.activities.push(data.id);
        console.log(`   ✅ ${activity.activity_type}`);
      }
    }

    // Create documents
    console.log('\n📚 Creating test documents...');
    const { data: category } = await supabase
      .from('document_categories')
      .select('id')
      .eq('name', 'Onboarding')
      .single();

    const documents = [
      {
        title: '[TEST] Quick Start Guide',
        description: 'Test document - can be deleted',
        link_url: 'https://test.com/quickstart',
        link_type: 'onedrive',
        is_global: true,
        category_id: category?.id,
        tags: ['TEST', 'onboarding'],
      },
      {
        title: '[TEST] Org-Specific Document',
        description: 'Org-specific test document',
        link_url: 'https://test.com/org-doc',
        link_type: 'onedrive',
        is_global: false,
        trial_org_id: testData.trialOrgId,
        category_id: category?.id,
        tags: ['TEST', 'custom'],
      },
    ];

    for (const doc of documents) {
      const { data, error } = await supabase
        .from('document_library')
        .insert(doc)
        .select()
        .single();

      if (!error) {
        testData.createdIds.documents.push(data.id);
        console.log(`   ✅ ${doc.title}`);
      }
    }

    // Update custom fields
    console.log('\n🏷️  Setting test custom fields...');
    await supabase
      .from('trial_organizations')
      .update({
        custom_fields: {
          test_field_1: 'Test Value 1',
          test_field_2: 'Test Value 2',
          test_industry: 'Technology',
          test_marker: 'TESTING_DELETE_WHEN_DONE',
        }
      })
      .eq('org_id', testData.trialOrgId);
    console.log('   ✅ Custom fields set');

    // Generate report
    console.log('\n' + '='.repeat(60));
    console.log('✅ TEST DATA CREATED SUCCESSFULLY');
    console.log('='.repeat(60));
    console.log(`\nTrial Org ID: ${testData.trialOrgId}`);
    console.log(`Trial Org Name: ${org.org_name}`);
    console.log(`\nCreated:`);
    console.log(`  - ${testData.createdIds.activities.length} activities`);
    console.log(`  - ${testData.createdIds.documents.length} documents`);
    console.log(`  - 4 custom fields`);

    console.log('\n📍 Test URLs:');
    console.log(`  - Test Page: http://localhost:3004/test-features`);
    console.log(`  - Trial Org ID: ${testData.trialOrgId}`);

    console.log('\n🧹 To cleanup test data, run:');
    console.log(`  node scripts/cleanup-test-data.js ${testData.trialOrgId}`);

    // Save cleanup info
    const fs = require('fs');
    fs.writeFileSync(
      '/Users/sriharsha/myra-status-dashboard/TEST_DATA_INFO.json',
      JSON.stringify(testData, null, 2)
    );
    console.log('\n💾 Test data info saved to: TEST_DATA_INFO.json\n');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createPersistentTestData();
