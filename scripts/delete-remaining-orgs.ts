import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteRemainingOrganizations() {
  try {
    console.log('\n🗑️  Deleting remaining unwanted organizations...\n');

    // Organizations to delete
    const orgsToDelete = ['Dataflow', 'InnovateLabs', 'DataFlow Systems', 'Innovate Labs'];

    // Get all organizations to find matches
    const { data: allOrgs, error: fetchError } = await supabase
      .from('trial_organizations')
      .select('org_id, org_name');

    if (fetchError) throw fetchError;

    console.log(`Total organizations in database: ${allOrgs?.length || 0}`);

    // Find organizations that match (case-insensitive)
    const orgsToRemove = allOrgs?.filter(org =>
      orgsToDelete.some(name => org.org_name?.toLowerCase().includes(name.toLowerCase()))
    ) || [];

    console.log(`\nOrganizations matching deletion criteria:`);
    orgsToRemove.forEach(org => {
      console.log(`  - ${org.org_name} (${org.org_id})`);
    });

    // Also check for blank/null org_name
    const blankOrg = allOrgs?.find(org => !org.org_name || org.org_name.trim() === '');
    if (blankOrg) {
      console.log(`  - [BLANK] (${blankOrg.org_id})`);
      orgsToRemove.push(blankOrg);
    }

    if (orgsToRemove.length === 0) {
      console.log('\nNo matching organizations found to delete.');
      process.exit(0);
    }

    const idsToDelete = orgsToRemove.map(org => org.org_id);

    // Delete support queries first (cascade)
    console.log(`\n📝 Deleting support queries for ${idsToDelete.length} organization(s)...`);
    for (const orgId of idsToDelete) {
      const { data, error: deleteQueriesError } = await supabase
        .from('support_queries')
        .delete()
        .eq('org_id', orgId);

      if (deleteQueriesError) {
        console.log(`  ⚠️  Could not delete queries for ${orgId}: ${deleteQueriesError.message}`);
      } else {
        console.log(`  ✅ Deleted support queries for ${orgId}`);
      }
    }

    // Delete organizations
    console.log(`\n🗑️  Deleting ${idsToDelete.length} organization(s)...`);
    for (const orgId of idsToDelete) {
      const { error: deleteOrgError } = await supabase
        .from('trial_organizations')
        .delete()
        .eq('org_id', orgId);

      if (deleteOrgError) {
        console.log(`  ❌ Failed to delete ${orgId}: ${deleteOrgError.message}`);
      } else {
        console.log(`  ✅ Deleted ${orgId}`);
      }
    }

    // Verify deletion
    console.log(`\n✅ Verifying deletion...`);
    const { data: remainingOrgs, error: verifyError } = await supabase
      .from('trial_organizations')
      .select('org_id, org_name')
      .in('org_id', idsToDelete);

    if (verifyError) {
      console.log(`  ⚠️  Error verifying: ${verifyError.message}`);
    } else if (remainingOrgs && remainingOrgs.length === 0) {
      console.log(`  ✅ All ${idsToDelete.length} organization(s) successfully deleted!`);
    } else {
      console.log(`  ⚠️  ${remainingOrgs?.length || 0} organization(s) still exist after deletion`);
    }

    console.log('\n✨ Cleanup complete!\n');
  } catch (error: any) {
    console.error('❌ Error during cleanup:', error.message);
    process.exit(1);
  }
}

deleteRemainingOrganizations();
