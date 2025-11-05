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

async function resetAdminPassword() {
  const email = 'admin@test.com';
  const newPassword = 'admin123'; // Simple password for testing

  console.log('\n🔧 Resetting admin password...\n');

  try {
    // First, try to get the user
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      console.error('❌ Error listing users:', listError.message);
      return;
    }

    const existingUser = users.find(u => u.email === email);

    if (existingUser) {
      // User exists, update password
      console.log('✅ Found existing admin user');

      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        {
          password: newPassword,
          user_metadata: {
            role: 'admin',  // lowercase
            name: 'Admin User',
          },
        }
      );

      if (error) {
        console.error('❌ Error updating password:', error.message);
        return;
      }

      console.log('✅ Password reset successfully!');
      console.log('\n📝 Login credentials:');
      console.log('   Email:', email);
      console.log('   Password:', newPassword);
      console.log('   Role:', data.user.user_metadata?.role);

    } else {
      // User doesn't exist, create new one
      console.log('📝 Admin user not found, creating new one...');

      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: newPassword,
        email_confirm: true,
        user_metadata: {
          role: 'admin',  // lowercase
          name: 'Admin User',
        },
      });

      if (error) {
        console.error('❌ Error creating user:', error.message);
        return;
      }

      console.log('✅ Admin user created successfully!');
      console.log('\n📝 Login credentials:');
      console.log('   Email:', email);
      console.log('   Password:', newPassword);
      console.log('   Role:', data.user.user_metadata?.role);
    }

    console.log('\n🌐 Now you can log in at: http://localhost:3000/support/login\n');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

resetAdminPassword();
