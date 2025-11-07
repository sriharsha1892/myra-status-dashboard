#!/usr/bin/env node
/**
 * Add Sudeshana Jain as Account Manager
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function addSudeshana() {
  console.log('\n➕ Adding Sudeshana Jain as Account Manager...\n');

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

  const email = 'sudeshana@mordorintelligence.com';
  const password = 'Sudeshana123!'; // Strong temporary password
  const name = 'Sudeshana Jain';
  const role = 'Account Manager';

  // Check if user already exists
  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
  const existingUser = existingUsers.users.find(u => u.email === email);

  if (existingUser) {
    console.log('⚠️  User already exists!');
    console.log('Email:', existingUser.email);
    console.log('Name:', existingUser.user_metadata?.name);
    console.log('Role:', existingUser.user_metadata?.role);
    console.log('\nUpdating password instead...\n');

    // Update password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      existingUser.id,
      { password }
    );

    if (updateError) {
      console.error('❌ Error updating password:', updateError.message);
      return;
    }

    console.log('✅ Password updated!');
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:    sudeshana@mordorintelligence.com');
    console.log('🔑 Password: Sudeshana123!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    return;
  }

  // Create new user
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm email (no email required)
    user_metadata: {
      name,
      role,
    },
  });

  if (error) {
    console.error('❌ Error creating user:', error.message);
    return;
  }

  console.log('✅ User created successfully!\n');
  console.log('User ID:', data.user.id);
  console.log('Email:', data.user.email);
  console.log('Name:', name);
  console.log('Role:', role);
  console.log('Email Confirmed:', data.user.email_confirmed_at ? 'YES ✅' : 'NO ❌');
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📧 Email:    sudeshana@mordorintelligence.com');
  console.log('🔑 Password: Sudeshana123!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('🌐 Login at: https://myra-status-dashboard.vercel.app/support/login');
  console.log('');
}

addSudeshana();
