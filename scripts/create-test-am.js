#!/usr/bin/env node

/**
 * Create Test Account Manager Script
 *
 * Creates test users for comprehensive Account Manager testing:
 * - Test AM in Mordor Intelligence (primary test user)
 * - Test AM in GMI (for cross-company isolation testing)
 * - Test Super Admin (for permission comparison)
 * - Test Viewer (for permission boundary testing)
 *
 * Usage:
 *   node scripts/create-test-am.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  }
});

async function createTestUsers() {
  console.log('🎯 Creating Test Account Manager Users\n');

  const testUsers = [
    {
      email: 'test-am-mordor@myra.ai',
      password: 'TestAM@Mordor2025!',
      full_name: 'Test AM Mordor',
      role: 'Account Manager',
      parent_company: 'Mordor Intelligence',
      is_super_admin: false,
      description: 'Primary test Account Manager in Mordor Intelligence'
    },
    {
      email: 'test-am-gmi@myra.ai',
      password: 'TestAM@GMI2025!',
      full_name: 'Test AM GMI',
      role: 'Account Manager',
      parent_company: 'GMI',
      is_super_admin: false,
      description: 'Test Account Manager in GMI for cross-company isolation'
    },
    {
      email: 'test-superadmin@myra.ai',
      password: 'TestSuper@2025!',
      full_name: 'Test Super Admin',
      role: 'Admin',
      parent_company: 'Mordor Intelligence',
      is_super_admin: true,
      description: 'Test Super Admin for permission comparison'
    },
    {
      email: 'test-viewer@myra.ai',
      password: 'TestViewer@2025!',
      full_name: 'Test Viewer',
      role: 'Viewer',
      parent_company: 'Mordor Intelligence',
      is_super_admin: false,
      description: 'Test Viewer for permission boundary testing'
    }
  ];

  const createdUsers = [];
  const errors = [];

  for (const user of testUsers) {
    console.log(`📋 Processing: ${user.email}`);

    try {
      // 1. Check if user already exists in users table
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', user.email)
        .single();

      if (existingUser) {
        console.log(`   ⚠️  User already exists, updating...`);

        // Update existing user
        const passwordHash = await bcrypt.hash(user.password, 10);

        const { data: updatedUser, error: updateError } = await supabase
          .from('users')
          .update({
            full_name: user.full_name,
            role: user.role,
            parent_company: user.parent_company,
            is_super_admin: user.is_super_admin,
            password_hash: passwordHash,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingUser.id)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        createdUsers.push({
          ...user,
          status: 'updated',
          id: updatedUser.id
        });

        console.log(`   ✓ Updated existing user\n`);
        continue;
      }

      // 2. Create new user in auth.users
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          full_name: user.full_name,
          role: user.role
        }
      });

      if (authError) {
        // Check if user exists in auth but not in users table
        if (authError.message?.includes('already registered')) {
          console.log(`   ℹ️  Auth user exists, syncing to users table...`);

          // Get auth user
          const { data: { users: authUsers } } = await supabase.auth.admin.listUsers();
          const existingAuthUser = authUsers?.find(u => u.email === user.email);

          if (existingAuthUser) {
            // Create in users table
            const passwordHash = await bcrypt.hash(user.password, 10);

            const { data: newUser, error: insertError } = await supabase
              .from('users')
              .insert({
                id: existingAuthUser.id,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
                parent_company: user.parent_company,
                is_super_admin: user.is_super_admin,
                password_hash: passwordHash
              })
              .select()
              .single();

            if (insertError) {
              throw insertError;
            }

            createdUsers.push({
              ...user,
              status: 'synced',
              id: newUser.id
            });

            console.log(`   ✓ Synced auth user to users table\n`);
            continue;
          }
        }
        throw authError;
      }

      // 3. Create user in users table
      const passwordHash = await bcrypt.hash(user.password, 10);

      const { data: newUser, error: dbError } = await supabase
        .from('users')
        .insert({
          id: authUser.user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          parent_company: user.parent_company,
          is_super_admin: user.is_super_admin,
          password_hash: passwordHash
        })
        .select()
        .single();

      if (dbError) {
        throw dbError;
      }

      createdUsers.push({
        ...user,
        status: 'created',
        id: newUser.id
      });

      console.log(`   ✓ Created new user\n`);

    } catch (error) {
      console.error(`   ❌ Error: ${error.message}\n`);
      errors.push({
        user: user.email,
        error: error.message
      });
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY\n');

  if (createdUsers.length > 0) {
    console.log('✅ Successfully processed users:\n');
    createdUsers.forEach(user => {
      console.log(`   ${user.status === 'created' ? '🆕' : user.status === 'updated' ? '♻️' : '🔄'} ${user.email}`);
      console.log(`      Password: ${user.password}`);
      console.log(`      Role: ${user.role}`);
      console.log(`      Company: ${user.parent_company}`);
      console.log(`      Super Admin: ${user.is_super_admin ? 'Yes' : 'No'}`);
      console.log(`      Purpose: ${user.description}`);
      console.log('');
    });
  }

  if (errors.length > 0) {
    console.log('❌ Failed users:\n');
    errors.forEach(err => {
      console.log(`   ${err.user}: ${err.error}`);
    });
  }

  // Testing instructions
  console.log('='.repeat(60));
  console.log('\n📝 TESTING INSTRUCTIONS\n');
  console.log('1. Primary Test User (Account Manager):');
  console.log('   Email: test-am-mordor@myra.ai');
  console.log('   Password: TestAM@Mordor2025!');
  console.log('   Use this for: Main workflow testing\n');

  console.log('2. Cross-Company Test:');
  console.log('   Email: test-am-gmi@myra.ai');
  console.log('   Password: TestAM@GMI2025!');
  console.log('   Use this for: Verify RLS isolation (should NOT see Mordor data)\n');

  console.log('3. Super Admin Test:');
  console.log('   Email: test-superadmin@myra.ai');
  console.log('   Password: TestSuper@2025!');
  console.log('   Use this for: Verify super admin can see ALL companies\n');

  console.log('4. Permission Boundary Test:');
  console.log('   Email: test-viewer@myra.ai');
  console.log('   Password: TestViewer@2025!');
  console.log('   Use this for: Verify viewers cannot access AM features\n');

  console.log('To run automated tests:');
  console.log('   npx playwright test e2e/account-manager-workflows.spec.ts');
  console.log('');
}

// Create test organizations for testing
async function createTestOrganizations() {
  console.log('='.repeat(60));
  console.log('\n🏢 Creating Test Organizations\n');

  const testOrgs = [
    {
      org_name: 'TEST-AM-Mordor-Org-1',
      parent_company: 'Mordor Intelligence',
      domain: 'TMT',
      website_url: 'https://test-mordor-1.com',
      org_lifecycle_stage: 'trial_active',
      trial_start_date: new Date().toISOString().split('T')[0],
      trial_end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      contract_value: 50000,
      team_size: 25,
      trial_duration_days: 14
    },
    {
      org_name: 'TEST-AM-GMI-Org-1',
      parent_company: 'GMI',
      domain: 'NEO',
      website_url: 'https://test-gmi-1.com',
      org_lifecycle_stage: 'trial_active',
      trial_start_date: new Date().toISOString().split('T')[0],
      trial_end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      contract_value: 75000,
      team_size: 40,
      trial_duration_days: 14
    }
  ];

  for (const org of testOrgs) {
    try {
      // Check if org exists
      const { data: existing } = await supabase
        .from('trial_organizations')
        .select('org_id')
        .eq('org_name', org.org_name)
        .single();

      if (existing) {
        console.log(`   ⚠️  ${org.org_name} already exists`);
        continue;
      }

      // Get account manager for this company
      const { data: accountManager } = await supabase
        .from('users')
        .select('id')
        .eq('email', org.parent_company === 'GMI' ? 'test-am-gmi@myra.ai' : 'test-am-mordor@myra.ai')
        .single();

      if (accountManager) {
        org.account_manager = accountManager.id;
      }

      // Create organization
      const { data: newOrg, error } = await supabase
        .from('trial_organizations')
        .insert(org)
        .select()
        .single();

      if (error) throw error;

      console.log(`   ✓ Created ${org.org_name}`);

      // Add a test user to the organization
      const testUser = {
        org_id: newOrg.org_id,
        name: `Test User ${org.parent_company}`,
        email: `testuser@${org.website_url.replace('https://', '')}`,
        designation: 'VP Engineering',
        account_manager: org.account_manager,
        current_stage: 'invited',
        is_primary_contact: true
      };

      const { error: userError } = await supabase
        .from('trial_users')
        .insert(testUser);

      if (userError) {
        console.log(`      ⚠️  Could not add user: ${userError.message}`);
      } else {
        console.log(`      ✓ Added test user`);
      }

    } catch (error) {
      console.error(`   ❌ Error creating ${org.org_name}: ${error.message}`);
    }
  }

  console.log('');
}

// Main execution
async function main() {
  console.log('🚀 Test Account Manager Setup Script\n');
  console.log('Environment:');
  console.log(`   URL: ${supabaseUrl}`);
  console.log(`   Service Key: ${supabaseServiceKey ? '✓ Present' : '✗ Missing'}\n`);

  await createTestUsers();
  await createTestOrganizations();

  console.log('='.repeat(60));
  console.log('\n✅ Setup Complete!\n');
  console.log('Next steps:');
  console.log('1. Test manual login at http://localhost:3000/support/login');
  console.log('2. Run automated tests: npx playwright test e2e/account-manager-workflows.spec.ts');
  console.log('3. Clean up when done: node scripts/cleanup-am-test-data.js\n');
}

// Run the script
main().catch(error => {
  console.error('❌ Fatal error:', error.message);
  process.exit(1);
});