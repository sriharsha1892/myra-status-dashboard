/**
 * Check if unified tables exist and need migration
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Checking database tables...');

  // Check organizations_unified
  const { data: orgs, error: orgsError } = await supabase
    .from('organizations_unified')
    .select('id')
    .limit(1);

  if (orgsError) {
    if (orgsError.message.includes('does not exist')) {
      console.log('  organizations_unified: NEEDS MIGRATION');
    } else {
      console.log('  organizations_unified: ERROR -', orgsError.message);
    }
  } else {
    console.log('  organizations_unified: EXISTS');
  }

  // Check org_contacts
  const { data: contacts, error: contactsError } = await supabase
    .from('org_contacts')
    .select('id')
    .limit(1);

  if (contactsError) {
    if (contactsError.message.includes('does not exist')) {
      console.log('  org_contacts: NEEDS MIGRATION');
    } else {
      console.log('  org_contacts: ERROR -', contactsError.message);
    }
  } else {
    console.log('  org_contacts: EXISTS');
  }

  // Check contact_activities
  const { data: activities, error: activitiesError } = await supabase
    .from('contact_activities')
    .select('id')
    .limit(1);

  if (activitiesError) {
    if (activitiesError.message.includes('does not exist')) {
      console.log('  contact_activities: NEEDS MIGRATION');
    } else {
      console.log('  contact_activities: ERROR -', activitiesError.message);
    }
  } else {
    console.log('  contact_activities: EXISTS');
  }

  // Check if we have existing data in organizations
  const { count: orgCount } = await supabase
    .from('organizations')
    .select('*', { count: 'exact', head: true });

  console.log(`\nExisting data:
  organizations: ${orgCount ?? 0} records`);
}

main().catch(console.error);
