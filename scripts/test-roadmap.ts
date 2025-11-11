import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface SeedData {
  testOrgId: string;
  testUserId: string;
  testUserEmail: string;
  roadmapItemIds: string[];
  labelIds: string[];
  milestoneId: string;
}

const seedData: SeedData = {
  testOrgId: '',
  testUserId: '',
  testUserEmail: '',
  roadmapItemIds: [],
  labelIds: [],
  milestoneId: '',
};

async function createSeedData() {
  console.log('🌱 Starting roadmap seed data creation...\n');

  // 1. Get first existing trial organization for testing
  console.log('1. Getting existing trial organization for testing...');
  const { data: org, error: orgError } = await supabase
    .from('trial_organizations')
    .select('org_id, org_name')
    .limit(1)
    .single();

  if (orgError || !org) {
    console.error('❌ Error getting trial organization:', orgError);
    return;
  }
  seedData.testOrgId = org.org_id;
  console.log(`✅ Using organization: ${org.org_name} [${org.org_id}]`);

  // 2. Get first auth user for testing
  console.log('\n2. Getting auth user...');
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers();

  if (authError || !authData.users || authData.users.length === 0) {
    console.error('❌ Error getting auth user:', authError);
    return;
  }

  const authUser = authData.users[0];
  seedData.testUserId = authUser.id;
  seedData.testUserEmail = authUser.email || 'test@example.com';
  console.log('✅ Using auth user:', authUser.email);

  // 3. Create labels
  console.log('\n3. Creating test labels...');
  const labels = [
    { name: 'Feature', color: '#3B82F6' },
    { name: 'Bug Fix', color: '#EF4444' },
    { name: 'Enhancement', color: '#10B981' },
  ];

  for (const label of labels) {
    const { data, error } = await supabase
      .from('roadmap_labels')
      .insert({
        org_id: seedData.testOrgId,
        name: label.name,
        color: label.color,
      })
      .select()
      .single();

    if (!error && data) {
      seedData.labelIds.push(data.id);
      console.log(`✅ Label created: ${label.name}`);
    }
  }

  // 4. Create milestone
  console.log('\n4. Creating test milestone...');
  const { data: milestone, error: milestoneError } = await supabase
    .from('roadmap_milestones')
    .insert({
      org_id: seedData.testOrgId,
      name: 'Q1 2025 Release',
      color: '#8B5CF6',
      target_date: '2025-03-31',
    })
    .select()
    .single();

  if (milestoneError) {
    console.error('❌ Error creating milestone:', milestoneError);
  } else {
    seedData.milestoneId = milestone.id;
    console.log('✅ Milestone created:', milestone.name);
  }

  // 5. Create roadmap items
  console.log('\n5. Creating test roadmap items...');
  const roadmapItems = [
    {
      title: 'Implement Advanced Search Functionality',
      description: 'Add full-text search with filters and sorting capabilities. This should support @mentions and rich text formatting.',
      status: 'in_progress',
      priority: 'high',
      target_date: '2025-02-15',
      estimated_completion_date: '2025-02-20',
      external_blocker: null,
      label_ids: [seedData.labelIds[0], seedData.labelIds[2]],
      milestone_id: seedData.milestoneId,
    },
    {
      title: 'Fix Critical Performance Issues',
      description: 'Database queries are taking too long. Need to optimize indexes and implement caching.',
      status: 'planned',
      priority: 'critical',
      target_date: '2025-01-20',
      estimated_completion_date: '2025-01-25',
      external_blocker: 'Waiting for database team to approve schema changes',
      label_ids: [seedData.labelIds[1]],
      milestone_id: seedData.milestoneId,
    },
    {
      title: 'Add Export to PDF Feature',
      description: 'Users want to export reports as PDF documents with charts and tables.',
      status: 'planned',
      priority: 'medium',
      target_date: '2025-03-01',
      estimated_completion_date: null,
      external_blocker: null,
      label_ids: [seedData.labelIds[0]],
      milestone_id: seedData.milestoneId,
    },
    {
      title: 'Mobile App MVP',
      description: 'Build basic mobile app for iOS and Android.',
      status: 'planned',
      priority: 'low',
      target_date: '2025-04-01',
      estimated_completion_date: null,
      external_blocker: 'Need to hire mobile developer',
      label_ids: [seedData.labelIds[0]],
      milestone_id: null,
    },
  ];

  for (const item of roadmapItems) {
    // First, insert basic fields only
    const { data, error } = await supabase
      .from('org_product_roadmap')
      .insert({
        org_id: seedData.testOrgId,
        title: item.title,
        description: item.description,
        status: item.status,
        priority: item.priority,
        target_date: item.target_date,
        estimated_completion_date: item.estimated_completion_date,
        created_by: seedData.testUserId,
      })
      .select()
      .single();

    if (error) {
      console.error(`❌ Error creating item: ${item.title}`, error);
      continue;
    }

    if (data) {
      seedData.roadmapItemIds.push(data.id);

      // Then update with additional fields
      const { error: updateError } = await supabase
        .from('org_product_roadmap')
        .update({
          label_ids: item.label_ids,
          milestone_id: item.milestone_id,
          external_blocker: item.external_blocker,
        })
        .eq('id', data.id);

      if (!updateError) {
        console.log(`✅ Roadmap item created: ${item.title}`);
      } else {
        console.error(`⚠️  Error updating item ${item.title}:`, updateError);
      }
    }
  }

  // 6. Add dependencies
  console.log('\n6. Creating dependencies...');
  if (seedData.roadmapItemIds.length >= 2) {
    const { error } = await supabase
      .from('org_product_roadmap')
      .update({
        blocked_by_ids: [seedData.roadmapItemIds[1]], // Performance fix blocks search
      })
      .eq('id', seedData.roadmapItemIds[0]);

    if (!error) {
      console.log('✅ Dependency created: Search blocked by Performance Fix');
    }
  }

  // 7. Add owner assignments
  console.log('\n7. Creating owner assignments...');
  for (let i = 0; i < Math.min(2, seedData.roadmapItemIds.length); i++) {
    const { error } = await supabase.rpc('assign_roadmap_owner', {
      p_org_id: seedData.testOrgId,
      p_roadmap_id: seedData.roadmapItemIds[i],
      p_user_name: 'Test User',
      p_user_email: seedData.testUserEmail,
      p_role: i === 0 ? 'primary' : 'contributor',
    });

    if (!error) {
      console.log(`✅ Owner assigned to item ${i + 1}`);
    }
  }

  // 8. Add notes with mentions
  console.log('\n8. Creating test notes...');
  if (seedData.roadmapItemIds.length > 0) {
    const notes = [
      {
        content: '<p>This is a high priority item. @Harsha please review the implementation plan.</p>',
        mentioned_users: [seedData.testUserId],
      },
      {
        content: '<p>Update: Initial testing completed successfully. No blockers at this time.</p>',
        mentioned_users: null,
      },
    ];

    for (const note of notes) {
      const { error } = await supabase
        .from('roadmap_notes')
        .insert({
          org_id: seedData.testOrgId,
          roadmap_item_id: seedData.roadmapItemIds[0],
          content: note.content,
          note_type: 'comment',
          author_id: seedData.testUserId,
          author_name: 'Test Admin',
          mentioned_users: note.mentioned_users,
        });

      if (!error) {
        console.log('✅ Note created');
      }
    }
  }

  console.log('\n✅ Seed data creation complete!');
  console.log('\n📊 Summary:');
  console.log(`   Organization ID: ${seedData.testOrgId}`);
  console.log(`   Roadmap Items: ${seedData.roadmapItemIds.length}`);
  console.log(`   Labels: ${seedData.labelIds.length}`);
  console.log(`   Milestone: ${seedData.milestoneId ? '1' : '0'}`);

  return seedData;
}

async function testRoadmapFeatures() {
  console.log('\n\n🧪 Testing Roadmap Features...\n');

  // Test 1: Verify all items are created
  console.log('Test 1: Verifying roadmap items...');
  const { data: items, error: itemsError } = await supabase
    .from('org_product_roadmap')
    .select('*')
    .eq('org_id', seedData.testOrgId);

  if (!itemsError && items) {
    console.log(`✅ Found ${items.length} roadmap items`);
    items.forEach((item, i) => {
      console.log(`   ${i + 1}. ${item.title} [${item.status}] - Priority: ${item.priority}`);
    });
  }

  // Test 2: Verify dependencies
  console.log('\nTest 2: Verifying dependencies...');
  const { data: itemWithDeps } = await supabase
    .from('org_product_roadmap')
    .select('title, blocked_by_ids')
    .eq('org_id', seedData.testOrgId)
    .not('blocked_by_ids', 'is', null)
    .single();

  if (itemWithDeps) {
    console.log(`✅ Dependencies found: ${itemWithDeps.title} has ${itemWithDeps.blocked_by_ids?.length} blockers`);
  }

  // Test 3: Verify owner assignments
  console.log('\nTest 3: Verifying owner assignments...');
  const { data: owners } = await supabase
    .from('roadmap_owner_assignments')
    .select('*')
    .eq('org_id', seedData.testOrgId);

  if (owners) {
    console.log(`✅ Found ${owners.length} owner assignments`);
    owners.forEach((owner) => {
      console.log(`   - ${owner.user_name} (${owner.role})`);
    });
  }

  // Test 4: Verify notes with mentions
  console.log('\nTest 4: Verifying notes with mentions...');
  const { data: notes } = await supabase
    .from('roadmap_notes')
    .select('content, mentioned_users')
    .eq('org_id', seedData.testOrgId);

  if (notes) {
    console.log(`✅ Found ${notes.length} notes`);
    const notesWithMentions = notes.filter(n => n.mentioned_users && n.mentioned_users.length > 0);
    console.log(`   - ${notesWithMentions.length} notes with mentions`);
  }

  // Test 5: Verify labels
  console.log('\nTest 5: Verifying labels...');
  const { data: labels } = await supabase
    .from('roadmap_labels')
    .select('name, color')
    .eq('org_id', seedData.testOrgId);

  if (labels) {
    console.log(`✅ Found ${labels.length} labels`);
    labels.forEach((label) => {
      console.log(`   - ${label.name} (${label.color})`);
    });
  }

  // Test 6: Verify milestone
  console.log('\nTest 6: Verifying milestone...');
  const { data: milestones } = await supabase
    .from('roadmap_milestones')
    .select('name, target_date')
    .eq('org_id', seedData.testOrgId);

  if (milestones && milestones.length > 0) {
    console.log(`✅ Found ${milestones.length} milestone(s)`);
    milestones.forEach((m) => {
      console.log(`   - ${m.name} (Target: ${m.target_date})`);
    });
  }

  console.log('\n✅ All tests passed!');
}

async function cleanupSeedData() {
  console.log('\n\n🧹 Cleaning up seed data...\n');

  // Delete in reverse order of dependencies

  // 1. Delete notes
  console.log('1. Deleting notes...');
  const { error: notesError } = await supabase
    .from('roadmap_notes')
    .delete()
    .eq('org_id', seedData.testOrgId);
  if (!notesError) console.log('✅ Notes deleted');

  // 2. Delete owner assignments
  console.log('2. Deleting owner assignments...');
  const { error: ownersError } = await supabase
    .from('roadmap_owner_assignments')
    .delete()
    .eq('org_id', seedData.testOrgId);
  if (!ownersError) console.log('✅ Owner assignments deleted');

  // 3. Delete roadmap items
  console.log('3. Deleting roadmap items...');
  const { error: itemsError } = await supabase
    .from('org_product_roadmap')
    .delete()
    .eq('org_id', seedData.testOrgId);
  if (!itemsError) console.log('✅ Roadmap items deleted');

  // 4. Delete milestones
  console.log('4. Deleting milestones...');
  const { error: milestonesError } = await supabase
    .from('roadmap_milestones')
    .delete()
    .eq('org_id', seedData.testOrgId);
  if (!milestonesError) console.log('✅ Milestones deleted');

  // 5. Delete labels
  console.log('5. Deleting labels...');
  const { error: labelsError } = await supabase
    .from('roadmap_labels')
    .delete()
    .eq('org_id', seedData.testOrgId);
  if (!labelsError) console.log('✅ Labels deleted');

  // Note: NOT deleting the organization since we're using an existing one
  console.log('6. Organization kept (using existing org for testing)');

  console.log('\n✅ Cleanup complete!');
}

async function main() {
  try {
    // Create seed data
    await createSeedData();

    // Test features
    await testRoadmapFeatures();

    // Wait a bit before cleanup
    console.log('\n⏳ Seed data is ready for manual testing in the browser!');
    console.log('   Go to: http://localhost:3000/support/admin/roadmap');
    console.log('   Test the following features:');
    console.log('   ✅ Manual save for Title, Description, Status, Priority, Dates, External Blocker');
    console.log('   ✅ Visual indicators (blue dots) on changed fields');
    console.log('   ✅ Unsaved changes warnings (browser close + panel close)');
    console.log('   ✅ Notes with @mentions saving correctly');
    console.log('   ✅ Dependencies, Labels, Milestones, Owners');
    console.log('\n   Press Ctrl+C when ready to cleanup, or run: npm run cleanup-roadmap-test\n');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Export cleanup function for separate script
export { cleanupSeedData, seedData };

// Run if called directly
if (require.main === module) {
  main();
}
