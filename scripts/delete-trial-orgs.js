require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function deleteAllTrialOrgs() {
  console.log('\n🗑️  Starting deletion of all trial organizations and associated data...\n');

  try {
    // First, get all trial organizations
    const { data: orgs, error: orgsError } = await supabaseAdmin
      .from('trial_organizations')
      .select('org_id, org_name');

    if (orgsError) throw orgsError;

    if (!orgs || orgs.length === 0) {
      console.log('✅ No trial organizations found. Database is already clean.\n');
      return;
    }

    console.log(`Found ${orgs.length} trial organization(s) to delete:\n`);
    orgs.forEach(org => console.log(`   - ${org.org_name} (${org.org_id})`));
    console.log('\n');

    const orgIds = orgs.map(org => org.org_id);

    // Delete associated data in the correct order (respecting foreign key constraints)

    // 1. Delete notification_preferences
    console.log('🔄 Deleting notification preferences...');
    const { error: notifPrefError } = await supabaseAdmin
      .from('notification_preferences')
      .delete()
      .in('org_id', orgIds);
    if (notifPrefError) console.error('   ⚠️  Error:', notifPrefError.message);
    else console.log('   ✅ Notification preferences deleted');

    // 2. Delete user_notifications
    console.log('🔄 Deleting user notifications...');
    const { data: notes, error: notesError } = await supabaseAdmin
      .from('org_activity_notes')
      .select('note_id')
      .in('org_id', orgIds);

    if (!notesError && notes && notes.length > 0) {
      const noteIds = notes.map(n => n.note_id);
      const { error: userNotifError } = await supabaseAdmin
        .from('user_notifications')
        .delete()
        .in('note_id', noteIds);
      if (userNotifError) console.error('   ⚠️  Error:', userNotifError.message);
      else console.log('   ✅ User notifications deleted');
    } else {
      console.log('   ✅ No user notifications to delete');
    }

    // 3. Delete feature_roadmap_links
    console.log('🔄 Deleting feature-roadmap links...');
    const { error: featureLinksError } = await supabaseAdmin
      .from('feature_roadmap_links')
      .delete()
      .in('org_id', orgIds);
    if (featureLinksError) console.error('   ⚠️  Error:', featureLinksError.message);
    else console.log('   ✅ Feature-roadmap links deleted');

    // 4. Delete feature roadmap notes
    console.log('🔄 Deleting feature roadmap notes...');
    const { error: roadmapNotesError } = await supabaseAdmin
      .from('feature_roadmap_notes')
      .delete()
      .in('org_id', orgIds);
    if (roadmapNotesError) console.error('   ⚠️  Error:', roadmapNotesError.message);
    else console.log('   ✅ Feature roadmap notes deleted');

    // 5. Delete org_product_roadmap
    console.log('🔄 Deleting product roadmap items...');
    const { error: roadmapError } = await supabaseAdmin
      .from('org_product_roadmap')
      .delete()
      .in('org_id', orgIds);
    if (roadmapError) console.error('   ⚠️  Error:', roadmapError.message);
    else console.log('   ✅ Product roadmap items deleted');

    // 6. Delete feature requests
    console.log('🔄 Deleting feature requests...');
    const { error: featuresError } = await supabaseAdmin
      .from('org_feature_requests')
      .delete()
      .in('org_id', orgIds);
    if (featuresError) console.error('   ⚠️  Error:', featuresError.message);
    else console.log('   ✅ Feature requests deleted');

    // 7. Delete activity notes
    console.log('🔄 Deleting activity notes...');
    const { error: activityNotesError } = await supabaseAdmin
      .from('org_activity_notes')
      .delete()
      .in('org_id', orgIds);
    if (activityNotesError) console.error('   ⚠️  Error:', activityNotesError.message);
    else console.log('   ✅ Activity notes deleted');

    // 8. Delete trial tickets
    console.log('🔄 Deleting trial tickets...');
    const { error: ticketsError } = await supabaseAdmin
      .from('trial_tickets')
      .delete()
      .in('org_id', orgIds);
    if (ticketsError) console.error('   ⚠️  Error:', ticketsError.message);
    else console.log('   ✅ Trial tickets deleted');

    // 9. Finally, delete trial organizations
    console.log('🔄 Deleting trial organizations...');
    const { error: deleteOrgsError } = await supabaseAdmin
      .from('trial_organizations')
      .delete()
      .in('org_id', orgIds);
    if (deleteOrgsError) throw deleteOrgsError;
    console.log('   ✅ Trial organizations deleted');

    console.log(`\n✨ Successfully deleted all ${orgs.length} trial organization(s) and associated data!\n`);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nStack trace:', error);
    process.exit(1);
  }
}

deleteAllTrialOrgs();
