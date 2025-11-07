#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function checkSatishToken() {
  try {
    console.log('\n🔍 Checking Satish Boini signup token...\n');

    // Check for Satish's signup token
    const { data: tokens, error: tokenError } = await supabase
      .from('signup_tokens')
      .select('*')
      .eq('email', 'satish.boini@mordorintelligence.com');

    if (tokenError) {
      console.error('❌ Error fetching token:', tokenError);
      return;
    }

    if (!tokens || tokens.length === 0) {
      console.log('❌ No signup token found for satish.boini@mordorintelligence.com');
      return;
    }

    console.log(`Found ${tokens.length} token(s):\n`);

    tokens.forEach((token, index) => {
      console.log(`Token ${index + 1}:`);
      console.log(`  Email: ${token.email}`);
      console.log(`  Token: ${token.token}`);
      console.log(`  Created: ${token.created_at}`);
      console.log(`  Expires: ${token.expires_at}`);
      console.log(`  Used at: ${token.used_at || 'Not used yet'}`);

      const now = new Date();
      const expiresAt = new Date(token.expires_at);
      const isExpired = expiresAt < now;
      const isUsed = token.used_at !== null;

      console.log(`  Status: ${isUsed ? '❌ USED' : isExpired ? '⚠️  EXPIRED' : '✅ VALID'}`);

      if (!isUsed && !isExpired) {
        const signupLink = `https://myra-status-dashboard.vercel.app/support/signup?token=${token.token}`;
        console.log(`  \n  ✅ Valid signup link:\n  ${signupLink}\n`);
      } else if (isExpired && !isUsed) {
        console.log(`  \n  ⚠️  Token expired on ${expiresAt.toLocaleDateString()}`);
        console.log(`  Need to generate a new token!\n`);
      } else if (isUsed) {
        console.log(`  \n  ❌ Token already used on ${new Date(token.used_at).toLocaleString()}\n`);
      }
    });

    // Check if user account exists
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) {
      console.error('❌ Error listing users:', userError);
      return;
    }

    const satishUser = users.users.find(u => u.email?.toLowerCase() === 'satish.boini@mordorintelligence.com');

    if (satishUser) {
      console.log('\n👤 User Account Status:');
      console.log(`  ✅ Account exists: ${satishUser.email}`);
      console.log(`  ID: ${satishUser.id}`);
      console.log(`  Created: ${satishUser.created_at}`);
      console.log(`  Last sign in: ${satishUser.last_sign_in_at || 'Never'}`);
    } else {
      console.log('\n👤 User Account Status:');
      console.log('  ❌ No account found - user needs to complete signup\n');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

checkSatishToken();
