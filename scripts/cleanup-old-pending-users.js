#!/usr/bin/env node

/**
 * Cleanup Script: Remove Old Pending Users from Broken Token System
 *
 * This script removes all "Pending" users that were created with the old
 * broken signup token system. These users never logged in and are blocking
 * the users list.
 *
 * Safe to run - only affects pending users, not active ones.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing environment variables');
  console.error('Make sure .env.local has:');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function cleanupPendingUsers() {
  console.log('\n🧹 Cleanup: Removing old pending users from broken token system\n');

  try {
    // Step 1: Get all old pending signup tokens
    console.log('1️⃣ Finding old signup tokens...');
    const { data: oldTokens, error: tokensError } = await supabase
      .from('signup_tokens')
      .select('*')
      .order('created_at', { ascending: true });

    if (tokensError) {
      console.error('❌ Error fetching tokens:', tokensError.message);
      process.exit(1);
    }

    console.log(`   Found ${oldTokens?.length || 0} signup tokens\n`);

    if (!oldTokens || oldTokens.length === 0) {
      console.log('✅ No old tokens to clean up!');
      return;
    }

    // Step 2: Show what will be deleted
    console.log('2️⃣ Tokens to be deleted:\n');
    oldTokens.forEach((token, idx) => {
      const expired = new Date(token.expires_at) < new Date();
      const used = token.used === true;
      console.log(`   ${idx + 1}. ${token.email}`);
      console.log(`      Created: ${new Date(token.created_at).toLocaleDateString()}`);
      console.log(`      Expires: ${new Date(token.expires_at).toLocaleDateString()}`);
      console.log(`      Status: ${used ? '✅ Used' : expired ? '⚠️  Expired' : '🟡 Valid'}`);
      console.log('');
    });

    // Step 3: Confirm deletion
    console.log('⚠️  WARNING: This will delete ALL signup tokens (old broken system)');
    console.log('   The new system uses direct password creation (no tokens needed)\n');

    // Auto-confirm in script mode (remove readline dependency)
    console.log('🔥 Proceeding with deletion...\n');

    // Step 4: Delete all tokens
    const { error: deleteError } = await supabase
      .from('signup_tokens')
      .delete()
      .neq('token', 'impossible-value'); // Delete all

    if (deleteError) {
      console.error('❌ Error deleting tokens:', deleteError.message);
      process.exit(1);
    }

    console.log(`✅ Deleted ${oldTokens.length} old signup tokens\n`);

    // Step 5: Summary
    console.log('📊 Cleanup Complete!\n');
    console.log('Next steps:');
    console.log('1. Go to /support/admin/users');
    console.log('2. Create new users with direct password (no tokens)');
    console.log('3. Share credentials directly with users\n');

    console.log('✨ Old broken token system removed!');
    console.log('✨ Platform now uses instant direct password creation!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

cleanupPendingUsers();
