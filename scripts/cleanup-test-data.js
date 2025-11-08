require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanup() {
  console.log('\n🧹 Cleaning up test data...\n');

  try {
    // Read test data info
    const testDataPath = '/Users/sriharsha/myra-status-dashboard/TEST_DATA_INFO.json';

    if (!fs.existsSync(testDataPath)) {
      console.log('ℹ️  No TEST_DATA_INFO.json found. Cleaning up by markers...\n');

      // Clean by test markers
      const { error: actError } = await supabase
        .from('trial_activities')
        .delete()
        .contains('metadata', { test: true });

      const { error: docError } = await supabase
        .from('document_library')
        .delete()
        .contains('tags', ['TEST']);

      console.log('✅ Cleaned up activities and documents with TEST markers');
      return;
    }

    const testData = JSON.parse(fs.readFileSync(testDataPath, 'utf8'));

    // Delete activities
    if (testData.createdIds.activities.length > 0) {
      await supabase
        .from('trial_activities')
        .delete()
        .in('id', testData.createdIds.activities);
      console.log(`✅ Deleted ${testData.createdIds.activities.length} test activities`);
    }

    // Delete notes
    if (testData.createdIds.notes.length > 0) {
      await supabase
        .from('resource_notes')
        .delete()
        .in('id', testData.createdIds.notes);
      console.log(`✅ Deleted ${testData.createdIds.notes.length} test notes`);
    }

    // Delete documents
    if (testData.createdIds.documents.length > 0) {
      await supabase
        .from('document_library')
        .delete()
        .in('id', testData.createdIds.documents);
      console.log(`✅ Deleted ${testData.createdIds.documents.length} test documents`);
    }

    // Clear custom fields
    if (testData.trialOrgId) {
      await supabase
        .from('trial_organizations')
        .update({ custom_fields: {} })
        .eq('org_id', testData.trialOrgId);
      console.log(`✅ Cleared test custom fields`);
    }

    // Delete the info file
    fs.unlinkSync(testDataPath);
    console.log(`✅ Deleted TEST_DATA_INFO.json`);

    console.log('\n✅ All test data cleaned up!\n');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

cleanup();
