import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createAdminUser() {
  try {
    console.log('\n📝 Creating Admin User...\n');

    // Admin credentials
    const adminEmail = 'admin@myra.ai';
    const adminPassword = 'MyRA@Admin2025!';
    const adminName = 'Admin User';

    // Create the user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        full_name: adminName,
        role: 'admin'
      }
    });

    if (authError) throw authError;

    console.log('✅ Admin user created in Supabase Auth');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   ID: ${authData.user?.id}`);

    console.log('\n🎉 Admin account created successfully!\n');
    console.log('🔐 Login Credentials:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log('\n📍 Access URL: http://localhost:3000/support/login\n');
    console.log('⚠️  IMPORTANT: Change the password after first login!\n');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createAdminUser();
