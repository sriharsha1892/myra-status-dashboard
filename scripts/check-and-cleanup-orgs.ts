import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Make sure .env.local has:');
  console.error('  NEXT_PUBLIC_SUPABASE_URL');
  console.error('  SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  try {
    console.log('\n🔍 Checking database state...\n');

    // Get all organizations
    const { data: allOrgs, error: fetchError } = await supabase
      .from('trial_organizations')
      .select('org_id, org_name, created_at, sales_poc_name')
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('❌ Error fetching organizations:', fetchError);
      process.exit(1);
    }

    console.log(`📊 Total organizations in database: ${allOrgs?.length || 0}\n`);

    if (!allOrgs || allOrgs.length === 0) {
      console.log('✅ Database is clean - no organizations found.');
      process.exit(0);
    }

    // Group by date
    const nov5 = new Date('2025-11-05');
    const nov6 = new Date('2025-11-06');

    const recentOrgs = allOrgs.filter(org => {
      const created = new Date(org.created_at);
      return created >= nov5;
    });

    console.log('📅 Organizations by creation date:\n');
    console.log(`Recent (Nov 5-6): ${recentOrgs.length} orgs`);
    console.log(`Older (before Nov 5): ${allOrgs.length - recentOrgs.length} orgs\n`);

    if (recentOrgs.length > 0) {
      console.log('🔴 Recently imported organizations (Nov 5-6):');
      console.log('─'.repeat(80));
      recentOrgs.forEach((org, idx) => {
        const date = new Date(org.created_at).toLocaleString();
        console.log(`${idx + 1}. ${org.org_name} (${org.org_id})`);
        console.log(`   Created: ${date} | POC: ${org.sales_poc_name || 'N/A'}`);
      });
      console.log('─'.repeat(80));
      console.log(`\n⚠️  Found ${recentOrgs.length} organizations imported on Nov 5-6`);
      console.log('\nTo delete these organizations, run:');
      console.log('  npm run cleanup-recent-orgs\n');
    }

    // Show older orgs for context
    const olderOrgs = allOrgs.filter(org => {
      const created = new Date(org.created_at);
      return created < nov5;
    });

    if (olderOrgs.length > 0) {
      console.log('\n✅ Older organizations (will be kept):');
      console.log('─'.repeat(80));
      olderOrgs.forEach((org, idx) => {
        const date = new Date(org.created_at).toLocaleString();
        console.log(`${idx + 1}. ${org.org_name} (${org.org_id})`);
        console.log(`   Created: ${date}`);
      });
      console.log('─'.repeat(80));
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

async function cleanupRecentOrgs() {
  try {
    console.log('\n🗑️  Starting cleanup of recently imported organizations...\n');

    // Get organizations created on Nov 5-6
    const nov5 = new Date('2025-11-05');

    const { data: allOrgs, error: fetchError } = await supabase
      .from('trial_organizations')
      .select('org_id, org_name, created_at')
      .gte('created_at', nov5.toISOString())
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('❌ Error fetching organizations:', fetchError);
      process.exit(1);
    }

    if (!allOrgs || allOrgs.length === 0) {
      console.log('✅ No recent organizations found to delete.');
      process.exit(0);
    }

    console.log(`Found ${allOrgs.length} organization(s) to delete:\n`);
    allOrgs.forEach((org, idx) => {
      console.log(`${idx + 1}. ${org.org_name} (${org.org_id})`);
    });

    console.log(`\n⚠️  This will delete ${allOrgs.length} organizations and all their related data!`);
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');

    // Wait 5 seconds
    await new Promise(resolve => setTimeout(resolve, 5000));

    const idsToDelete = allOrgs.map(org => org.org_id);

    // Delete related data first
    console.log('\n📝 Step 1: Deleting related data...');

    // Delete trial users
    console.log('  - Deleting trial users...');
    const { error: usersError } = await supabase
      .from('trial_users')
      .delete()
      .in('org_id', idsToDelete);
    if (usersError) console.log(`    ⚠️  ${usersError.message}`);
    else console.log('    ✅ Trial users deleted');

    // Delete support queries
    console.log('  - Deleting support queries...');
    const { error: queriesError } = await supabase
      .from('support_queries')
      .delete()
      .in('org_id', idsToDelete);
    if (queriesError) console.log(`    ⚠️  ${queriesError.message}`);
    else console.log('    ✅ Support queries deleted');

    // Delete feature requests
    console.log('  - Deleting feature requests...');
    const { error: featuresError } = await supabase
      .from('feature_requests')
      .delete()
      .in('org_id', idsToDelete);
    if (featuresError) console.log(`    ⚠️  ${featuresError.message}`);
    else console.log('    ✅ Feature requests deleted');

    // Delete meeting notes
    console.log('  - Deleting meeting notes...');
    const { error: meetingsError } = await supabase
      .from('meeting_notes')
      .delete()
      .in('org_id', idsToDelete);
    if (meetingsError) console.log(`    ⚠️  ${meetingsError.message}`);
    else console.log('    ✅ Meeting notes deleted');

    // Delete activity logs
    console.log('  - Deleting activity logs...');
    const { error: activityError } = await supabase
      .from('activity_log')
      .delete()
      .in('org_id', idsToDelete);
    if (activityError) console.log(`    ⚠️  ${activityError.message}`);
    else console.log('    ✅ Activity logs deleted');

    // Delete followups
    console.log('  - Deleting followups...');
    const { error: followupsError } = await supabase
      .from('followups')
      .delete()
      .in('org_id', idsToDelete);
    if (followupsError) console.log(`    ⚠️  ${followupsError.message}`);
    else console.log('    ✅ Followups deleted');

    // Finally delete organizations
    console.log('\n🗑️  Step 2: Deleting organizations...');
    const { error: orgsError } = await supabase
      .from('trial_organizations')
      .delete()
      .in('org_id', idsToDelete);

    if (orgsError) {
      console.error('❌ Error deleting organizations:', orgsError);
      process.exit(1);
    }

    console.log(`✅ Successfully deleted ${allOrgs.length} organization(s)!`);

    // Verify
    const { data: remaining } = await supabase
      .from('trial_organizations')
      .select('org_id, org_name')
      .in('org_id', idsToDelete);

    if (remaining && remaining.length > 0) {
      console.log(`\n⚠️  Warning: ${remaining.length} organization(s) still exist`);
    } else {
      console.log('\n✅ Verification complete - all organizations deleted successfully!\n');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Check command line argument
const command = process.argv[2];

if (command === 'cleanup') {
  cleanupRecentOrgs();
} else {
  checkDatabase();
}
