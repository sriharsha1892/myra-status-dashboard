const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function updateSaiTeja() {
  // First, find Sai Teja's user record
  const { data: users, error: searchError } = await supabase
    .from('users')
    .select('id, email, full_name, role, is_super_admin')
    .ilike('full_name', '%sai%teja%');

  if (searchError) {
    console.error('❌ Error searching for user:', searchError.message);
    process.exit(1);
  }

  if (!users || users.length === 0) {
    console.log('❌ No user found matching "Sai Teja"');
    console.log('Searching for variations...');

    // Try alternate search
    const { data: altUsers, error: altError } = await supabase
      .from('users')
      .select('id, email, full_name, role, is_super_admin')
      .or('full_name.ilike.%sai%,full_name.ilike.%teja%');

    if (altUsers && altUsers.length > 0) {
      console.log('Found possible matches:');
      altUsers.forEach(u => console.log('  -', u.full_name, '(' + u.email + ')'));
    }
    process.exit(1);
  }

  console.log('📋 Found user(s):');
  users.forEach(u => {
    console.log('  - Name:', u.full_name);
    console.log('    Email:', u.email);
    console.log('    Role:', u.role);
    console.log('    Super Admin:', u.is_super_admin);
  });

  if (users.length > 1) {
    console.log('⚠️  Multiple users found. Please specify which one.');
    process.exit(1);
  }

  const user = users[0];

  if (user.is_super_admin) {
    console.log('✅ User is already a super admin!');
    process.exit(0);
  }

  // Update to super admin
  const { data: updated, error: updateError } = await supabase
    .from('users')
    .update({ is_super_admin: true })
    .eq('id', user.id)
    .select()
    .single();

  if (updateError) {
    console.error('❌ Error updating user:', updateError.message);
    process.exit(1);
  }

  console.log('');
  console.log('✅ SUCCESS! Updated user to super admin:');
  console.log('   Name:', updated.full_name);
  console.log('   Email:', updated.email);
  console.log('   Role:', updated.role);
  console.log('   Super Admin:', updated.is_super_admin);
  console.log('');
  console.log('🎉 ' + updated.full_name + ' now has super admin access!');
}

updateSaiTeja();
