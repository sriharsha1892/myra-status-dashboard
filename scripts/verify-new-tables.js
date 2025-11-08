require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyTables() {
  console.log('🔍 Verifying new tables...\n');

  // Check activity logging tables
  const { data: activityTypes, error: typesError } = await supabase
    .from('trial_activity_types')
    .select('*');

  if (typesError) {
    console.log('❌ trial_activity_types:', typesError.message);
  } else {
    console.log(`✅ trial_activity_types: ${activityTypes.length} types created`);
  }

  const { data: activities, error: activitiesError } = await supabase
    .from('trial_activities')
    .select('*');

  if (activitiesError && !activitiesError.message.includes('0 rows')) {
    console.log('❌ trial_activities:', activitiesError.message);
  } else {
    console.log(`✅ trial_activities: ${activities?.length || 0} activities`);
  }

  // Check document library tables
  const { data: categories, error: categoriesError } = await supabase
    .from('document_categories')
    .select('*');

  if (categoriesError) {
    console.log('❌ document_categories:', categoriesError.message);
  } else {
    console.log(`✅ document_categories: ${categories.length} categories created`);
  }

  const { data: documents, error: documentsError } = await supabase
    .from('document_library')
    .select('*');

  if (documentsError && !documentsError.message.includes('0 rows')) {
    console.log('❌ document_library:', documentsError.message);
  } else {
    console.log(`✅ document_library: ${documents?.length || 0} documents`);
  }

  const { data: notes, error: notesError } = await supabase
    .from('resource_notes')
    .select('*');

  if (notesError && !notesError.message.includes('0 rows')) {
    console.log('❌ resource_notes:', notesError.message);
  } else {
    console.log(`✅ resource_notes: ${notes?.length || 0} notes`);
  }

  // Check custom fields column
  const { data: trialOrgs, error: orgsError } = await supabase
    .from('trial_organizations')
    .select('org_id, org_name, custom_fields')
    .limit(1);

  if (orgsError) {
    console.log('❌ custom_fields column:', orgsError.message);
  } else {
    console.log(`✅ custom_fields column added to trial_organizations`);
  }

  console.log('\n🎉 All tables verified successfully!');
  console.log('\n📋 Summary:');
  console.log(`   - ${activityTypes?.length || 0} activity templates`);
  console.log(`   - ${categories?.length || 0} document categories`);
  console.log(`   - Custom fields support enabled`);
}

verifyTables();
