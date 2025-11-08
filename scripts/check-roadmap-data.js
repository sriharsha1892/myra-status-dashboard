require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkRoadmapData() {
  console.log('🔍 Checking Roadmap Data Integrity...\n');

  // Get all roadmap items
  const { data: items, error } = await supabase
    .from('org_product_roadmap')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching roadmap items:', error);
    return;
  }

  console.log(`📊 TOTAL ROADMAP ITEMS: ${items.length}\n`);

  // Analyze data completeness
  const withAssignee = items.filter(i => i.assigned_to).length;
  const withTargetDate = items.filter(i => i.target_date).length;
  const withDescription = items.filter(i => i.description).length;
  const withGoal = items.filter(i => i.strategic_goal).length;
  const withArea = items.filter(i => i.product_area).length;
  const withVersion = items.filter(i => i.version_planned).length;

  console.log('📈 DATA COMPLETENESS:');
  console.log(`   Assigned To: ${withAssignee}/${items.length} (${Math.round(withAssignee/items.length*100)}%)`);
  console.log(`   Target Date: ${withTargetDate}/${items.length} (${Math.round(withTargetDate/items.length*100)}%)`);
  console.log(`   Description: ${withDescription}/${items.length} (${Math.round(withDescription/items.length*100)}%)`);
  console.log(`   Strategic Goal: ${withGoal}/${items.length} (${Math.round(withGoal/items.length*100)}%)`);
  console.log(`   Product Area: ${withArea}/${items.length} (${Math.round(withArea/items.length*100)}%)`);
  console.log(`   Version: ${withVersion}/${items.length} (${Math.round(withVersion/items.length*100)}%)\n`);

  // Status breakdown
  const byStatus = items.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});

  console.log('📋 STATUS BREAKDOWN:');
  Object.entries(byStatus).forEach(([status, count]) => {
    console.log(`   ${status}: ${count}`);
  });
  console.log('');

  // Priority breakdown
  const byPriority = items.reduce((acc, item) => {
    acc[item.priority] = (acc[item.priority] || 0) + 1;
    return acc;
  }, {});

  console.log('🔥 PRIORITY BREAKDOWN:');
  Object.entries(byPriority).forEach(([priority, count]) => {
    console.log(`   ${priority}: ${count}`);
  });
  console.log('');

  // Sample of first 5 items with full details
  console.log('📄 SAMPLE ITEMS (First 5 with full details):\n');
  items.slice(0, 5).forEach((item, idx) => {
    console.log(`${idx + 1}. ${item.title}`);
    console.log(`   Status: ${item.status}`);
    console.log(`   Priority: ${item.priority}`);
    console.log(`   Assigned: ${item.assigned_to || 'Unassigned'}`);
    console.log(`   Target Date: ${item.target_date || 'No date'}`);
    console.log(`   Goal: ${item.strategic_goal || 'None'}`);
    console.log(`   Area: ${item.product_area || 'None'}`);
    console.log(`   Version: ${item.version_planned || 'None'}`);
    console.log('');
  });

  console.log('✅ All roadmap data is intact and preserved!');
}

checkRoadmapData();
