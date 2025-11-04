import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupOrphanedTickets() {
  try {
    console.log('\n🧹 Cleaning up orphaned support tickets...\n');

    // Get all open support queries
    const { data: allQueries, error: queriesError } = await supabase
      .from('support_queries')
      .select('id, org_id, status');

    if (queriesError) throw queriesError;

    // Get all valid org_ids
    const { data: validOrgs, error: orgsError } = await supabase
      .from('trial_organizations')
      .select('org_id');

    if (orgsError) throw orgsError;

    const validOrgIds = new Set(validOrgs.map((o: any) => o.org_id));
    const orphanedQueries = (allQueries || []).filter((q: any) => !validOrgIds.has(q.org_id));

    console.log(`📊 Statistics:`);
    console.log(`  Total support queries: ${allQueries?.length || 0}`);
    console.log(`  Valid organizations: ${validOrgs?.length || 0}`);
    console.log(`  Orphaned queries (from deleted orgs): ${orphanedQueries.length}`);

    if (orphanedQueries.length === 0) {
      console.log('\n✅ No orphaned queries found. All tickets are clean!\n');
      process.exit(0);
    }

    // Delete orphaned queries
    console.log(`\n🗑️  Deleting ${orphanedQueries.length} orphaned ticket(s)...`);
    const orphanedIds = orphanedQueries.map((q: any) => q.id);

    const { error: deleteError } = await supabase
      .from('support_queries')
      .delete()
      .in('id', orphanedIds);

    if (deleteError) throw deleteError;

    console.log(`✅ Successfully deleted ${orphanedIds.length} orphaned ticket(s)!`);

    // Verify deletion
    const { data: remaining, error: verifyError } = await supabase
      .from('support_queries')
      .select('id, org_id');

    if (verifyError) throw verifyError;

    const stillOrphaned = (remaining || []).filter((q: any) => !validOrgIds.has(q.org_id));
    console.log(`\n✅ Verification: ${stillOrphaned.length} orphaned queries remaining\n`);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

cleanupOrphanedTickets();
