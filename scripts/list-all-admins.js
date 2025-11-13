const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function listAllAdmins() {
  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, full_name, role, is_super_admin, parent_company')
    .eq('role', 'Admin')
    .order('full_name');

  if (error) {
    console.error('❌ Error fetching admins:', error.message);
    process.exit(1);
  }

  console.log('📋 All Admin Users:');
  console.log('');
  users.forEach((u, i) => {
    console.log(`${i + 1}. ${u.full_name}`);
    console.log(`   Email: ${u.email}`);
    console.log(`   Company: ${u.parent_company || 'N/A'}`);
    console.log(`   Super Admin: ${u.is_super_admin ? '✅ YES' : '❌ NO'}`);
    console.log('');
  });

  const superAdmins = users.filter(u => u.is_super_admin);
  const regularAdmins = users.filter(u => !u.is_super_admin);

  console.log('---');
  console.log(`Total Admins: ${users.length}`);
  console.log(`Super Admins: ${superAdmins.length}`);
  console.log(`Regular Admins: ${regularAdmins.length}`);
}

listAllAdmins();
