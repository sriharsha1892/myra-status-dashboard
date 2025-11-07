#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function regenerateToken() {
  try {
    const email = 'satish.boini@mordorintelligence.com';

    console.log('\n🔄 Regenerating signup token for Satish...\n');

    // First, check existing token(s)
    const { data: existingTokens, error: fetchError } = await supabase
      .from('signup_tokens')
      .select('*')
      .eq('email', email);

    if (fetchError) {
      console.error('❌ Error fetching tokens:', fetchError);
      return;
    }

    console.log(`Found ${existingTokens?.length || 0} existing token(s)`);

    // Delete old tokens for this email
    if (existingTokens && existingTokens.length > 0) {
      const { error: deleteError } = await supabase
        .from('signup_tokens')
        .delete()
        .eq('email', email);

      if (deleteError) {
        console.error('❌ Error deleting old tokens:', deleteError);
        return;
      }
      console.log('✅ Deleted old tokens');
    }

    // Generate new token
    const newToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    // Insert new token
    const { data: insertedToken, error: insertError } = await supabase
      .from('signup_tokens')
      .insert({
        email,
        token: newToken,
        expires_at: expiresAt.toISOString(),
        used: false
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error creating token:', insertError);
      console.error('Details:', insertError.details);
      console.error('Hint:', insertError.hint);
      return;
    }

    console.log('\n✅ New token generated successfully!\n');
    console.log('📧 Email:', email);
    console.log('🔑 Token:', newToken);
    console.log('📅 Expires:', expiresAt.toLocaleString());
    console.log('\n🔗 Production Signup Link:');
    console.log(`https://myra-status-dashboard.vercel.app/support/signup?token=${newToken}`);
    console.log('\n🔗 Local Test Link:');
    console.log(`http://localhost:3000/support/signup?token=${newToken}`);
    console.log('\n✨ Share this link with Satish!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code) console.error('Code:', error.code);
    if (error.details) console.error('Details:', error.details);
  }
}

regenerateToken();
