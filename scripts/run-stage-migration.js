#!/usr/bin/env node
/**
 * Run migration: Update current_stage values for trial_users
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

async function runMigration() {
  console.log('\n📝 Running current_stage migration to new taxonomy...\n');
  console.log('New stages: invited | low_activity | active | power_user | dormant\n');

  try {
    let totalUpdated = 0;

    // Count and update 'registered' → 'low_activity'
    const { count: registeredCount } = await supabase
      .from('trial_users')
      .select('*', { count: 'exact', head: true })
      .eq('current_stage', 'registered');

    if (registeredCount > 0) {
      const { error } = await supabase
        .from('trial_users')
        .update({ current_stage: 'low_activity' })
        .eq('current_stage', 'registered');

      if (error) throw error;
      console.log(`✅ Updated ${registeredCount} users: 'registered' → 'low_activity'`);
      totalUpdated += registeredCount;
    }

    // Count and update 'exploring' → 'low_activity'
    const { count: exploringCount } = await supabase
      .from('trial_users')
      .select('*', { count: 'exact', head: true })
      .eq('current_stage', 'exploring');

    if (exploringCount > 0) {
      const { error } = await supabase
        .from('trial_users')
        .update({ current_stage: 'low_activity' })
        .eq('current_stage', 'exploring');

      if (error) throw error;
      console.log(`✅ Updated ${exploringCount} users: 'exploring' → 'low_activity'`);
      totalUpdated += exploringCount;
    }

    // Count and update 'onboarding' → 'low_activity'
    const { count: onboardingCount } = await supabase
      .from('trial_users')
      .select('*', { count: 'exact', head: true })
      .eq('current_stage', 'onboarding');

    if (onboardingCount > 0) {
      const { error } = await supabase
        .from('trial_users')
        .update({ current_stage: 'low_activity' })
        .eq('current_stage', 'onboarding');

      if (error) throw error;
      console.log(`✅ Updated ${onboardingCount} users: 'onboarding' → 'low_activity'`);
      totalUpdated += onboardingCount;
    }

    // Count and update 'inactive' → 'dormant'
    const { count: inactiveCount } = await supabase
      .from('trial_users')
      .select('*', { count: 'exact', head: true })
      .eq('current_stage', 'inactive');

    if (inactiveCount > 0) {
      const { error } = await supabase
        .from('trial_users')
        .update({ current_stage: 'dormant' })
        .eq('current_stage', 'inactive');

      if (error) throw error;
      console.log(`✅ Updated ${inactiveCount} users: 'inactive' → 'dormant'`);
      totalUpdated += inactiveCount;
    }

    console.log(`\n📊 Total users updated: ${totalUpdated}`);
    console.log(`\n📊 Current stage distribution:`);

    // Get all stage counts
    const stages = ['invited', 'low_activity', 'active', 'power_user', 'dormant'];
    for (const stage of stages) {
      const { count } = await supabase
        .from('trial_users')
        .select('*', { count: 'exact', head: true })
        .eq('current_stage', stage);

      if (count > 0) {
        console.log(`   ${stage}: ${count} users`);
      }
    }

    console.log('\n✅ Migration complete!\n');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
