require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

async function fixUsers() {
  console.log('\n🔧 Fixing user data...\n');

  try {
    // Get all users
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      console.error('Error listing users:', listError);
      return;
    }

    // Fix Sai Teja name (full name)
    const saiTeja = users.find(u => u.email === 'sai.teja@mordorintelligence.com');
    if (saiTeja) {
      console.log('Updating Sai Teja...');
      await supabaseAdmin.auth.admin.updateUserById(saiTeja.id, {
        user_metadata: { name: 'Sai Teja', role: 'Sales Admin' }
      });
      console.log('✅ Updated Sai Teja (full name, Sales Admin)');
    }

    // Fix Aditya Pisupati role to Sales Admin
    const aditya = users.find(u => u.email === 'adi@mordorintelligence.com');
    if (aditya) {
      console.log('Updating Aditya Pisupati role to Sales Admin...');
      await supabaseAdmin.auth.admin.updateUserById(aditya.id, {
        user_metadata: { name: 'Aditya Pisupati', role: 'Sales Admin' }
      });
      console.log('✅ Updated Aditya Pisupati to Sales Admin');
    }

    console.log('\n✨ User data fixed!\n');
  } catch (error) {
    console.error('Error:', error);
  }
}

fixUsers();
