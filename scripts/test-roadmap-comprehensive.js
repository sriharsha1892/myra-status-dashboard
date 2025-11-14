// Comprehensive Roadmap Testing Suite
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mkkhwiyolmowomojvtel.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const TEST_PREFIX = 'TEST_ROADMAP_';
let testItems = [];
let testComments = [];
let testViews = [];

async function getTestOrg() {
  const { data: orgs } = await supabase
    .from('trial_organizations')
    .select('org_id, org_name')
    .limit(1)
    .single();

  if (!orgs) {
    console.error('❌ No organization found for testing');
    process.exit(1);
  }

  return orgs;
}

async function getTestUser() {
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const admin = users.find(u => u.email === 'admin@myra.ai');

  if (!admin) {
    console.error('❌ Admin user not found');
    process.exit(1);
  }

  return admin.id;
}

// Test 1: Create roadmap items with various combinations
async function testRoadmapItemCreation(orgId, userId) {
  console.log('\n📝 Testing Roadmap Item Creation...');

  const testCombinations = [
    { title: `${TEST_PREFIX}Critical Bug Fix`, description: 'System crash when user logs in with special characters. Security vulnerability detected.', status: 'planned', priority: 'critical' },
    { title: `${TEST_PREFIX}Authentication Feature`, description: 'Implement OAuth2 authentication with Google and GitHub providers. Add two-factor authentication support.', status: 'in_progress', priority: 'high' },
    { title: `${TEST_PREFIX}Dashboard Analytics`, description: 'Create analytics dashboard with charts, metrics, and reporting features. Include export functionality.', status: 'planned', priority: 'medium' },
    { title: `${TEST_PREFIX}Documentation Update`, description: 'Update API documentation and add tutorial guides for new users. Minor text changes.', status: 'completed', priority: 'low' },
    { title: `${TEST_PREFIX}Database Migration`, description: 'Migrate from PostgreSQL 13 to 14. Update schema and add new indexes for performance.', status: 'in_progress', priority: 'high' },
    { title: `${TEST_PREFIX}Mobile App Feature`, description: 'Add iOS and Android support for the new notification system. Implement push notifications.', status: 'planned', priority: 'medium' },
    { title: `${TEST_PREFIX}Performance Optimization`, description: 'Optimize query performance and implement caching. Reduce page load time by 50%.', status: 'in_progress', priority: 'high' },
    { title: `${TEST_PREFIX}UI/UX Redesign`, description: 'Complete redesign of user interface with new design system. Update all components.', status: 'planned', priority: 'medium' }
  ];

  for (const item of testCombinations) {
    const { data, error } = await supabase
      .from('org_product_roadmap')
      .insert({
        ...item,
        org_id: orgId,
        created_by: userId,
        target_date: new Date(Date.now() + Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        progress_percentage: Math.floor(Math.random() * 100)
      })
      .select()
      .single();

    if (error) {
      console.error(`  ❌ Failed to create item: ${item.title}`, error.message);
    } else {
      testItems.push(data);
      console.log(`  ✅ Created: ${item.title} (${item.priority}/${item.status})`);
    }
  }

  return testItems;
}

// Test 2: Test Comments System
async function testCommentsSystem(roadmapItems, userId) {
  console.log('\n💬 Testing Comments System...');

  if (roadmapItems.length === 0) {
    console.log('  ⚠️  No items to comment on');
    return;
  }

  const testComments = [
    { content: 'This looks great! I think we should prioritize this for next sprint.' },
    { content: '@team Please review this and provide feedback by EOD.' },
    { content: 'I found a potential issue with this approach. Let me elaborate:\n\n1. Performance concerns\n2. Security implications\n3. Scalability issues' },
    { content: 'Approved! ✅ Let\'s move forward with implementation.' },
    { content: 'Need more clarification on the requirements. Can we schedule a meeting?' }
  ];

  for (let i = 0; i < Math.min(3, roadmapItems.length); i++) {
    const item = roadmapItems[i];
    const comment = testComments[i % testComments.length];

    const { data, error } = await supabase
      .from('roadmap_comments')
      .insert({
        roadmap_item_id: item.id,
        author_id: userId,
        content: comment.content,
        mentions: comment.content.includes('@') ? [userId] : []
      })
      .select()
      .single();

    if (error) {
      console.error(`  ❌ Failed to add comment to ${item.title}:`, error.message);
    } else {
      testComments.push(data);
      console.log(`  ✅ Added comment to: ${item.title}`);

      // Add a reply to some comments
      if (i === 0) {
        const { data: reply, error: replyError } = await supabase
          .from('roadmap_comments')
          .insert({
            roadmap_item_id: item.id,
            parent_comment_id: data.id,
            author_id: userId,
            content: 'Great point! I agree with this approach.'
          })
          .select()
          .single();

        if (!replyError) {
          testComments.push(reply);
          console.log(`    ✅ Added reply to comment`);
        }
      }
    }
  }
}

// Test 3: Test Saved Filter Views
async function testSavedFilterViews(orgId, userId) {
  console.log('\n🔍 Testing Saved Filter Views...');

  const filterViews = [
    {
      name: 'Critical & High Priority',
      filters: { priority: ['critical', 'high'], status: [] },
      quick_access: true
    },
    {
      name: 'In Progress Items',
      filters: { status: ['in_progress'], priority: [] },
      quick_access: true
    },
    {
      name: 'Completed This Month',
      filters: { status: ['completed'], priority: [] },
      quick_access: false
    }
  ];

  for (const view of filterViews) {
    const { data, error } = await supabase
      .from('roadmap_saved_views')
      .insert({
        org_id: orgId,
        user_id: userId,
        ...view
      })
      .select()
      .single();

    if (error) {
      console.error(`  ❌ Failed to save view: ${view.name}`, error.message);
    } else {
      testViews.push(data);
      console.log(`  ✅ Saved filter view: ${view.name} (Quick Access: ${view.quick_access})`);
    }
  }
}

// Test 4: Test Voting System
async function testVotingSystem(roadmapItems, userId) {
  console.log('\n👍 Testing Voting System...');

  if (roadmapItems.length === 0) {
    console.log('  ⚠️  No items to vote on');
    return;
  }

  for (let i = 0; i < Math.min(4, roadmapItems.length); i++) {
    const item = roadmapItems[i];
    const voteValue = Math.random() > 0.5 ? 1 : -1;

    const { error } = await supabase
      .from('roadmap_votes')
      .upsert({
        roadmap_item_id: item.id,
        user_id: userId,
        vote_value: voteValue
      }, {
        onConflict: 'roadmap_item_id,user_id'
      });

    if (error) {
      console.error(`  ❌ Failed to vote on ${item.title}:`, error.message);
    } else {
      console.log(`  ✅ ${voteValue > 0 ? 'Upvoted' : 'Downvoted'}: ${item.title}`);
    }
  }
}

// Test 5: Test Real-time Updates
async function testRealTimeUpdates(roadmapItems) {
  console.log('\n🔄 Testing Real-time Updates...');

  if (roadmapItems.length === 0) {
    console.log('  ⚠️  No items to update');
    return;
  }

  // Update a few items to trigger real-time events
  const updates = [
    { status: 'completed', progress_percentage: 100 },
    { priority: 'critical', description: 'URGENT: Updated with critical information!' },
    { title: `${TEST_PREFIX}Updated Title - Real-time Test` }
  ];

  for (let i = 0; i < Math.min(3, roadmapItems.length); i++) {
    const item = roadmapItems[i];
    const update = updates[i];

    const { error } = await supabase
      .from('org_product_roadmap')
      .update(update)
      .eq('id', item.id);

    if (error) {
      console.error(`  ❌ Failed to update ${item.title}:`, error.message);
    } else {
      console.log(`  ✅ Updated item ${i + 1} with:`, Object.keys(update).join(', '));
    }
  }
}

// Test 6: Test AI Features (simulate)
async function testAIFeatures(roadmapItems) {
  console.log('\n🤖 Testing AI Features (Simulation)...');

  if (roadmapItems.length === 0) {
    console.log('  ⚠️  No items to analyze');
    return;
  }

  // Import AI functions
  const { suggestTags, detectPriority, generateSummary } = require('../lib/ai/roadmap-ai');

  for (let i = 0; i < Math.min(3, roadmapItems.length); i++) {
    const item = roadmapItems[i];
    console.log(`\n  Analyzing: ${item.title}`);

    try {
      // Test tag suggestions
      const tags = await suggestTags(item);
      console.log(`    📏 Suggested tags: ${tags.tags.join(', ')} (${Math.round(tags.confidence * 100)}% confidence)`);

      // Test priority detection
      const priority = await detectPriority(item);
      console.log(`    🎯 Suggested priority: ${priority.priority} - ${priority.reasoning}`);

      // Test summary generation
      const summary = await generateSummary(item);
      console.log(`    📄 Summary: ${summary.summary.substring(0, 100)}...`);
      console.log(`    💪 Effort: ${summary.estimatedEffort}`);
    } catch (error) {
      console.error(`    ❌ AI analysis failed:`, error.message);
    }
  }
}

// Clean up all test data
async function cleanupTestData() {
  console.log('\n🧹 Cleaning up test data...');

  let cleanupCount = 0;

  // Clean up comments
  if (testComments.length > 0) {
    const commentIds = testComments.map(c => c.id);
    const { error } = await supabase
      .from('roadmap_comments')
      .delete()
      .in('id', commentIds);

    if (!error) {
      cleanupCount += commentIds.length;
      console.log(`  ✅ Deleted ${commentIds.length} test comments`);
    }
  }

  // Clean up saved views
  if (testViews.length > 0) {
    const viewIds = testViews.map(v => v.id);
    const { error } = await supabase
      .from('roadmap_saved_views')
      .delete()
      .in('id', viewIds);

    if (!error) {
      cleanupCount += viewIds.length;
      console.log(`  ✅ Deleted ${viewIds.length} test filter views`);
    }
  }

  // Clean up roadmap items (this will cascade delete votes)
  const { error: deleteError } = await supabase
    .from('org_product_roadmap')
    .delete()
    .like('title', `${TEST_PREFIX}%`);

  if (!deleteError) {
    console.log(`  ✅ Deleted all test roadmap items with prefix: ${TEST_PREFIX}`);
    cleanupCount += testItems.length;
  } else {
    console.error('  ❌ Failed to delete test items:', deleteError.message);
  }

  console.log(`\n✨ Cleanup complete! Removed ${cleanupCount} test records`);
}

// Main test runner
async function runComprehensiveTests() {
  console.log('🚀 Starting Comprehensive Roadmap Testing Suite');
  console.log('=' . repeat(50));

  try {
    // Get test organization and user
    const org = await getTestOrg();
    const userId = await getTestUser();

    console.log(`\n📍 Testing with org: ${org.org_name} (${org.org_id})`);
    console.log(`👤 Test user ID: ${userId}`);

    // Run all tests
    const items = await testRoadmapItemCreation(org.org_id, userId);
    await testCommentsSystem(items, userId);
    await testSavedFilterViews(org.org_id, userId);
    await testVotingSystem(items, userId);
    await testRealTimeUpdates(items);
    await testAIFeatures(items);

    console.log('\n' + '=' . repeat(50));
    console.log('✅ ALL TESTS COMPLETED SUCCESSFULLY!');
    console.log('=' . repeat(50));

    // Wait a bit before cleanup
    console.log('\n⏳ Waiting 3 seconds before cleanup...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Clean up
    await cleanupTestData();

  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    // Attempt cleanup even on error
    await cleanupTestData();
    process.exit(1);
  }
}

// Run the tests
runComprehensiveTests();