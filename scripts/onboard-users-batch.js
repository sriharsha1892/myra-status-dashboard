const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Users to onboard
const NEW_USERS = [
  { name: 'Krati Agarwal', email: 'krati@mordorintelligence.com', role: 'Account Manager' },
  { name: 'Kartheek Puttaparthini', email: 'kartheek@mordorintelligence.com', role: 'Account Manager' },
  { name: 'Satyanath P', email: 'satyanath@mordorintelligence.com', role: 'Account Manager' },
  { name: 'Kirandeep Kaur', email: 'kirandeep.kaur@mordorintelligence.com', role: 'Account Manager' },
  { name: 'Rupak Dalapathi', email: 'rupak.dalapathi@mordorintelligence.com', role: 'Account Manager' },
  { name: 'Aditya Pisupati', email: 'adi@mordorintelligence.com', role: 'Admin' },
];

// Role update for existing user
const ROLE_UPDATES = [
  { email: 'nikita', role: 'Account Manager' }, // Will search for nikita by partial email/name
];

async function findUserByPartialMatch(searchTerm) {
  try {
    const { data, error } = await supabase.auth.admin.listUsers();

    if (error) throw error;

    const normalizedSearch = searchTerm.toLowerCase();
    const found = data.users.find(u =>
      u.email?.toLowerCase().includes(normalizedSearch) ||
      u.user_metadata?.name?.toLowerCase().includes(normalizedSearch)
    );

    return found || null;
  } catch (error) {
    console.error('Error finding user:', error.message);
    return null;
  }
}

async function updateUserRole(userId, newRole) {
  try {
    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { role: newRole },
    });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function createSignupToken(email, name, role) {
  try {
    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const exists = existingUsers.users.some(u => u.email === email);

    if (exists) {
      return {
        success: false,
        email,
        name,
        error: 'User already exists in auth system'
      };
    }

    // Check if token already exists
    const { data: existingTokens } = await supabase
      .from('signup_tokens')
      .select('token, email')
      .eq('email', email)
      .eq('used', false);

    if (existingTokens && existingTokens.length > 0) {
      // Return existing token
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      return {
        success: true,
        email,
        name,
        role,
        signupUrl: `${baseUrl}/support/signup?token=${existingTokens[0].token}`,
        existing: true,
      };
    }

    // Generate new token
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    const { error } = await supabase
      .from('signup_tokens')
      .insert({
        token,
        email,
        user_role: role,
        expires_at: expiresAt.toISOString(),
        created_by: '84796ddb-6458-4eea-9a67-cfcf73a31f7d', // Admin user ID
      });

    if (error) throw error;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const signupUrl = `${baseUrl}/support/signup?token=${token}`;

    return {
      success: true,
      email,
      name,
      role,
      signupUrl,
      existing: false,
    };
  } catch (error) {
    return {
      success: false,
      email,
      name,
      error: error.message,
    };
  }
}

async function main() {
  console.log('🚀 Starting batch user onboarding...\n');

  // Step 1: Update existing user roles
  console.log('📝 Step 1: Updating existing user roles...\n');
  for (const update of ROLE_UPDATES) {
    const user = await findUserByPartialMatch(update.email);

    if (user) {
      console.log(`Found user: ${user.user_metadata?.name || user.email}`);
      const result = await updateUserRole(user.id, update.role);

      if (result.success) {
        console.log(`✅ Updated ${user.email} role to: ${update.role}\n`);
      } else {
        console.log(`❌ Failed to update ${user.email}: ${result.error}\n`);
      }
    } else {
      console.log(`⚠️  User matching "${update.email}" not found\n`);
    }
  }

  // Step 2: Onboard new users
  console.log('\n👥 Step 2: Creating signup tokens for new users...\n');
  const results = [];

  for (const user of NEW_USERS) {
    console.log(`Processing: ${user.name} (${user.email})...`);
    const result = await createSignupToken(user.email, user.name, user.role);
    results.push(result);

    if (result.success) {
      if (result.existing) {
        console.log(`✅ Using existing token`);
      } else {
        console.log(`✅ Created new token`);
      }
    } else {
      console.log(`❌ Failed: ${result.error}`);
    }
    console.log('');
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 BATCH ONBOARDING SUMMARY');
  console.log('='.repeat(80) + '\n');

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}\n`);

  if (successful.length > 0) {
    console.log('🔗 SIGNUP LINKS (Share these with users):\n');
    console.log('─'.repeat(80) + '\n');

    successful.forEach((result, index) => {
      console.log(`${index + 1}. ${result.name} (${result.role})`);
      console.log(`   Email: ${result.email}`);
      console.log(`   Link:  ${result.signupUrl}`);
      console.log('');
    });
  }

  if (failed.length > 0) {
    console.log('❌ FAILED USERS:\n');
    console.log('─'.repeat(80) + '\n');

    failed.forEach((result) => {
      console.log(`• ${result.name} (${result.email})`);
      console.log(`  Error: ${result.error}\n`);
    });
  }

  console.log('─'.repeat(80));
  console.log('💡 Next Steps:');
  console.log('1. Copy the signup links above');
  console.log('2. Share each link with the respective user');
  console.log('3. Users click link → Set password → Auto-logged in!');
  console.log('4. Check /support/users page to see them as "Pending"');
  console.log('5. After signup, they become "Active"');
  console.log('─'.repeat(80) + '\n');

  console.log('✨ Batch onboarding complete!\n');
}

main().catch(console.error);
