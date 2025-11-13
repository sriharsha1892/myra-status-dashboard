const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function updateMultipleSuperAdmins() {
  // Search for users with 'abin' or 'reddy' in their name
  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, full_name, role, is_super_admin')
    .or('full_name.ilike.%abin%,full_name.ilike.%reddy%');

  if (error) {
    console.error('❌ Error searching for users:', error.message);
    process.exit(1);
  }

  if (!users || users.length === 0) {
    console.log('❌ No users found matching "abin" or "reddy"');
    process.exit(1);
  }

  console.log('📋 Found users:');
  users.forEach(u => {
    console.log('  - Name:', u.full_name);
    console.log('    Email:', u.email);
    console.log('    Role:', u.role);
    console.log('    Super Admin:', u.is_super_admin);
    console.log('');
  });

  // Update all found users to super admin
  for (const user of users) {
    if (user.is_super_admin) {
      console.log('✅', user.full_name, 'is already a super admin');
      continue;
    }

    const { data: updated, error: updateError } = await supabase
      .from('users')
      .update({ is_super_admin: true })
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating', user.full_name + ':', updateError.message);
      continue;
    }

    console.log('✅ SUCCESS! Updated', updated.full_name, 'to super admin');
  }

  console.log('');
  console.log('🎉 All users updated successfully!');
}

updateMultipleSuperAdmins();
