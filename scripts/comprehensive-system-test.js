require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Store all created IDs for cleanup
const testData = {
  trialOrg: null,
  users: [],
  activities: [],
  documents: [],
  notes: [],
  tickets: [],
  roadmapItems: [],
};

async function createTestTrialOrg() {
  console.log('\n📋 STEP 1: Creating Test Trial Organization...');
  console.log('='.repeat(60));

  const trialStartDate = new Date();
  const trialEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

  const { data, error } = await supabase
    .from('trial_organizations')
    .insert({
      org_name: 'TEST_ORG_Acme_Corp_DELETE_ME',
      org_lifecycle_stage: 'trial_active',
      trial_status: 'active',
      trial_start_date: trialStartDate.toISOString(),
      trial_end_date: trialEndDate.toISOString(),
      trial_request_date: new Date().toISOString(),
      account_manager: 'Test Admin',
      engagement_score: 85,
      custom_fields: {
        industry: 'Technology',
        company_size: '100-500',
        use_case: 'Competitive Intelligence',
        primary_focus: 'Market Research',
        budget_range: '$10k-$25k',
        decision_timeline: 'Q1 2025',
        sales_stage: 'Evaluation',
        primary_contact: 'John Smith',
        test_marker: 'DELETE_ME',
      },
    })
    .select()
    .single();

  if (error) {
    console.log('❌ Error creating trial org:', error.message);
    throw error;
  }

  testData.trialOrg = data;
  console.log(`✅ Created trial org: ${data.org_name}`);
  console.log(`   ID: ${data.org_id}`);
  console.log(`   Lifecycle Stage: ${data.org_lifecycle_stage}`);
  console.log(`   Trial Status: ${data.trial_status}`);
  console.log(`   Trial Period: ${new Date(data.trial_start_date).toLocaleDateString()} - ${new Date(data.trial_end_date).toLocaleDateString()}`);
  console.log(`   Engagement Score: ${data.engagement_score}`);
  console.log(`   Custom Fields: ${Object.keys(data.custom_fields).length} fields`);

  return data;
}

async function createTestActivities(trialOrgId) {
  console.log('\n📝 STEP 2: Creating Test Activities...');
  console.log('='.repeat(60));

  const activities = [
    {
      activity_type: 'user_login',
      title: 'User logged into the platform',
      description: 'John Smith logged in from Chrome browser',
      metadata: { browser: 'Chrome', ip: '192.168.1.1' },
    },
    {
      activity_type: 'questions_asked',
      title: 'User asked questions',
      description: 'Asked about API integration, data export, and pricing tiers',
      metadata: { count: 3, topics: ['API', 'Export', 'Pricing'] },
    },
    {
      activity_type: 'report_generated',
      title: 'User generated a report',
      description: 'Generated competitive analysis report for tech sector',
      metadata: { report_title: 'Tech Sector Competitive Analysis Q4 2024', pages: 45 },
    },
    {
      activity_type: 'demo_completed',
      title: 'Demo session completed',
      description: 'Full platform demo with decision makers',
      metadata: { duration_minutes: 60, attendees: 4, satisfaction: 'high' },
    },
    {
      activity_type: 'expert_review_requested',
      title: 'User requested expert review',
      description: 'Requested expert review of market sizing analysis',
      metadata: { area: 'Market Sizing', urgency: 'medium' },
    },
    {
      activity_type: 'technical_issue',
      title: 'Technical issue encountered',
      description: 'Slow query performance on large datasets',
      metadata: { severity: 'medium', resolved: false },
    },
    {
      activity_type: 'call_completed',
      title: 'Call/meeting completed',
      description: 'Follow-up call to discuss enterprise features',
      metadata: { duration_minutes: 30, next_steps: 'Send proposal' },
    },
  ];

  for (const activity of activities) {
    const { data, error } = await supabase
      .from('trial_activities')
      .insert({
        trial_org_id: trialOrgId,
        ...activity,
      })
      .select()
      .single();

    if (error) {
      console.log(`❌ Error creating activity:`, error.message);
    } else {
      testData.activities.push(data.id);
      console.log(`✅ Created activity: ${activity.activity_type}`);
      console.log(`   ${activity.description}`);
    }
  }

  console.log(`\n📊 Total activities created: ${testData.activities.length}`);
}

async function createTestTicket(trialOrgId) {
  console.log('\n🎫 STEP 3: Creating Test Support Ticket...');
  console.log('='.repeat(60));

  const { data, error } = await supabase
    .from('support_tickets')
    .insert({
      trial_org_id: trialOrgId,
      subject: 'TEST: Slow query performance on large datasets',
      description: 'When running queries on datasets with >100k rows, the system becomes very slow. Response times exceed 30 seconds. This is blocking our evaluation of the product for enterprise use.',
      status: 'open',
      priority: 'high',
      category: 'technical',
      tags: ['performance', 'query', 'enterprise', 'TEST_DELETE_ME'],
    })
    .select()
    .single();

  if (error) {
    console.log('❌ Error creating ticket:', error.message);
  } else {
    testData.tickets.push(data.id);
    console.log(`✅ Created support ticket: ${data.subject}`);
    console.log(`   ID: ${data.id}`);
    console.log(`   Priority: ${data.priority}`);
    console.log(`   Status: ${data.status}`);
    console.log(`   Category: ${data.category}`);
  }
}

async function createTestRoadmapItem() {
  console.log('\n🗺️  STEP 4: Creating Test Roadmap Entry...');
  console.log('='.repeat(60));

  const { data, error } = await supabase
    .from('org_product_roadmap')
    .insert({
      title: 'TEST: Advanced Query Optimization Engine',
      description: 'Implement advanced query optimization to improve performance on large datasets. This includes query caching, indexing improvements, and parallel processing capabilities.',
      status: 'planned',
      priority: 'high',
      assigned_to: 'Engineering Team',
      version_planned: 'v2.5.0',
      target_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days from now
      strategic_goal: 'Performance & Scalability',
      product_area: 'Query Engine',
      tags: ['performance', 'optimization', 'enterprise', 'TEST_DELETE_ME'],
    })
    .select()
    .single();

  if (error) {
    console.log('❌ Error creating roadmap item:', error.message);
  } else {
    testData.roadmapItems.push(data.id);
    console.log(`✅ Created roadmap item: ${data.title}`);
    console.log(`   ID: ${data.id}`);
    console.log(`   Status: ${data.status}`);
    console.log(`   Priority: ${data.priority}`);
    console.log(`   Version: ${data.version_planned}`);
    console.log(`   Target Date: ${new Date(data.target_date).toLocaleDateString()}`);
  }
}

async function createTestDocuments(trialOrgId) {
  console.log('\n📚 STEP 5: Creating Test Documents...');
  console.log('='.repeat(60));

  // Get Onboarding category
  const { data: category } = await supabase
    .from('document_categories')
    .select('id')
    .eq('name', 'Onboarding')
    .single();

  const documents = [
    {
      title: 'TEST: Quick Start Guide - DELETE ME',
      description: 'Complete guide to get started with the platform',
      link_url: 'https://onedrive.test.com/test-quickstart-guide',
      link_type: 'onedrive',
      is_global: true,
      category_id: category?.id,
      tags: ['onboarding', 'quickstart', 'TEST'],
    },
    {
      title: 'TEST: API Integration Guide - DELETE ME',
      description: 'Step-by-step API integration documentation',
      link_url: 'https://docs.google.com/test-api-guide',
      link_type: 'google_drive',
      is_global: true,
      category_id: category?.id,
      tags: ['api', 'integration', 'technical', 'TEST'],
    },
    {
      title: 'TEST: Acme Corp Custom Template - DELETE ME',
      description: 'Custom report template for Acme Corp',
      link_url: 'https://onedrive.test.com/acme-custom-template',
      link_type: 'onedrive',
      is_global: false,
      trial_org_id: trialOrgId,
      category_id: category?.id,
      tags: ['custom', 'template', 'TEST'],
    },
  ];

  for (const doc of documents) {
    const { data, error } = await supabase
      .from('document_library')
      .insert(doc)
      .select()
      .single();

    if (error) {
      console.log(`❌ Error creating document:`, error.message);
    } else {
      testData.documents.push(data.id);
      console.log(`✅ Created document: ${doc.title}`);
      console.log(`   Type: ${doc.is_global ? 'Global' : 'Org-Specific'}`);
      console.log(`   Link: ${doc.link_type}`);
    }
  }

  // Add a note to first document
  if (testData.documents.length > 0) {
    const { data: note, error: noteError } = await supabase
      .from('resource_notes')
      .insert({
        resource_id: testData.documents[0],
        trial_org_id: trialOrgId,
        note_text: 'TEST NOTE: This guide is very helpful for new users. DELETE ME',
      })
      .select()
      .single();

    if (!noteError) {
      testData.notes.push(note.id);
      console.log(`✅ Added note to document`);
    }
  }

  console.log(`\n📊 Total documents created: ${testData.documents.length}`);
}

async function verifyTestData() {
  console.log('\n✅ STEP 6: Verifying All Test Data...');
  console.log('='.repeat(60));

  // Verify trial org
  const { data: org } = await supabase
    .from('trial_organizations')
    .select('*')
    .eq('org_id', testData.trialOrg.org_id)
    .single();

  console.log(`✅ Trial Org: ${org.org_name}`);
  console.log(`   Custom Fields: ${JSON.stringify(org.custom_fields, null, 2)}`);

  // Verify activities
  const { data: activities } = await supabase
    .from('trial_activities')
    .select('*')
    .eq('trial_org_id', testData.trialOrg.org_id);

  console.log(`\n✅ Activities: ${activities.length} found`);
  activities.forEach(a => {
    console.log(`   - ${a.activity_type}: ${a.description}`);
  });

  // Verify documents
  const { data: docs } = await supabase
    .from('document_library')
    .select('*')
    .in('id', testData.documents);

  console.log(`\n✅ Documents: ${docs.length} found`);
  docs.forEach(d => {
    console.log(`   - ${d.title} (${d.is_global ? 'Global' : 'Org-Specific'})`);
  });

  // Verify ticket
  if (testData.tickets.length > 0) {
    const { data: ticket } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('id', testData.tickets[0])
      .single();

    console.log(`\n✅ Support Ticket: ${ticket.subject}`);
    console.log(`   Ticket Status: ${ticket.status}`);
    console.log(`   Priority: ${ticket.priority}`);
  }

  // Verify roadmap item
  if (testData.roadmapItems.length > 0) {
    const { data: roadmap } = await supabase
      .from('org_product_roadmap')
      .select('*')
      .eq('id', testData.roadmapItems[0])
      .single();

    console.log(`\n✅ Roadmap Item: ${roadmap.title}`);
    console.log(`   Status: ${roadmap.status}`);
    console.log(`   Version: ${roadmap.version_planned}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST DATA SUMMARY:');
  console.log('='.repeat(60));
  console.log(`Trial Org ID: ${testData.trialOrg.org_id}`);
  console.log(`Trial Org Name: ${testData.trialOrg.org_name}`);
  console.log(`Activities: ${testData.activities.length}`);
  console.log(`Documents: ${testData.documents.length}`);
  console.log(`Notes: ${testData.notes.length}`);
  console.log(`Tickets: ${testData.tickets.length}`);
  console.log(`Roadmap Items: ${testData.roadmapItems.length}`);
  console.log('='.repeat(60));
}

async function cleanupTestData() {
  console.log('\n🧹 CLEANUP: Deleting All Test Data...');
  console.log('='.repeat(60));

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

    // Delete tickets
    if (testData.tickets.length > 0) {
      const { error } = await supabase
        .from('support_tickets')
        .delete()
        .in('id', testData.tickets);

      if (error) {
        console.log(`❌ Failed to delete tickets:`, error.message);
      } else {
        console.log(`✅ Deleted ${testData.tickets.length} test tickets`);
      }
    }

    // Delete roadmap items
    if (testData.roadmapItems.length > 0) {
      const { error } = await supabase
        .from('org_product_roadmap')
        .delete()
        .in('id', testData.roadmapItems);

      if (error) {
        console.log(`❌ Failed to delete roadmap items:`, error.message);
      } else {
        console.log(`✅ Deleted ${testData.roadmapItems.length} test roadmap items`);
      }
    }

    // Delete trial org (this will cascade delete related records)
    if (testData.trialOrg) {
      const { error } = await supabase
        .from('trial_organizations')
        .delete()
        .eq('org_id', testData.trialOrg.org_id);

      if (error) {
        console.log(`❌ Failed to delete trial org:`, error.message);
      } else {
        console.log(`✅ Deleted test trial organization: ${testData.trialOrg.org_name}`);
      }
    }

    console.log('\n✅ Cleanup complete! All test data removed.\n');

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

// Main execution
async function runComprehensiveTest() {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║                                                           ║');
  console.log('║     🧪 COMPREHENSIVE SYSTEM TEST                          ║');
  console.log('║                                                           ║');
  console.log('║     Testing: Trial Org, Activities, Tickets, Roadmap     ║');
  console.log('║     Environment: localhost (Supabase)                     ║');
  console.log('║                                                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('\n');

  try {
    // Create all test data
    const trialOrg = await createTestTrialOrg();
    await createTestActivities(trialOrg.org_id);
    await createTestTicket(trialOrg.org_id);
    await createTestRoadmapItem();
    await createTestDocuments(trialOrg.org_id);

    // Verify everything
    await verifyTestData();

    // Show URLs for manual testing
    console.log('\n🌐 MANUAL TESTING URLS:');
    console.log('='.repeat(60));
    console.log(`Test Features Page: http://localhost:3004/test-features`);
    console.log(`Trial Org ID: ${trialOrg.org_id}`);
    console.log('\nYou can now manually test the UI with this data.');
    console.log('');

    // Wait before cleanup
    console.log('⏸️  Pausing for 60 seconds to allow manual testing...');
    console.log('   Press Ctrl+C if you want to keep the test data\n');

    await new Promise(resolve => setTimeout(resolve, 60000));

    // Cleanup
    await cleanupTestData();

    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║                                                           ║');
    console.log('║     ✅ COMPREHENSIVE TEST COMPLETE!                       ║');
    console.log('║                                                           ║');
    console.log('║     All test data created, verified, and cleaned up.     ║');
    console.log('║                                                           ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.log('\nAttempting cleanup...');
    await cleanupTestData();
    process.exit(1);
  }
}

// Run the test
runComprehensiveTest();
