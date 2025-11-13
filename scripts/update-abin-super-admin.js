const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function updateAbinToSuperAdmin() {
  // Find Abin Zacharia by email
  const { data: user, error: searchError } = await supabase
    .from('users')
    .select('id, email, full_name, role, is_super_admin')
    .eq('email', 'abin.zacharia@mordorintelligence.com')
    .single();

  if (searchError) {
    console.error('❌ Error finding user:', searchError.message);
    process.exit(1);
  }

  if (!user) {
    console.log('❌ User not found: abin.zacharia@mordorintelligence.com');
    process.exit(1);
  }

  console.log('📋 Found user:');
  console.log('   Name:', user.full_name);
  console.log('   Email:', user.email);
  console.log('   Role:', user.role);
  console.log('   Super Admin (before):', user.is_super_admin);

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
  console.log('   Super Admin (after):', updated.is_super_admin);
  console.log('');
  console.log('🎉', updated.full_name, 'now has super admin access!');
}

updateAbinToSuperAdmin();
