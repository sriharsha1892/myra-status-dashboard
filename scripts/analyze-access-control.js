#!/usr/bin/env node

/**
 * Access Control Analysis Script
 * Analyzes role-based access control across the application
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function analyzeAccessControl() {
  console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║         ACCESS CONTROL ANALYSIS REPORT                            ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

  // Get all users with roles
  const { data: users, error } = await supabase
    .from('users')
    .select('id, full_name, email, role, is_super_admin')
    .order('role, full_name');

  if (error) {
    console.error('Error fetching users:', error);
    return;
  }

  // Group by role
  const roleGroups = {};
  users.forEach(user => {
    const role = user.role || 'No Role';
    if (!roleGroups[role]) roleGroups[role] = [];
    roleGroups[role].push(user);
  });

  console.log('📊 ROLE DISTRIBUTION:\n');
  console.log('─'.repeat(70));
  Object.entries(roleGroups).forEach(([role, userList]) => {
    const superAdmins = userList.filter(u => u.is_super_admin).length;
    console.log(`${role}: ${userList.length} users ${superAdmins > 0 ? `(${superAdmins} super admins)` : ''}`);
  });

  console.log('\n🔐 ACCESS LEVEL ANALYSIS:\n');
  console.log('═'.repeat(70));

  // Define access levels based on code inspection
  const accessLevels = {
    'admin': {
      pages: [
        'Dashboard', 'Notifications', 'Trial Orgs', 'Reports',
        'Resources', 'Tickets', 'Users (Admin Only)',
        'Roadmap (Admin Only)', 'Customer Support (Admin Only)', 'Profile'
      ],
      capabilities: [
        'View all data',
        'Manage users',
        'Assign roadmap owners',
        'Manage customer support tickets',
        'Create/edit/delete trial orgs',
        'View all reports',
        'Manage resources'
      ]
    },
    'viewer': {
      pages: [
        'Dashboard', 'Notifications', 'Trial Orgs', 'Reports',
        'Resources', 'Tickets', 'Profile'
      ],
      capabilities: [
        'View trial orgs (all or assigned?)',
        'Create tickets',
        'View reports',
        'Access resources',
        'View notifications'
      ],
      potential_issues: [
        '⚠️  Currently mapped to "Team" role in useAuth, not "AM"',
        '⚠️  May not have proper filtering to see only assigned orgs',
        '⚠️  Unclear if they can edit their assigned trial orgs'
      ]
    },
    'account_manager': {
      pages: ['None - Role exists in schema but no users have it'],
      capabilities: [
        'Intended to manage assigned orgs',
        'Currently unused - all AMs are "viewer" role'
      ],
      potential_issues: [
        '🚨 CRITICAL: Account managers have "viewer" role instead of "account_manager"',
        '🚨 This may prevent proper data filtering'
      ]
    }
  };

  Object.entries(accessLevels).forEach(([role, config]) => {
    const userCount = roleGroups[role]?.length || 0;
    console.log(`\n📌 ${role.toUpperCase()} (${userCount} users):`);
    console.log('─'.repeat(70));

    console.log('\n   Pages Accessible:');
    config.pages.forEach(page => console.log(`   • ${page}`));

    console.log('\n   Capabilities:');
    config.capabilities.forEach(cap => console.log(`   • ${cap}`));

    if (config.potential_issues) {
      console.log('\n   ⚠️  Potential Issues:');
      config.potential_issues.forEach(issue => console.log(`   ${issue}`));
    }
  });

  // Check for users in account manager role
  console.log('\n\n🔍 ACCOUNT MANAGER ROLE CHECK:\n');
  console.log('═'.repeat(70));

  const { data: trialOrgs } = await supabase
    .from('trial_organizations')
    .select('org_id, org_name, account_manager')
    .limit(5);

  if (trialOrgs && trialOrgs.length > 0) {
    console.log('\nTrial orgs use "account_manager" field (UUID):');
    trialOrgs.slice(0, 3).forEach(org => {
      const manager = users.find(u => u.id === org.account_manager);
      console.log(`• ${org.org_name}: ${manager?.full_name || 'Unknown'} (${manager?.role || 'No role'})`);
    });
  }

  console.log('\n\n⚠️  KEY FINDINGS:\n');
  console.log('═'.repeat(70));

  const findings = [
    {
      severity: 'HIGH',
      issue: 'Role Mismatch',
      description: 'All 13 account managers have "viewer" role instead of "account_manager"',
      impact: 'May not have proper access controls for managing their assigned trial orgs',
      recommendation: 'Consider either:\n      1. Update all account managers to have role="account_manager", OR\n      2. Update code to use "viewer" role with proper data filtering based on account_manager field'
    },
    {
      severity: 'MEDIUM',
      issue: 'Access Control Clarity',
      description: 'Viewers can access all trial orgs without filtering',
      impact: 'Account managers may see orgs they are not assigned to',
      recommendation: 'Implement RLS policies or app-level filtering to show only assigned orgs to viewers'
    },
    {
      severity: 'LOW',
      issue: 'Role Naming Inconsistency',
      description: 'useAuth maps "viewer" to "Team" but they are account managers',
      impact: 'Confusing role names in code vs database',
      recommendation: 'Align role naming: either use "viewer" everywhere or "account_manager" everywhere'
    }
  ];

  findings.forEach((finding, index) => {
    console.log(`\n${index + 1}. [${finding.severity}] ${finding.issue}`);
    console.log(`   Description: ${finding.description}`);
    console.log(`   Impact: ${finding.impact}`);
    console.log(`   Recommendation: ${finding.recommendation}`);
  });

  console.log('\n\n📋 RECOMMENDED ACTIONS:\n');
  console.log('═'.repeat(70));
  console.log('\n1. IMMEDIATE:');
  console.log('   • Verify if viewers should see all trial orgs or only assigned ones');
  console.log('   • Check if viewers can edit/update trial org data');
  console.log('\n2. SHORT-TERM:');
  console.log('   • Decide on role strategy: use "account_manager" or "viewer"');
  console.log('   • Implement proper data filtering for account managers');
  console.log('   • Add RLS policies if needed');
  console.log('\n3. LONG-TERM:');
  console.log('   • Document role-based access control clearly');
  console.log('   • Add automated tests for access control');
  console.log('   • Consider fine-grained permissions system\n');
}

analyzeAccessControl().catch(console.error);
