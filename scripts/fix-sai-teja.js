require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function fixSaiTeja() {
  const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
  const saiTeja = users.find(u => u.email === 'sai.teja@mordorintelligence.com');
  if (saiTeja) {
    await supabaseAdmin.auth.admin.updateUserById(saiTeja.id, {
      user_metadata: { name: 'Sai Teja', role: 'Admin' }
    });
    console.log('✅ Sai Teja is now Admin');
  }
}

fixSaiTeja();
