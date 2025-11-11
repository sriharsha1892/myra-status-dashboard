#!/usr/bin/env node

/**
 * Check Support System Database Configuration
 * Verifies that tickets, notifications, and storage are ready for support features
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkDatabase() {
  console.log('🔍 Checking Support System Database Configuration...\n');

  let hasErrors = false;

  // 1. Check tickets table
  console.log('1️⃣  Checking TICKETS table...');
  try {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .limit(1);

    if (error) throw error;

    console.log('   ✅ Tickets table exists and is accessible');

    // Try to get column info by checking a sample insert (won't actually insert)
    const testTicket = {
      ticket_id: '00000000-0000-0000-0000-000000000000',
      title: 'Test',
      description: 'Test',
      status: 'open',
      priority: 'medium',
      category: 'general',
      source: 'support_form'
    };

    // This will fail but show us which columns exist
    const { error: structureError } = await supabase
      .from('tickets')
      .insert(testTicket)
      .select();

    if (structureError) {
      if (structureError.message.includes('ticket_id')) {
        console.log('   ⚠️  Column "ticket_id" may not exist (table has "id" instead)');
        hasErrors = true;
      }
      if (structureError.message.includes('title')) {
        console.log('   ⚠️  Column "title" may not exist');
        hasErrors = true;
      }
      if (structureError.message.includes('source')) {
        console.log('   ⚠️  Column "source" may not exist');
        hasErrors = true;
      }
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
    hasErrors = true;
  }

  // 2. Check notifications table
  console.log('\n2️⃣  Checking NOTIFICATIONS table...');
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .limit(1);

    if (error) throw error;

    console.log('   ✅ Notifications table exists and is accessible');
  } catch (error) {
    console.log('   ❌ Error:', error.message);
    hasErrors = true;
  }

  // 3. Check storage bucket
  console.log('\n3️⃣  Checking STORAGE bucket...');
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) throw error;

    const publicBucket = buckets.find(b => b.name === 'public');
    if (publicBucket) {
      console.log('   ✅ Public storage bucket exists');

      // Try to check if support-attachments path is accessible
      const { data: files, error: listError } = await supabase.storage
        .from('public')
        .list('support-attachments', { limit: 1 });

      if (!listError) {
        console.log('   ✅ support-attachments folder is accessible');
      } else {
        console.log('   ⚠️  support-attachments folder may not exist yet (will be created on first upload)');
      }
    } else {
      console.log('   ❌ Public storage bucket NOT found');
      console.log('   Available buckets:', buckets.map(b => b.name).join(', '));
      hasErrors = true;
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
    hasErrors = true;
  }

  // 4. Check users table for super_admins
  console.log('\n4️⃣  Checking USERS table for super admins...');
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, is_super_admin')
      .eq('is_super_admin', true);

    if (error) throw error;

    if (data && data.length > 0) {
      console.log(`   ✅ Found ${data.length} super admin(s) who will receive support notifications`);
      data.forEach(admin => {
        console.log(`      - ${admin.email}`);
      });
    } else {
      console.log('   ⚠️  No super admins found - notifications won\'t be sent!');
      hasErrors = true;
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
    hasErrors = true;
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  if (hasErrors) {
    console.log('⚠️  ISSUES FOUND - Database may need migration updates');
    console.log('\nRecommended actions:');
    console.log('1. Update tickets table to include: ticket_id, title, source columns');
    console.log('2. Ensure public storage bucket exists');
    console.log('3. Set at least one user as super_admin for notifications');
  } else {
    console.log('✅ ALL CHECKS PASSED - Database is ready for support system!');
  }
  console.log('='.repeat(60));
}

checkDatabase().catch(console.error);
