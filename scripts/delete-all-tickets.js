require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deleteAllTickets() {
  console.log('🗑️  Deleting all tickets...\n');

  try {
    // Get count first
    const { count: beforeCount, error: countError } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true });

    if (countError) throw countError;

    console.log(`📊 Found ${beforeCount} tickets\n`);

    if (beforeCount === 0) {
      console.log('✅ No tickets to delete');
      return;
    }

    // Delete all tickets
    const { error: deleteError } = await supabase
      .from('tickets')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (using a condition that matches everything)

    if (deleteError) throw deleteError;

    // Verify deletion
    const { count: afterCount } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true });

    console.log(`✅ Deleted ${beforeCount} tickets`);
    console.log(`📊 Remaining tickets: ${afterCount || 0}\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

deleteAllTickets();
