import { createClient } from '@supabase/supabase-js';

const organizationsToDelete = [
  'fintech',
  'mediamax',
  'acme',
  'techstart',
  'global solutions',
  'dataflpw systems',
  'cloudnine enterprises',
  'innovate labs',
];

async function deleteOrganizations() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log(`Starting deletion of ${organizationsToDelete.length} organizations...`);

  try {
    for (const orgName of organizationsToDelete) {
      const { data, error: selectError } = await supabase
        .from('trial_organizations')
        .select('org_id, org_name')
        .ilike('org_name', `%${orgName}%`);

      if (selectError) {
        console.error(`Error searching for "${orgName}":`, selectError);
        continue;
      }

      if (data && data.length > 0) {
        const orgIds = data.map((org: any) => org.org_id);
        console.log(`Found ${data.length} organization(s) matching "${orgName}":`, data.map((o: any) => o.org_name));

        const { error: deleteError, count } = await supabase
          .from('trial_organizations')
          .delete()
          .in('org_id', orgIds);

        if (deleteError) {
          console.error(`Error deleting organizations matching "${orgName}":`, deleteError);
        } else {
          console.log(`✅ Deleted ${count} organization(s) matching "${orgName}"`);
        }
      } else {
        console.log(`⚠️  No organizations found matching "${orgName}"`);
      }
    }

    console.log('\n✅ Deletion complete!');
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

deleteOrganizations();
