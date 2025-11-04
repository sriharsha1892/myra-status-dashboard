import { createClient } from '@supabase/supabase-js';

const organizationsToDelete = [
  'FinTech Solutions',
  'MediaMax Partners',
  'Acme Corp',
  'TechStart Inc',
  'Global Solutions',
  'CloudNine Enterprises',
];

async function deleteSupportQueries() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log(`Starting deletion of support queries for ${organizationsToDelete.length} organizations...\n`);

  let totalQueriesDeleted = 0;

  try {
    for (const orgName of organizationsToDelete) {
      // First find the organization
      const { data: orgData, error: orgError } = await supabase
        .from('trial_organizations')
        .select('org_id')
        .eq('org_name', orgName);

      if (orgError || !orgData || orgData.length === 0) {
        console.log(`⚠️  Organization "${orgName}" not found (already deleted)`);
        continue;
      }

      const orgId = orgData[0].org_id;

      // Find all support queries for this organization
      const { data: queriesData, error: queriesError } = await supabase
        .from('support_queries')
        .select('id')
        .eq('org_id', orgId);

      if (queriesError) {
        console.error(`Error querying support_queries for "${orgName}":`, queriesError);
        continue;
      }

      if (queriesData && queriesData.length > 0) {
        const queryIds = queriesData.map((q: any) => q.id);
        console.log(`Found ${queryIds.length} support query/queries for "${orgName}"`);

        const { error: deleteError, count } = await supabase
          .from('support_queries')
          .delete()
          .in('id', queryIds);

        if (deleteError) {
          console.error(`Error deleting support queries for "${orgName}":`, deleteError);
        } else {
          console.log(`✅ Deleted ${count} support query/queries for "${orgName}"\n`);
          totalQueriesDeleted += (count || 0);
        }
      } else {
        console.log(`ℹ️  No support queries found for "${orgName}"\n`);
      }
    }

    console.log(`\n✅ Support queries deletion complete! Total deleted: ${totalQueriesDeleted}`);
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

deleteSupportQueries();
