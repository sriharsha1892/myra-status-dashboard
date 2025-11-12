#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkAccessRoles() {
  console.log('Checking user roles and access patterns...\n');

  // Get all unique roles
  const { data: users, error } = await supabase
    .from('users')
    .select('id, full_name, email, role, is_super_admin')
    .order('role');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Total users: ${users.length}\n`);

  // Group by role
  const roleGroups = {};
  users.forEach(user => {
    const role = user.role || 'No Role';
    if (!roleGroups[role]) roleGroups[role] = [];
    roleGroups[role].push(user);
  });

  console.log('═'.repeat(100));
  console.log('USER ROLES BREAKDOWN:');
  console.log('═'.repeat(100));

  Object.entries(roleGroups).forEach(([role, userList]) => {
    const superAdmins = userList.filter(u => u.is_super_admin).length;
    console.log(`\n${role}: ${userList.length} users ${superAdmins > 0 ? `(${superAdmins} super admins)` : ''}`);
    userList.forEach(user => {
      const superAdminTag = user.is_super_admin ? ' [SUPER ADMIN]' : '';
      console.log(`   • ${user.full_name || user.email}${superAdminTag}`);
    });
  });
}

checkAccessRoles().catch(console.error);
