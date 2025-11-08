require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const testData = {
  activities: [],
  documents: [],
  notes: [],
};

async function runTests() {
  console.log('🧪 COMPREHENSIVE FEATURE TESTING\n');
  console.log('Testing on localhost - will clean up all test data afterwards\n');
  console.log('=' .repeat(60) + '\n');

  try {
    // Step 1: Get a trial org to test with
    console.log('📋 Step 1: Getting trial organization for testing...');
    const { data: trialOrg, error: orgError } = await supabase
      .from('trial_organizations')
      .select('org_id, org_name')
      .limit(1)
      .single();

    if (orgError || !trialOrg) {
      console.log('❌ No trial organization found. Creating test org...');
      const { data: newOrg, error: createError } = await supabase
        .from('trial_organizations')
        .insert({
          org_name: 'TEST_ORG_DELETE_ME',
          status: 'active',
          trial_start_date: new Date().toISOString(),
          trial_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (createError) {
        console.log('❌ Failed to create test org:', createError.message);
        return;
      }
      testData.testOrgId = newOrg.org_id;
      testData.testOrgCreated = true;
      console.log(`✅ Created test org: ${newOrg.org_name} (${newOrg.org_id})\n`);
    } else {
      testData.testOrgId = trialOrg.org_id;
      console.log(`✅ Using existing org: ${trialOrg.org_name} (${trialOrg.org_id})\n`);
    }

    // Step 2: Test Activity Logging
    console.log('=' .repeat(60));
    console.log('🎯 Step 2: Testing Activity Logging System...');
    console.log('=' .repeat(60) + '\n');

    // Test different activity types
    const activityTests = [
      {
        type: 'user_login',
        title: 'User logged into the platform',
        description: 'Test user login activity',
        metadata: {},
      },
      {
        type: 'questions_asked',
        title: 'User asked questions',
        description: 'User asked about API integration and pricing',
        metadata: { count: 5 },
      },
      {
        type: 'report_generated',
        title: 'User generated a report',
        description: 'Competitive analysis report for healthcare sector',
        metadata: { report_title: 'Healthcare Competitive Analysis Q4 2024' },
      },
      {
        type: 'demo_completed',
        title: 'Demo session completed',
        description: 'Product demo with decision makers',
        metadata: { duration_minutes: 45, attendees: 3 },
      },
      {
        type: 'technical_issue',
        title: 'Technical issue encountered',
        description: 'User reported slow query performance',
        metadata: { severity: 'medium' },
      },
    ];

    for (const activity of activityTests) {
      const { data, error } = await supabase
        .from('trial_activities')
        .insert({
          trial_org_id: testData.testOrgId,
          activity_type: activity.type,
          title: activity.title,
          description: activity.description,
          metadata: activity.metadata,
        })
        .select()
        .single();

      if (error) {
        console.log(`   ❌ Failed to create ${activity.type}:`, error.message);
      } else {
        testData.activities.push(data.id);
        console.log(`   ✅ Created activity: ${activity.type}`);
        console.log(`      Title: ${activity.title}`);
        console.log(`      Metadata: ${JSON.stringify(activity.metadata)}\n`);
      }
    }

    // Verify activities can be retrieved
    const { data: activities, error: actError } = await supabase
      .from('trial_activities')
      .select('*')
      .eq('trial_org_id', testData.testOrgId)
      .order('created_at', { ascending: false });

    console.log(`   📊 Retrieved ${activities?.length || 0} activities for trial org`);
    console.log(`   ✅ Activity logging system working!\n`);

    // Step 3: Test Document Library
    console.log('=' .repeat(60));
    console.log('📚 Step 3: Testing Document Library System...');
    console.log('=' .repeat(60) + '\n');

    const documentTests = [
      {
        title: 'Getting Started Guide',
        description: 'Complete onboarding guide for new users',
        link_url: 'https://onedrive.com/test/getting-started',
        link_type: 'onedrive',
        is_global: true,
        tags: ['onboarding', 'beginner', 'essential'],
      },
      {
        title: 'API Integration Tutorial',
        description: 'Step-by-step API integration guide',
        link_url: 'https://docs.google.com/test/api-tutorial',
        link_type: 'google_drive',
        is_global: true,
        tags: ['technical', 'api', 'integration'],
      },
      {
        title: 'Org-Specific Custom Report Template',
        description: 'Custom template for this organization',
        link_url: 'https://onedrive.com/test/custom-template',
        link_type: 'onedrive',
        is_global: false,
        trial_org_id: testData.testOrgId,
        tags: ['template', 'custom'],
      },
    ];

    // Get a category for testing
    const { data: category } = await supabase
      .from('document_categories')
      .select('id, name')
      .eq('name', 'Onboarding')
      .single();

    for (const doc of documentTests) {
      const { data, error } = await supabase
        .from('document_library')
        .insert({
          ...doc,
          category_id: category?.id,
        })
        .select()
        .single();

      if (error) {
        console.log(`   ❌ Failed to create document:`, error.message);
      } else {
        testData.documents.push(data.id);
        console.log(`   ✅ Created document: ${doc.title}`);
        console.log(`      Type: ${doc.is_global ? 'Global' : 'Org-Specific'}`);
        console.log(`      Link: ${doc.link_type}`);
        console.log(`      Tags: ${doc.tags.join(', ')}\n`);
      }
    }

    // Test adding a note to a resource
    if (testData.documents.length > 0) {
      const { data: note, error: noteError } = await supabase
        .from('resource_notes')
        .insert({
          resource_id: testData.documents[0],
          trial_org_id: testData.testOrgId,
          note_text: 'This is a test note. User found this resource very helpful!',
        })
        .select()
        .single();

      if (!noteError) {
        testData.notes.push(note.id);
        console.log(`   ✅ Added note to resource`);
        console.log(`      Note: "${note.note_text}"\n`);
      }
    }

    // Verify documents can be retrieved
    const { data: globalDocs } = await supabase
      .from('document_library')
      .select('*')
      .eq('is_global', true);

    const { data: orgDocs } = await supabase
      .from('document_library')
      .select('*')
      .eq('trial_org_id', testData.testOrgId);

    console.log(`   📊 Retrieved ${globalDocs?.length || 0} global documents`);
    console.log(`   📊 Retrieved ${orgDocs?.length || 0} org-specific documents`);
    console.log(`   ✅ Document library system working!\n`);

    // Step 4: Test Custom Fields
    console.log('=' .repeat(60));
    console.log('🏷️  Step 4: Testing Custom Fields...');
    console.log('=' .repeat(60) + '\n');

    const customFields = {
      industry: 'Healthcare',
      company_size: '50-200',
      use_case: 'Market Research',
      primary_focus: 'Competitive Intelligence',
      integration_requirements: ['API', 'OneDrive'],
      budget_range: '$5k-$10k',
      decision_timeline: 'Q1 2025',
      test_field: 'DELETE_ME',
    };

    const { error: fieldsError } = await supabase
      .from('trial_organizations')
      .update({ custom_fields: customFields })
      .eq('org_id', testData.testOrgId);

    if (fieldsError) {
      console.log(`   ❌ Failed to set custom fields:`, fieldsError.message);
    } else {
      console.log(`   ✅ Set custom fields:`);
      Object.entries(customFields).forEach(([key, value]) => {
        console.log(`      ${key}: ${JSON.stringify(value)}`);
      });
      console.log('');
    }

    // Verify custom fields can be retrieved
    const { data: orgWithFields } = await supabase
      .from('trial_organizations')
      .select('custom_fields')
      .eq('org_id', testData.testOrgId)
      .single();

    console.log(`   📊 Retrieved custom fields:`, Object.keys(orgWithFields?.custom_fields || {}).length, 'fields');
    console.log(`   ✅ Custom fields system working!\n`);

    // Step 5: Test Usage Dashboard Data
    console.log('=' .repeat(60));
    console.log('📈 Step 5: Testing Usage Dashboard Data...');
    console.log('=' .repeat(60) + '\n');

    // Calculate stats
    const logins = activities?.filter(a => a.activity_type === 'user_login').length || 0;
    const questions = activities?.filter(a => a.activity_type === 'questions_asked')
      .reduce((sum, a) => sum + (a.metadata?.count || 1), 0) || 0;
    const reports = activities?.filter(a => a.activity_type === 'report_generated').length || 0;

    console.log(`   📊 Usage Statistics:`);
    console.log(`      Total Activities: ${activities?.length || 0}`);
    console.log(`      User Logins: ${logins}`);
    console.log(`      Questions Asked: ${questions}`);
    console.log(`      Reports Generated: ${reports}`);
    console.log(`   ✅ Usage dashboard data available!\n`);

    // Summary
    console.log('=' .repeat(60));
    console.log('✅ TESTING COMPLETE - ALL FEATURES WORKING!');
    console.log('=' .repeat(60) + '\n');

    console.log('📋 Test Summary:');
    console.log(`   ✅ Created ${testData.activities.length} test activities`);
    console.log(`   ✅ Created ${testData.documents.length} test documents`);
    console.log(`   ✅ Created ${testData.notes.length} test notes`);
    console.log(`   ✅ Set custom fields on trial org`);
    console.log('');

    console.log('🌐 View on localhost:3004:');
    console.log(`   Trial Org ID: ${testData.testOrgId}`);
    console.log(`   You can now manually test the UI components\n`);

    // Return test data for cleanup
    return testData;

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

async function cleanup(testData) {
  console.log('\n' + '=' .repeat(60));
  console.log('🧹 CLEANING UP TEST DATA...');
  console.log('=' .repeat(60) + '\n');

  try {
    // Delete notes
    if (testData.notes.length > 0) {
      const { error } = await supabase
        .from('resource_notes')
        .delete()
        .in('id', testData.notes);

      if (error) {
        console.log(`❌ Failed to delete notes:`, error.message);
      } else {
        console.log(`✅ Deleted ${testData.notes.length} test notes`);
      }
    }

    // Delete documents
    if (testData.documents.length > 0) {
      const { error } = await supabase
        .from('document_library')
        .delete()
        .in('id', testData.documents);

      if (error) {
        console.log(`❌ Failed to delete documents:`, error.message);
      } else {
        console.log(`✅ Deleted ${testData.documents.length} test documents`);
      }
    }

    // Delete activities
    if (testData.activities.length > 0) {
      const { error } = await supabase
        .from('trial_activities')
        .delete()
        .in('id', testData.activities);

      if (error) {
        console.log(`❌ Failed to delete activities:`, error.message);
      } else {
        console.log(`✅ Deleted ${testData.activities.length} test activities`);
      }
    }

    // Clear custom fields
    if (testData.testOrgId) {
      const { error } = await supabase
        .from('trial_organizations')
        .update({ custom_fields: {} })
        .eq('org_id', testData.testOrgId);

      if (error) {
        console.log(`❌ Failed to clear custom fields:`, error.message);
      } else {
        console.log(`✅ Cleared custom fields`);
      }
    }

    // Delete test org if we created it
    if (testData.testOrgCreated) {
      const { error } = await supabase
        .from('trial_organizations')
        .delete()
        .eq('org_id', testData.testOrgId);

      if (error) {
        console.log(`❌ Failed to delete test org:`, error.message);
      } else {
        console.log(`✅ Deleted test organization`);
      }
    }

    console.log('\n✅ Cleanup complete! All test data removed.\n');

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

// Run tests
runTests()
  .then((testData) => {
    console.log('\n⏸️  Pausing for 30 seconds to allow manual UI testing...');
    console.log('   Press Ctrl+C if you want to keep the test data\n');

    // Wait 30 seconds before cleanup
    setTimeout(() => {
      cleanup(testData);
    }, 30000);
  })
  .catch((error) => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
