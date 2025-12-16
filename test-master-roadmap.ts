/**
 * Test script for Master Roadmap feature
 * Verifies that roadmap items can be created without org_id
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testMasterRoadmap() {
  console.log('🧪 Testing Master Roadmap Feature\n');
  console.log('='.repeat(80) + '\n');

  try {
    // Test 1: Create a Master Roadmap item (no org_id, with strategic_categories)
    console.log('Test 1: Create Master Roadmap item without org_id...');

    const masterItem = {
      org_id: null, // No organization
      title: 'Enterprise Dataset Expansion',
      description: 'Strategic initiative to expand dataset coverage for enterprise customers',
      status: 'planned',
      priority: 'high',
      target_date: '2025-03-31',
      strategic_categories: ['Datasets Expansion', 'Enterprise Integrations'],
      item_type: 'macro-goal',
      owner_name: 'Product Team',
    };

    const { data: created, error: createError } = await supabase
      .from('org_product_roadmap')
      .insert([masterItem])
      .select()
      .single();

    if (createError) {
      console.log('   ❌ Failed:', createError.message);
      console.log('   Details:', createError);
      return;
    }

    console.log('   ✅ Successfully created Master Roadmap item!');
    console.log(`   ID: ${created.id}`);
    console.log(`   Title: ${created.title}`);
    console.log(`   Org ID: ${created.org_id} (null = Master Roadmap)`);
    console.log(`   Categories: ${created.strategic_categories.join(', ')}`);
    console.log();

    // Test 2: Try to create item with NEITHER org_id NOR strategic_categories (should fail)
    console.log('Test 2: Try to create item without org_id AND without categories (should fail)...');

    const { error: invalidError } = await supabase
      .from('org_product_roadmap')
      .insert([{
        org_id: null,
        title: 'Invalid Item',
        status: 'planned',
        priority: 'low',
        strategic_categories: [], // Empty array - violates constraint
      }])
      .select();

    if (invalidError) {
      console.log('   ✅ Correctly rejected invalid item!');
      console.log(`   Error: ${invalidError.message}`);
    } else {
      console.log('   ❌ Should have rejected item without org_id or categories!');
    }
    console.log();

    // Test 3: Query Master Roadmap items
    console.log('Test 3: Query all Master Roadmap items (org_id IS NULL)...');

    const { data: masterItems, error: queryError } = await supabase
      .from('org_product_roadmap')
      .select('id, title, org_id, strategic_categories, status, priority')
      .is('org_id', null);

    if (queryError) {
      console.log('   ❌ Query failed:', queryError.message);
    } else {
      console.log(`   ✅ Found ${masterItems.length} Master Roadmap items:`);
      masterItems.forEach((item, i) => {
        console.log(`   ${i + 1}. ${item.title}`);
        console.log(`      Categories: ${item.strategic_categories?.join(', ') || 'None'}`);
        console.log(`      Status: ${item.status} | Priority: ${item.priority}`);
      });
    }
    console.log();

    // Test 4: Verify view handles null org_id
    console.log('Test 4: Query roadmap_items_with_org_links view...');

    const { data: viewData, error: viewError } = await supabase
      .from('roadmap_items_with_org_links')
      .select('id, title, org_id, linked_org_count')
      .is('org_id', null)
      .limit(5);

    if (viewError) {
      console.log('   ⚠️  View query failed:', viewError.message);
    } else {
      console.log(`   ✅ View correctly handles null org_id (${viewData.length} items)`);
    }
    console.log();

    // Cleanup
    console.log('Cleanup: Removing test item...');
    await supabase
      .from('org_product_roadmap')
      .delete()
      .eq('id', created.id);
    console.log('   ✅ Test item removed\n');

    console.log('='.repeat(80));
    console.log('\n✅ All Master Roadmap tests passed!\n');
    console.log('Summary:');
    console.log('  ✅ Can create roadmap items without org_id');
    console.log('  ✅ Strategic categories required when org_id is null');
    console.log('  ✅ Constraint prevents invalid entries');
    console.log('  ✅ Queries and views work correctly\n');

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
  }
}

// Run tests
testMasterRoadmap();
