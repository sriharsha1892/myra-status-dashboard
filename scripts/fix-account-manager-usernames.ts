/**
 * Account Manager Data Cleanup Script
 *
 * Problem: Some organizations have usernames stored in account_manager field
 * instead of UUIDs due to the bug in the individual org edit modal.
 *
 * Solution: This script converts all usernames to their corresponding UUIDs.
 *
 * Usage: npx tsx scripts/fix-account-manager-usernames.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create Supabase client with service role key to bypass RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface AccountManager {
  user_id: string;
  email: string;
  username?: string;
  full_name?: string;
}

interface TrialOrg {
  org_id: string;
  org_name: string;
  account_manager: string | null;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function main() {
  console.log('🔧 Starting Account Manager Data Cleanup...\n');

  // Step 1: Fetch all account managers
  console.log('📋 Step 1: Fetching account managers...');
  const { data: managers, error: managersError } = await supabase.auth.admin.listUsers();

  if (managersError) {
    console.error('❌ Error fetching managers:', managersError);
    process.exit(1);
  }

  // Filter for Account Managers and Admins
  const accountManagers: AccountManager[] = managers.users
    .filter((user: any) => {
      const role = user.user_metadata?.role;
      return role === 'Account Manager' || role === 'Admin' || role === 'account_manager';
    })
    .map((user: any) => ({
      user_id: user.id,
      email: user.email || '',
      username: user.user_metadata?.username || user.user_metadata?.name || user.email?.split('@')[0],
      full_name: user.user_metadata?.full_name || user.user_metadata?.name,
    }));

  console.log(`✓ Found ${accountManagers.length} account managers:\n`);
  accountManagers.forEach(am => {
    console.log(`  - ${am.full_name || am.email} (${am.username}) → ${am.user_id}`);
  });
  console.log('');

  // Create lookup maps
  const usernameToUuid = new Map<string, string>();
  const emailToUuid = new Map<string, string>();
  const nameToUuid = new Map<string, string>();

  accountManagers.forEach(am => {
    if (am.username) {
      usernameToUuid.set(am.username.toLowerCase(), am.user_id);
    }
    if (am.email) {
      emailToUuid.set(am.email.toLowerCase(), am.user_id);
      const emailPrefix = am.email.split('@')[0].toLowerCase();
      usernameToUuid.set(emailPrefix, am.user_id);
    }
    if (am.full_name) {
      nameToUuid.set(am.full_name.toLowerCase(), am.user_id);
    }
  });

  // Step 2: Fetch all trial organizations
  console.log('📋 Step 2: Fetching trial organizations...');
  const { data: orgs, error: orgsError } = await supabase
    .from('trial_organizations')
    .select('org_id, org_name, account_manager')
    .order('org_name');

  if (orgsError) {
    console.error('❌ Error fetching organizations:', orgsError);
    process.exit(1);
  }

  console.log(`✓ Found ${orgs.length} trial organizations\n`);

  // Step 3: Identify and fix organizations with username instead of UUID
  console.log('🔍 Step 3: Analyzing account_manager values...\n');

  const toFix: Array<{ org: TrialOrg; currentValue: string; newUuid: string }> = [];
  const alreadyCorrect: TrialOrg[] = [];
  const unassigned: TrialOrg[] = [];
  const cannotResolve: Array<{ org: TrialOrg; value: string }> = [];

  for (const org of orgs as TrialOrg[]) {
    if (!org.account_manager) {
      unassigned.push(org);
      continue;
    }

    // Check if already a UUID
    if (UUID_REGEX.test(org.account_manager)) {
      alreadyCorrect.push(org);
      continue;
    }

    // Try to resolve username/name to UUID
    const value = org.account_manager.toLowerCase();
    let resolvedUuid: string | undefined;

    // Try username match
    resolvedUuid = usernameToUuid.get(value);

    // Try email match
    if (!resolvedUuid) {
      resolvedUuid = emailToUuid.get(value);
    }

    // Try name match
    if (!resolvedUuid) {
      resolvedUuid = nameToUuid.get(value);
    }

    // Try fuzzy match (remove spaces, dots, etc.)
    if (!resolvedUuid) {
      const normalized = value.replace(/[.\s_-]/g, '').toLowerCase();
      for (const [key, uuid] of usernameToUuid.entries()) {
        if (key.replace(/[.\s_-]/g, '').toLowerCase() === normalized) {
          resolvedUuid = uuid;
          break;
        }
      }
    }

    if (resolvedUuid) {
      toFix.push({
        org,
        currentValue: org.account_manager,
        newUuid: resolvedUuid,
      });
    } else {
      cannotResolve.push({ org, value: org.account_manager });
    }
  }

  // Print summary
  console.log('📊 Summary:');
  console.log(`  ✓ Already correct (UUID):     ${alreadyCorrect.length}`);
  console.log(`  🔧 Need fixing (username):     ${toFix.length}`);
  console.log(`  ⚠ Cannot resolve:             ${cannotResolve.length}`);
  console.log(`  ○ Unassigned:                 ${unassigned.length}`);
  console.log('');

  if (toFix.length > 0) {
    console.log('🔧 Organizations to fix:\n');
    toFix.forEach(({ org, currentValue, newUuid }) => {
      const manager = accountManagers.find(am => am.user_id === newUuid);
      console.log(`  "${org.org_name}"`);
      console.log(`    Current: "${currentValue}"`);
      console.log(`    New:     ${manager?.full_name || manager?.email} (${newUuid})`);
      console.log('');
    });
  }

  if (cannotResolve.length > 0) {
    console.log('⚠ Cannot resolve these values:\n');
    cannotResolve.forEach(({ org, value }) => {
      console.log(`  "${org.org_name}" → "${value}"`);
    });
    console.log('');
  }

  // Step 4: Apply fixes
  if (toFix.length === 0) {
    console.log('✅ All account managers are already using UUIDs. No fixes needed!');
    return;
  }

  console.log('💾 Step 4: Applying fixes...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const { org, newUuid } of toFix) {
    const { error } = await supabase
      .from('trial_organizations')
      .update({
        account_manager: newUuid,
        updated_at: new Date().toISOString(),
      })
      .eq('org_id', org.org_id);

    if (error) {
      console.error(`  ❌ Failed to update "${org.org_name}":`, error.message);
      errorCount++;
    } else {
      console.log(`  ✓ Updated "${org.org_name}"`);
      successCount++;
    }
  }

  console.log('');
  console.log('📊 Final Results:');
  console.log(`  ✓ Successfully updated: ${successCount}`);
  if (errorCount > 0) {
    console.log(`  ❌ Failed:              ${errorCount}`);
  }
  console.log('');
  console.log('✅ Cleanup complete!');
  console.log('');
  console.log('💡 Next steps:');
  console.log('  1. Refresh your browser at http://localhost:3000/support/trials');
  console.log('  2. Verify that account managers are now displayed correctly');
  console.log('  3. Check the engagement report as well');
}

main().catch(console.error);
