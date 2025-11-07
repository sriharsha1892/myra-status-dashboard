/**
 * Add Demo Users to Trial Organizations
 *
 * This script adds sample users to trial organizations for testing
 * the user management features.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

async function addDemoUsers() {
  try {
    console.log('🎯 Adding demo users to trial organizations...\n');

    // 1. Get first trial organization
    const { data: orgs, error: orgError } = await supabase
      .from('trial_organizations')
      .select('org_id, org_name, account_manager')
      .limit(3);

    if (orgError) throw orgError;

    if (!orgs || orgs.length === 0) {
      console.log('❌ No trial organizations found. Please create organizations first.');
      return;
    }

    console.log(`✅ Found ${orgs.length} trial organizations\n`);

    // Demo users templates
    const userTemplates = [
      {
        name: 'Sarah Johnson',
        email: 'sarah.johnson@company.com',
        role: 'Product Manager',
        phone: '+1 (555) 123-4567',
        current_stage: 'active',
      },
      {
        name: 'Michael Chen',
        email: 'michael.chen@company.com',
        role: 'Engineering Lead',
        phone: '+1 (555) 234-5678',
        current_stage: 'engaged',
      },
      {
        name: 'Emily Rodriguez',
        email: 'emily.r@company.com',
        role: 'Data Analyst',
        phone: '+1 (555) 345-6789',
        current_stage: 'onboarding',
      },
      {
        name: 'David Kim',
        email: 'david.kim@company.com',
        role: 'UX Designer',
        phone: '+1 (555) 456-7890',
        current_stage: 'invited',
      },
    ];

    // Add users to each organization
    for (const org of orgs) {
      console.log(`📋 Adding users to ${org.org_name}...`);

      // Add 2-3 random users per org
      const numUsers = Math.floor(Math.random() * 2) + 2; // 2 or 3 users
      const selectedUsers = userTemplates
        .sort(() => 0.5 - Math.random())
        .slice(0, numUsers);

      for (const userTemplate of selectedUsers) {
        // Make email unique per org
        const uniqueEmail = userTemplate.email.replace('@', `+${org.org_id.substring(0, 4)}@`);

        const userData = {
          org_id: org.org_id,
          name: userTemplate.name,
          email: uniqueEmail,
          role: userTemplate.role,
          phone: userTemplate.phone,
          current_stage: userTemplate.current_stage,
          account_manager: org.account_manager || 'Unassigned',
          invited_at: new Date().toISOString(),
        };

        // Check if user already exists
        const { data: existing } = await supabase
          .from('trial_users')
          .select('user_id')
          .eq('org_id', org.org_id)
          .eq('email', uniqueEmail)
          .single();

        if (existing) {
          console.log(`   ⚠️  ${userTemplate.name} already exists, skipping...`);
          continue;
        }

        // Insert user
        const { data: newUser, error: userError } = await supabase
          .from('trial_users')
          .insert(userData)
          .select()
          .single();

        if (userError) {
          console.error(`   ❌ Failed to add ${userTemplate.name}:`, userError.message);
          continue;
        }

        console.log(`   ✅ Added ${newUser.name} (${newUser.current_stage})`);
      }

      console.log('');
    }

    // Show summary
    const { data: allUsers, error: countError } = await supabase
      .from('trial_users')
      .select('user_id, name, current_stage, trial_organizations(org_name)')
      .order('created_at', { ascending: false })
      .limit(20);

    if (countError) throw countError;

    console.log('🎉 Demo users added successfully!\n');
    console.log('📊 Summary:');
    console.log(`   Total users created: ${allUsers?.length || 0}\n`);

    console.log('👥 Recent users:');
    allUsers?.slice(0, 10).forEach((user) => {
      const orgName = user.trial_organizations?.org_name || 'Unknown Org';
      console.log(`   • ${user.name} at ${orgName} (${user.current_stage})`);
    });

    console.log('\n📝 Next Steps:');
    console.log('1. Visit any trial organization detail page');
    console.log('2. Check the "Users" section in the Overview tab');
    console.log('3. Try editing users, changing their stage, or adding more users');
    console.log('4. Users are now linked to activities and engagement tracking');

  } catch (error) {
    console.error('❌ Error adding demo users:', error.message);
    if (error.details) console.error('Details:', error.details);
    if (error.hint) console.error('Hint:', error.hint);
  }
}

addDemoUsers();
