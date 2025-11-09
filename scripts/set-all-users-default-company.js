#!/usr/bin/env node
/**
 * Set all users without parent_company to Mordor Intelligence (default)
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setDefaultCompany() {
  console.log('\n🔧 Setting default parent_company for all users...\n');

  try {
    const { data, error } = await supabase.auth.admin.listUsers();

    if (error) {
      console.error('❌ Error fetching users:', error.message);
      process.exit(1);
    }

    let updatedCount = 0;
    let alreadySetCount = 0;

    for (const user of data.users) {
      const hasCompany = user.user_metadata?.parent_company;

      if (hasCompany) {
        alreadySetCount++;
        continue;
      }

      console.log(`📋 Updating ${user.user_metadata?.name || user.email || 'Unknown'}`);
      console.log(`   Email: ${user.email}`);

      const { error: updateError } = await supabase.auth.admin.updateUserById(
        user.id,
        {
          user_metadata: {
            ...user.user_metadata,
            parent_company: 'Mordor Intelligence'
          }
        }
      );

      if (updateError) {
        console.error(`   ❌ Error: ${updateError.message}`);
      } else {
        console.log(`   ✅ Set to Mordor Intelligence\n`);
        updatedCount++;
      }
    }

    console.log('═══════════════════════════════════════\n');
    console.log(`✅ Updated: ${updatedCount} user(s)`);
    console.log(`⏭️  Already set: ${alreadySetCount} user(s)`);
    console.log(`📊 Total users: ${data.users.length}\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

setDefaultCompany();
