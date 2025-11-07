#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function updateNikitaRole() {
  console.log('\n🔧 Updating Nikita\'s role from Team to Account Manager...\n');

  // Find Nikita's user
  const { data: users } = await supabase.auth.admin.listUsers();
  const nikitaUser = users.users.find(u => u.email === 'nikita@mordorintelligence.com');

  if (!nikitaUser) {
    console.log('❌ nikita@mordorintelligence.com user not found');
    return;
  }

  console.log(`Found user: ${nikitaUser.email}`);
  console.log(`Current role: "${nikitaUser.user_metadata?.role}"`);

  // Update to Account Manager
  const { data, error } = await supabase.auth.admin.updateUserById(
    nikitaUser.id,
    {
      user_metadata: {
        ...nikitaUser.user_metadata,
        role: 'Account Manager',
      },
    }
  );

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  console.log('\n✅ Updated! Role is now "Account Manager"');
  console.log(`\nUpdated user: ${data.user.email}`);
  console.log(`New role: ${data.user.user_metadata?.role}\n`);
}

updateNikitaRole();
