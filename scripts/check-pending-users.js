#!/usr/bin/env node

/**
 * Debug script to check pending signup tokens
 * Usage: node scripts/check-pending-users.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkPendingUsers() {
  console.log('\n🔍 Checking Pending Signup Tokens...\n');

  try {
    // Get all signup tokens
    const { data: allTokens, error: allError } = await supabase
      .from('signup_tokens')
      .select('*')
      .order('created_at', { ascending: false });

    if (allError) {
      console.error('❌ Error fetching tokens:', allError.message);
      return;
    }

    console.log(`📊 Total Signup Tokens: ${allTokens.length}\n`);

    // Get active users
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      console.error('❌ Error fetching users:', usersError.message);
      return;
    }

    console.log(`👥 Active Users: ${users.length}\n`);

    // Check unused, non-expired tokens
    const now = new Date();
    const pendingTokens = allTokens.filter(token =>
      !token.used_at && new Date(token.expires_at) > now
    );

    console.log(`⏳ Pending (Unused & Not Expired): ${pendingTokens.length}\n`);

    if (pendingTokens.length > 0) {
      console.log('📋 Pending Users:\n');
      pendingTokens.forEach((token, idx) => {
        const daysUntilExpiry = Math.ceil(
          (new Date(token.expires_at) - now) / (1000 * 60 * 60 * 24)
        );
        console.log(`${idx + 1}. ${token.email}`);
        console.log(`   Role: ${token.user_role}`);
        console.log(`   Created: ${new Date(token.created_at).toLocaleString()}`);
        console.log(`   Expires in: ${daysUntilExpiry} days`);
        console.log(`   Token: ${token.token.substring(0, 8)}...`);
        console.log();
      });
    } else {
      console.log('✅ No pending users found\n');
    }

    // Check used tokens
    const usedTokens = allTokens.filter(token => token.used_at);
    console.log(`✅ Completed Signups: ${usedTokens.length}\n`);

    if (usedTokens.length > 0) {
      console.log('📋 Completed Users:\n');
      usedTokens.forEach((token, idx) => {
        console.log(`${idx + 1}. ${token.email} (used on ${new Date(token.used_at).toLocaleString()})`);
      });
      console.log();
    }

    // Check expired tokens
    const expiredTokens = allTokens.filter(token =>
      !token.used_at && new Date(token.expires_at) <= now
    );

    if (expiredTokens.length > 0) {
      console.log(`⚠️  Expired (Unused): ${expiredTokens.length}\n`);
      expiredTokens.forEach((token, idx) => {
        console.log(`${idx + 1}. ${token.email} - expired ${Math.abs(Math.ceil((new Date(token.expires_at) - now) / (1000 * 60 * 60 * 24)))} days ago`);
      });
      console.log();
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkPendingUsers();
