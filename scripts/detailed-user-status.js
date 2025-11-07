#!/usr/bin/env node
/**
 * Show detailed status of all users including login activity
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function showDetailedUserStatus() {
  console.log('\n📊 DETAILED USER STATUS REPORT\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data, error } = await supabaseAdmin.auth.admin.listUsers();

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  const users = data.users;

  // Sort by email for readability
  users.sort((a, b) => a.email.localeCompare(b.email));

  console.log(`Total Users: ${users.length}\n`);

  // Categorize users
  const loggedInUsers = users.filter(u => u.last_sign_in_at);
  const neverLoggedIn = users.filter(u => !u.last_sign_in_at);
  const confirmedEmails = users.filter(u => u.email_confirmed_at);
  const unconfirmedEmails = users.filter(u => !u.email_confirmed_at);

  console.log('📈 SUMMARY STATISTICS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Users who have logged in:     ${loggedInUsers.length} / ${users.length}`);
  console.log(`❌ Users who never logged in:    ${neverLoggedIn.length} / ${users.length}`);
  console.log(`✅ Email confirmed:               ${confirmedEmails.length} / ${users.length}`);
  console.log(`⚠️  Email not confirmed:          ${unconfirmedEmails.length} / ${users.length}`);
  console.log('');

  // Breakdown by role
  console.log('👥 BY ROLE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const roleBreakdown = {};
  users.forEach(u => {
    const role = u.user_metadata?.role || 'No Role';
    if (!roleBreakdown[role]) {
      roleBreakdown[role] = { total: 0, loggedIn: 0 };
    }
    roleBreakdown[role].total++;
    if (u.last_sign_in_at) {
      roleBreakdown[role].loggedIn++;
    }
  });

  Object.keys(roleBreakdown).sort().forEach(role => {
    const { total, loggedIn } = roleBreakdown[role];
    console.log(`${role}: ${loggedIn}/${total} logged in`);
  });
  console.log('');

  // Detailed user list
  console.log('📋 DETAILED USER LIST');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  users.forEach((user, index) => {
    const role = user.user_metadata?.role || 'No Role';
    const name = user.user_metadata?.name || user.email.split('@')[0];
    const confirmed = user.email_confirmed_at ? '✅' : '❌';
    const lastLogin = user.last_sign_in_at
      ? new Date(user.last_sign_in_at).toLocaleString()
      : '❌ Never logged in';

    console.log(`${index + 1}. ${name} (${user.email})`);
    console.log(`   Role:           ${role}`);
    console.log(`   Email Verified: ${confirmed}`);
    console.log(`   Last Login:     ${lastLogin}`);
    console.log(`   Created:        ${new Date(user.created_at).toLocaleString()}`);
    console.log('');
  });

  // Users who never logged in
  if (neverLoggedIn.length > 0) {
    console.log('⚠️  USERS WHO NEVER LOGGED IN');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    neverLoggedIn.forEach(u => {
      const name = u.user_metadata?.name || u.email.split('@')[0];
      const daysSinceCreated = Math.floor((Date.now() - new Date(u.created_at)) / (1000 * 60 * 60 * 24));
      console.log(`• ${name} (${u.email}) - Created ${daysSinceCreated} days ago`);
    });
    console.log('');
  }

  // Recent logins (last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentLogins = users.filter(u =>
    u.last_sign_in_at && new Date(u.last_sign_in_at) > sevenDaysAgo
  );

  if (recentLogins.length > 0) {
    console.log('🔥 ACTIVE USERS (Last 7 Days)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    recentLogins
      .sort((a, b) => new Date(b.last_sign_in_at) - new Date(a.last_sign_in_at))
      .forEach(u => {
        const name = u.user_metadata?.name || u.email.split('@')[0];
        const lastLogin = new Date(u.last_sign_in_at).toLocaleString();
        console.log(`• ${name} - ${lastLogin}`);
      });
    console.log('');
  } else {
    console.log('⚠️  NO ACTIVE USERS IN LAST 7 DAYS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('END OF REPORT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

showDetailedUserStatus();
