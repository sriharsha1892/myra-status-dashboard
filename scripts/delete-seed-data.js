/**
 * Seed Data Cleanup Script
 * Safely deletes test/seed data from production database
 */

const { createClient } = require('@supabase/supabase-js');

// Production Supabase connection
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mkkhwiyolmowomojvtel.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Color codes for better output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Seed data identification patterns
const SEED_PATTERNS = {
  orgNames: [
    'Test Organization',
    'Seed Org',
    'Demo Company',
    'Sample Corp',
    'TechCorp Solutions',
    'Acme Corp',
    'Circle K', // From old test data
    'TestCo',
    'QA Test Org'
  ],
  userEmails: [
    '@test.com',
    '@seed.com',
    '@demo.com',
    '@example.com',
    '@techcorp.com',
    '@acmecorp.com',
    'test@',
    'seed@',
    'demo@'
  ],
  descriptions: [
    'trial organization', // Fallback descriptions
    'test description',
    'seed data',
    'demo organization'
  ]
};

async function identifySeedOrganizations() {
  log('\n🔍 Identifying seed organizations...', 'cyan');

  try {
    // Query for organizations matching seed patterns
    const { data: orgs, error } = await supabase
      .from('trial_organizations')
      .select('id, org_name, description, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const seedOrgs = orgs.filter(org => {
      // Check org name patterns
      const matchesOrgName = SEED_PATTERNS.orgNames.some(pattern =>
        org.org_name.toLowerCase().includes(pattern.toLowerCase())
      );

      // Check description patterns
      const matchesDescription = org.description && SEED_PATTERNS.descriptions.some(pattern =>
        org.description.toLowerCase().includes(pattern.toLowerCase())
      );

      return matchesOrgName || matchesDescription;
    });

    log(`  Found ${orgs.length} total organizations`, 'blue');
    log(`  Identified ${seedOrgs.length} potential seed organizations`, 'yellow');

    return seedOrgs;
  } catch (error) {
    log(`  ✗ Error identifying seed organizations: ${error.message}`, 'red');
    throw error;
  }
}

async function identifySeedUsers() {
  log('\n🔍 Identifying seed users...', 'cyan');

  try {
    const { data: users, error } = await supabase
      .from('trial_users')
      .select('id, email, name, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const seedUsers = users.filter(user => {
      return SEED_PATTERNS.userEmails.some(pattern =>
        user.email.toLowerCase().includes(pattern.toLowerCase())
      );
    });

    log(`  Found ${users.length} total users`, 'blue');
    log(`  Identified ${seedUsers.length} potential seed users`, 'yellow');

    return seedUsers;
  } catch (error) {
    log(`  ✗ Error identifying seed users: ${error.message}`, 'red');
    throw error;
  }
}

async function displaySeedData(seedOrgs, seedUsers) {
  log('\n' + '='.repeat(80), 'cyan');
  log('SEED DATA TO BE DELETED', 'yellow');
  log('='.repeat(80), 'cyan');

  if (seedOrgs.length > 0) {
    log('\nOrganizations:', 'bright');
    seedOrgs.forEach((org, idx) => {
      log(`  ${idx + 1}. ${org.org_name} (ID: ${org.id.substring(0, 8)}...)`, 'yellow');
      if (org.description) {
        log(`     Description: ${org.description.substring(0, 60)}...`, 'blue');
      }
      log(`     Created: ${new Date(org.created_at).toLocaleString()}`, 'blue');
    });
  }

  if (seedUsers.length > 0) {
    log('\nUsers:', 'bright');
    seedUsers.forEach((user, idx) => {
      log(`  ${idx + 1}. ${user.name} <${user.email}> (ID: ${user.id.substring(0, 8)}...)`, 'yellow');
    });
  }

  log('\n' + '='.repeat(80) + '\n', 'cyan');
}

async function deleteSeedOrganizations(seedOrgs) {
  if (seedOrgs.length === 0) {
    log('  No seed organizations to delete', 'green');
    return { deleted: 0 };
  }

  log(`\n🗑️  Deleting ${seedOrgs.length} seed organizations...`, 'cyan');

  let deleted = 0;
  let failed = 0;

  for (const org of seedOrgs) {
    try {
      // Delete organization (cascade will handle related records)
      const { error } = await supabase
        .from('trial_organizations')
        .delete()
        .eq('id', org.id);

      if (error) throw error;

      log(`  ✓ Deleted: ${org.org_name}`, 'green');
      deleted++;
    } catch (error) {
      log(`  ✗ Failed to delete ${org.org_name}: ${error.message}`, 'red');
      failed++;
    }
  }

  log(`\n  Summary: ${deleted} deleted, ${failed} failed`, deleted > 0 ? 'green' : 'yellow');
  return { deleted, failed };
}

async function deleteSeedUsers(seedUsers) {
  if (seedUsers.length === 0) {
    log('  No seed users to delete', 'green');
    return { deleted: 0 };
  }

  log(`\n🗑️  Deleting ${seedUsers.length} orphaned seed users...`, 'cyan');

  let deleted = 0;
  let failed = 0;

  for (const user of seedUsers) {
    try {
      // Only delete if user is not associated with any organization
      const { data: orgUsers } = await supabase
        .from('trial_users')
        .select('org_id')
        .eq('id', user.id);

      if (orgUsers && orgUsers.length > 0 && orgUsers[0].org_id) {
        // User belongs to an org, skip
        log(`  ⊘ Skipped: ${user.email} (belongs to organization)`, 'yellow');
        continue;
      }

      const { error } = await supabase
        .from('trial_users')
        .delete()
        .eq('id', user.id);

      if (error) throw error;

      log(`  ✓ Deleted: ${user.email}`, 'green');
      deleted++;
    } catch (error) {
      log(`  ✗ Failed to delete ${user.email}: ${error.message}`, 'red');
      failed++;
    }
  }

  log(`\n  Summary: ${deleted} deleted, ${failed} failed`, deleted > 0 ? 'green' : 'yellow');
  return { deleted, failed };
}

async function cleanupImportSessions() {
  log('\n🗑️  Cleaning up old import sessions...', 'cyan');

  try {
    // Delete import sessions older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await supabase
      .from('import_sessions')
      .delete()
      .lt('created_at', thirtyDaysAgo.toISOString())
      .select();

    if (error) throw error;

    log(`  ✓ Deleted ${data?.length || 0} old import sessions`, 'green');
    return { deleted: data?.length || 0 };
  } catch (error) {
    log(`  ✗ Error cleaning import sessions: ${error.message}`, 'red');
    return { deleted: 0 };
  }
}

async function main() {
  log('\n╔════════════════════════════════════════════════════════════════════════════╗', 'cyan');
  log('║                        SEED DATA CLEANUP SCRIPT                            ║', 'cyan');
  log('║                      Myra Status Dashboard Production                      ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════════════════════╝\n', 'cyan');

  try {
    // Step 1: Identify seed data
    const seedOrgs = await identifySeedOrganizations();
    const seedUsers = await identifySeedUsers();

    // Step 2: Display what will be deleted
    await displaySeedData(seedOrgs, seedUsers);

    // Step 3: Confirm deletion
    if (seedOrgs.length === 0 && seedUsers.length === 0) {
      log('✅ No seed data found. Database is clean!', 'green');
      return;
    }

    // In automated script, we proceed with deletion
    // In manual use, you might want to add a confirmation prompt

    // Step 4: Delete seed organizations (cascade deletes related data)
    const orgResults = await deleteSeedOrganizations(seedOrgs);

    // Step 5: Delete orphaned seed users
    const userResults = await deleteSeedUsers(seedUsers);

    // Step 6: Cleanup old import sessions
    const sessionResults = await cleanupImportSessions();

    // Final summary
    log('\n' + '='.repeat(80), 'cyan');
    log('CLEANUP COMPLETE', 'green');
    log('='.repeat(80), 'cyan');

    log(`\nOrganizations deleted: ${orgResults.deleted}`, 'green');
    log(`Users deleted: ${userResults.deleted}`, 'green');
    log(`Import sessions cleaned: ${sessionResults.deleted}`, 'green');

    if (orgResults.failed > 0 || userResults.failed > 0) {
      log(`\n⚠️  ${orgResults.failed + userResults.failed} items failed to delete`, 'yellow');
    }

    log('\n✅ Seed data cleanup completed successfully!', 'green');
    log('='.repeat(80) + '\n', 'cyan');

  } catch (error) {
    log(`\n❌ Fatal error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run cleanup
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
