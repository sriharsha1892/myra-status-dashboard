/**
 * Data Migration Script: Unified Organizations & Contacts
 *
 * Migrates data from:
 * - organizations → organizations_unified
 * - trial_organizations → organizations_unified
 * - sales_pipeline (emails) → org_contacts
 * - trial_users → org_contacts (with platform_user_id link)
 *
 * Run with:
 * NEXT_PUBLIC_SUPABASE_URL="..." SUPABASE_SERVICE_ROLE_KEY="..." npx tsx scripts/migrate-unified-orgs.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Mapping from old status to new lifecycle_stage
const statusToLifecycle: Record<string, string> = {
  'prospect': 'prospect',
  'demo_done': 'demo_done',
  'trial_access': 'trial_active',
  'negotiation': 'negotiation',
  'rejected': 'lost',
  'onboarded': 'onboarded',
};

// Mapping from trial_status to unified trial_status
const trialStatusMap: Record<string, string> = {
  'not_requested': 'not_requested',
  'requested': 'requested',
  'scheduled': 'requested',
  'approved': 'approved',
  'in_progress': 'active',
  'active': 'active',
  'inactive': 'expired',
  'extended': 'extended',
  'expired': 'expired',
  'completed': 'expired',
  'closed': 'expired',
  'revoked': 'revoked',
};

// Mapping from vertical domain to unified vertical
const domainToVertical: Record<string, string> = {
  'TMT': 'TMT',
  'NEO': 'NEO',
  'AF&B': 'AF&B',
  'E&C': 'E&C',
  'HC': 'HC',
  'AAD': 'AAD',
};

interface MigrationStats {
  orgsFromOrganizations: number;
  orgsFromTrialOrganizations: number;
  contactsFromSalesPipeline: number;
  contactsFromTrialUsers: number;
  errors: string[];
}

const stats: MigrationStats = {
  orgsFromOrganizations: 0,
  orgsFromTrialOrganizations: 0,
  contactsFromSalesPipeline: 0,
  contactsFromTrialUsers: 0,
  errors: [],
};

async function migrateOrganizations() {
  console.log('\n=== Migrating organizations table ===');

  const { data: orgs, error } = await supabase
    .from('organizations')
    .select('*');

  if (error) {
    console.error('Error fetching organizations:', error.message);
    stats.errors.push(`organizations fetch: ${error.message}`);
    return;
  }

  if (!orgs || orgs.length === 0) {
    console.log('No organizations to migrate');
    return;
  }

  console.log(`Found ${orgs.length} organizations to migrate`);

  for (const org of orgs) {
    const unifiedOrg = {
      // Use existing ID to preserve references
      id: org.id,
      parent_id: org.parent_id,
      name: org.name,
      display_name: org.display_name,
      industry: org.industry,
      country: org.country,
      region: org.region,

      // Map status to lifecycle_stage
      lifecycle_stage: statusToLifecycle[org.status] || 'prospect',
      lifecycle_stage_updated_at: org.status_updated_at,

      // Trial tracking
      trial_status: trialStatusMap[org.trial_status] || 'not_requested',
      trial_start_date: org.trial_start_date,
      trial_end_date: org.trial_end_date,
      login_status: org.login_status || 'not_logged_in',
      trial_usage_notes: org.trial_usage_notes,

      // Deal/customer details
      deal_value: org.deal_value,
      deal_currency: 'USD',
      contract_start_date: org.contract_start_date,
      contract_end_date: org.contract_end_date,
      renewal_date: org.renewal_date,
      arr: org.arr,
      num_licensed_users: org.num_users,

      // Assignment
      employee_name: org.employee_name,

      // Discovery
      pain_points: org.pain_points,
      current_tools: org.current_tools,
      notes: org.notes,

      // Rejection tracking
      rejection_reason: org.rejection_reason,

      // Metadata
      source_system: 'organizations',
      external_id: org.id,
      created_at: org.created_at,
      updated_at: org.updated_at,
    };

    const { error: insertError } = await supabase
      .from('organizations_unified')
      .upsert(unifiedOrg, { onConflict: 'id' });

    if (insertError) {
      console.error(`Error migrating org ${org.name}:`, insertError.message);
      stats.errors.push(`org ${org.name}: ${insertError.message}`);
    } else {
      stats.orgsFromOrganizations++;
    }
  }

  console.log(`Migrated ${stats.orgsFromOrganizations} organizations`);
}

async function migrateTrialOrganizations() {
  console.log('\n=== Migrating trial_organizations table ===');

  const { data: trialOrgs, error } = await supabase
    .from('trial_organizations')
    .select('*');

  if (error) {
    console.error('Error fetching trial_organizations:', error.message);
    stats.errors.push(`trial_organizations fetch: ${error.message}`);
    return;
  }

  if (!trialOrgs || trialOrgs.length === 0) {
    console.log('No trial_organizations to migrate');
    return;
  }

  console.log(`Found ${trialOrgs.length} trial_organizations to migrate`);

  // First, check which trial orgs already exist in organizations_unified
  const { data: existingOrgs } = await supabase
    .from('organizations_unified')
    .select('name, source_system');

  const existingOrgNames = new Set((existingOrgs || []).map(o => o.name.toLowerCase()));

  for (const org of trialOrgs) {
    // Skip if already migrated from organizations table (by name match)
    if (existingOrgNames.has(org.org_name?.toLowerCase())) {
      console.log(`Skipping ${org.org_name} - already exists from organizations table`);
      continue;
    }

    // Determine lifecycle based on trial status
    let lifecycle = 'prospect';
    if (org.trial_status === 'active' || org.trial_status === 'in_progress') {
      lifecycle = 'trial_active';
    } else if (org.trial_status === 'extended') {
      lifecycle = 'trial_active';
    } else if (org.trial_status === 'completed' || org.trial_status === 'expired' || org.trial_status === 'closed') {
      lifecycle = 'trial_expired';
    } else if (org.trial_status === 'requested' || org.trial_status === 'approved') {
      lifecycle = 'trial_pending';
    }

    const unifiedOrg = {
      name: org.org_name,
      display_name: org.org_name,
      description: org.description,
      logo_url: org.logo_url,

      // Vertical
      vertical: domainToVertical[org.domain] || null,

      // Lifecycle
      lifecycle_stage: lifecycle,

      // Trial tracking
      trial_status: trialStatusMap[org.trial_status] || 'not_requested',
      trial_requested_date: org.trial_request_date ? new Date(org.trial_request_date).toISOString().split('T')[0] : null,
      trial_start_date: org.trial_access_provided_date ? new Date(org.trial_access_provided_date).toISOString().split('T')[0] : null,
      trial_end_date: org.trial_expiry_date ? new Date(org.trial_expiry_date).toISOString().split('T')[0] : null,

      // Assignment
      account_manager_id: org.account_manager_id,
      sales_poc_id: org.sales_poc_id,

      // Metadata
      source_system: 'trial_organizations',
      external_id: org.org_id,
      created_at: org.created_at,
      updated_at: org.updated_at,
    };

    const { error: insertError } = await supabase
      .from('organizations_unified')
      .insert(unifiedOrg);

    if (insertError) {
      console.error(`Error migrating trial org ${org.org_name}:`, insertError.message);
      stats.errors.push(`trial org ${org.org_name}: ${insertError.message}`);
    } else {
      stats.orgsFromTrialOrganizations++;
    }
  }

  console.log(`Migrated ${stats.orgsFromTrialOrganizations} trial_organizations`);
}

async function migrateContactsFromSalesPipeline() {
  console.log('\n=== Migrating contacts from sales_pipeline ===');

  const { data: deals, error } = await supabase
    .from('sales_pipeline')
    .select('*');

  if (error) {
    console.error('Error fetching sales_pipeline:', error.message);
    stats.errors.push(`sales_pipeline fetch: ${error.message}`);
    return;
  }

  if (!deals || deals.length === 0) {
    console.log('No sales_pipeline records to migrate contacts from');
    return;
  }

  console.log(`Found ${deals.length} sales_pipeline records to extract contacts from`);

  // First, build a map of org names to unified org IDs
  const { data: unifiedOrgs } = await supabase
    .from('organizations_unified')
    .select('id, name');

  const orgNameToId = new Map<string, string>();
  (unifiedOrgs || []).forEach(org => {
    orgNameToId.set(org.name.toLowerCase(), org.id);
  });

  // Track unique contacts per org
  const processedContacts = new Set<string>();

  for (const deal of deals) {
    // Find the org ID
    let orgId = deal.organization_id;

    if (!orgId && deal.company_name) {
      orgId = orgNameToId.get(deal.company_name.toLowerCase());
    }

    if (!orgId) {
      console.log(`Skipping contacts for ${deal.company_name} - no org found`);
      continue;
    }

    // Map stage to lifecycle
    const stageToLifecycle: Record<string, string> = {
      'prospect': 'prospect',
      'demo': 'demo_scheduled',
      'trial': 'trial_active',
      'quote': 'trial_ended',
      'msa': 'trial_ended',
      'onboarded': 'customer',
    };

    const lifecycle = stageToLifecycle[deal.stage] || 'prospect';

    // Extract all emails
    const emails = [
      { email: deal.primary_email, isPrimary: true },
      { email: deal.email_2, isPrimary: false },
      { email: deal.email_3, isPrimary: false },
      { email: deal.email_4, isPrimary: false },
    ].filter(e => e.email);

    for (const { email, isPrimary } of emails) {
      const contactKey = `${orgId}:${email.toLowerCase()}`;

      if (processedContacts.has(contactKey)) {
        continue;
      }
      processedContacts.add(contactKey);

      const contact = {
        org_id: orgId,
        name: deal.client_name || email.split('@')[0],
        email: email,
        role: 'user' as const,
        lifecycle_stage: lifecycle,
        is_primary: isPrimary,
        source: 'sales_pipeline',
        external_id: deal.id,
      };

      const { error: insertError } = await supabase
        .from('org_contacts')
        .insert(contact);

      if (insertError) {
        // Unique constraint violation is expected for duplicates
        if (!insertError.message.includes('unique_email_per_org')) {
          console.error(`Error migrating contact ${email}:`, insertError.message);
          stats.errors.push(`contact ${email}: ${insertError.message}`);
        }
      } else {
        stats.contactsFromSalesPipeline++;
      }
    }
  }

  console.log(`Migrated ${stats.contactsFromSalesPipeline} contacts from sales_pipeline`);
}

async function migrateContactsFromTrialUsers() {
  console.log('\n=== Migrating contacts from trial_users ===');

  const { data: trialUsers, error } = await supabase
    .from('trial_users')
    .select('*');

  if (error) {
    console.error('Error fetching trial_users:', error.message);
    stats.errors.push(`trial_users fetch: ${error.message}`);
    return;
  }

  if (!trialUsers || trialUsers.length === 0) {
    console.log('No trial_users to migrate');
    return;
  }

  console.log(`Found ${trialUsers.length} trial_users to migrate`);

  // Build a map of trial org IDs to unified org IDs
  const { data: unifiedOrgs } = await supabase
    .from('organizations_unified')
    .select('id, external_id, source_system');

  const trialOrgIdToUnifiedId = new Map<string, string>();
  (unifiedOrgs || []).forEach(org => {
    if (org.source_system === 'trial_organizations' && org.external_id) {
      trialOrgIdToUnifiedId.set(org.external_id, org.id);
    }
  });

  for (const user of trialUsers) {
    const orgId = trialOrgIdToUnifiedId.get(user.org_id);

    if (!orgId) {
      console.log(`Skipping trial user ${user.email} - no unified org found for ${user.org_id}`);
      continue;
    }

    // Map current_stage to lifecycle
    const stageToLifecycle: Record<string, string> = {
      'invited': 'trial_invited',
      'logged_in': 'trial_active',
      'active': 'trial_active',
      'inactive': 'trial_ended',
      'churned': 'churned',
    };

    const lifecycle = stageToLifecycle[user.current_stage] || 'trial_invited';

    const contact = {
      org_id: orgId,
      platform_user_id: user.user_id,  // Link to actual platform user
      name: user.name,
      email: user.email,
      phone: user.phone,
      title: user.user_designation || user.role,
      role: 'user' as const,
      lifecycle_stage: lifecycle,
      is_primary: user.is_primary_contact || false,
      last_contacted_at: user.last_active_at,
      source: 'trial_users',
      external_id: user.freshsales_id || user.salesforce_id || user.user_id,
      created_at: user.created_at,
    };

    const { error: insertError } = await supabase
      .from('org_contacts')
      .insert(contact);

    if (insertError) {
      if (!insertError.message.includes('unique_email_per_org')) {
        console.error(`Error migrating trial user ${user.email}:`, insertError.message);
        stats.errors.push(`trial user ${user.email}: ${insertError.message}`);
      }
    } else {
      stats.contactsFromTrialUsers++;
    }
  }

  console.log(`Migrated ${stats.contactsFromTrialUsers} contacts from trial_users`);
}

async function main() {
  console.log('========================================');
  console.log('Unified Organizations Data Migration');
  console.log('========================================');
  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log(`Started at: ${new Date().toISOString()}`);

  // Step 1: Migrate organizations
  await migrateOrganizations();

  // Step 2: Migrate trial_organizations (skip duplicates)
  await migrateTrialOrganizations();

  // Step 3: Migrate contacts from sales_pipeline
  await migrateContactsFromSalesPipeline();

  // Step 4: Migrate contacts from trial_users
  await migrateContactsFromTrialUsers();

  // Summary
  console.log('\n========================================');
  console.log('Migration Summary');
  console.log('========================================');
  console.log(`Organizations from organizations table: ${stats.orgsFromOrganizations}`);
  console.log(`Organizations from trial_organizations: ${stats.orgsFromTrialOrganizations}`);
  console.log(`Contacts from sales_pipeline: ${stats.contactsFromSalesPipeline}`);
  console.log(`Contacts from trial_users: ${stats.contactsFromTrialUsers}`);

  if (stats.errors.length > 0) {
    console.log(`\nErrors (${stats.errors.length}):`);
    stats.errors.forEach(err => console.log(`  - ${err}`));
  } else {
    console.log('\nNo errors!');
  }

  console.log(`\nCompleted at: ${new Date().toISOString()}`);
}

main().catch(console.error);
