/**
 * Migration script to populate organizations from existing sales_pipeline data
 *
 * Run with: NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/migrate-to-orgs.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Trial organizations list (59 after exclusions)
const TRIAL_ORGS = [
  'Focal Point KSA', 'Almarai', 'AM Capital', 'HH Global', 'J K White Cement Works',
  'Wipak', 'ENEOS Middle East & Africa FZE', 'Brinsa S.A', 'Trouw Nutrition',
  'Sony Corporation', 'Cereal Docks SpA', 'Wacker Chemie AG', 'GCC Makers', 'BASF',
  'Vanderlande', 'Circle K', 'Kemin', 'The Tony Blair Institute for Global Change',
  'ANDECO', 'Schneider Electric', 'Givaudan', 'Foremost Farms', 'Unit Consulting',
  'BP', 'Rich Corporation', 'OCP Nutricrops', 'Mitsubishi Chemical Group Corporation',
  'Salic', 'Toyota Tsusho Systems', 'FrieslandCampina', 'CareEdge Group',
  'Logic Consulting', 'ExxonMobil', 'LAC Intermarketing', 'Aboitiz Equity Ventures',
  'Saint-Gobain', 'ABB Limited', 'Novonesis', 'CBIZ, Inc', 'DAL Group', 'Advantest',
  'Horwath HTL', 'Qiddiya Investment Company', 'Mitsui OSK Group', 'IO Partners',
  'Amazon - Luxembourg Office', 'Ergomed Group', 'VST Tillers Tractors', 'TD Synnex',
  'ExxonMobil Product Solutions', 'Cleveland Clinic Abu Dhabi', 'GoodyCo',
  'Mitsui Chemicals (MCIE)', 'EPC Group', 'TDK Corporation', 'Samsung Group',
  'Teleperformance', 'Solutions for Development Consulting - Palestine'
];

// Excluded orgs (not trial)
const EXCLUDED_ORGS = ['Mordor Intelligence', 'Upwisery', 'Woodward', 'Hausmann Aromatic Group'];

// Trial status assignments
const REVOKED_ORGS = ['AM Capital', 'GCC Makers', 'J K White Cement Works', 'ENEOS Middle East & Africa FZE', 'CareEdge Group'];
const EXPIRED_ORGS = ['LAC Intermarketing'];
const INACTIVE_ORGS = ['Salic', 'Brinsa S.A', 'Almarai'];
const LOGIN_ISSUES_ORGS = ['BP'];
const REJECTED_ORGS = [
  { name: 'BASF', reason: 'competitor' as const },
  { name: 'Circle K', reason: 'no_response' as const }
];

// Subsidiary mappings
const SUBSIDIARY_MAPPINGS = [
  {
    parent: 'Schneider Electric',
    subsidiaries: [
      { name: 'Schneider Electric - MEA', region: 'MEA', contacts: ['mohamed.sadek@se.com'] },
      { name: 'Schneider Electric - EMEA', region: 'EMEA', contacts: ['tania.fotiadou@se.com'] }
    ]
  },
  {
    parent: 'ExxonMobil',
    subsidiaries: [
      { name: 'ExxonMobil', region: 'Global', contacts: ['nikhil.sardana'] },
      { name: 'ExxonMobil Product Solutions', region: 'Global', contacts: ['frank.opal'] }
    ]
  }
];

// Map old pipeline stage to new org status
function stageToOrgStatus(stage: string): string {
  switch (stage) {
    case 'intro':
      return 'prospect';
    case 'demo':
    case 'pending_trial':
      return 'demo_done';
    case 'trial':
    case 'feedback':
      return 'trial_access';
    case 'proposal':
    case 'nego':
      return 'negotiation';
    case 'won':
      return 'onboarded';
    case 'lost':
      return 'rejected';
    default:
      return 'prospect';
  }
}

async function migrate() {
  console.log('Starting organization migration...\n');

  // 1. Fetch all existing contacts
  const { data: contacts, error: fetchError } = await supabase
    .from('sales_pipeline')
    .select('*')
    .order('company_name');

  if (fetchError) {
    console.error('Failed to fetch contacts:', fetchError.message);
    return;
  }

  console.log(`Found ${contacts.length} contacts`);

  // 2. Group contacts by company_name
  const byCompany: Record<string, typeof contacts> = {};
  contacts.forEach(c => {
    if (!byCompany[c.company_name]) byCompany[c.company_name] = [];
    byCompany[c.company_name].push(c);
  });

  const companies = Object.keys(byCompany);
  console.log(`Found ${companies.length} unique companies\n`);

  // 3. Create organizations
  const orgMap: Record<string, string> = {}; // company_name -> org_id
  let created = 0;
  let skipped = 0;

  for (const companyName of companies) {
    const companyContacts = byCompany[companyName];
    const firstContact = companyContacts[0];

    // Check if this is a subsidiary that should be handled separately
    let isSubsidiary = false;
    for (const mapping of SUBSIDIARY_MAPPINGS) {
      for (const sub of mapping.subsidiaries) {
        if (companyName.toLowerCase().includes(sub.name.toLowerCase()) ||
            sub.contacts.some(email => companyContacts.some(c => c.primary_email?.toLowerCase().includes(email.toLowerCase())))) {
          isSubsidiary = true;
          break;
        }
      }
    }

    // Determine trial status
    let trialStatus = 'not_requested';
    let loginStatus = 'not_logged_in';

    // Check if this org is in the trial list
    const isTrialOrg = TRIAL_ORGS.some(name =>
      companyName.toLowerCase().includes(name.toLowerCase()) ||
      name.toLowerCase().includes(companyName.toLowerCase())
    );

    if (isTrialOrg && !EXCLUDED_ORGS.some(ex => companyName.toLowerCase().includes(ex.toLowerCase()))) {
      // Determine specific trial status
      if (REVOKED_ORGS.some(r => companyName.toLowerCase().includes(r.toLowerCase()))) {
        trialStatus = 'revoked';
      } else if (EXPIRED_ORGS.some(e => companyName.toLowerCase().includes(e.toLowerCase()))) {
        trialStatus = 'expired';
      } else if (INACTIVE_ORGS.some(i => companyName.toLowerCase().includes(i.toLowerCase()))) {
        trialStatus = 'inactive';
      } else {
        trialStatus = 'active';
      }

      if (LOGIN_ISSUES_ORGS.some(l => companyName.toLowerCase().includes(l.toLowerCase()))) {
        loginStatus = 'login_issues';
      } else if (trialStatus === 'active') {
        loginStatus = 'logged_in';
      }
    }

    // Determine org status
    let orgStatus = stageToOrgStatus(firstContact.stage);
    let rejectionReason = null;

    // Check for rejected orgs
    const rejectedOrg = REJECTED_ORGS.find(r =>
      companyName.toLowerCase().includes(r.name.toLowerCase())
    );
    if (rejectedOrg) {
      orgStatus = 'rejected';
      rejectionReason = rejectedOrg.reason;
    }

    // Create the organization
    const orgData = {
      name: companyName,
      display_name: companyName,
      industry: firstContact.industry,
      country: firstContact.country,
      status: orgStatus,
      status_updated_at: new Date().toISOString(),
      rejection_reason: rejectionReason,
      trial_status: trialStatus,
      trial_given_date: isTrialOrg ? firstContact.trial_given_date : null,
      login_status: loginStatus,
      deal_value: companyContacts.reduce((sum, c) => sum + (c.deal_value || 0), 0) || null,
      employee_name: firstContact.employee_name,
      notes: firstContact.notes,
      pain_points: firstContact.pain_points,
      current_tools: firstContact.current_tools,
    };

    const { data: org, error: insertError } = await supabase
      .from('organizations')
      .insert(orgData)
      .select()
      .single();

    if (insertError) {
      console.log(`  Skip ${companyName}: ${insertError.message}`);
      skipped++;
      continue;
    }

    orgMap[companyName] = org.id;
    created++;

    // Log progress
    const statusIcon = trialStatus === 'active' ? '✓' : trialStatus === 'revoked' ? '⏸' : trialStatus === 'inactive' ? '○' : '·';
    console.log(`  ${statusIcon} ${companyName} (${orgStatus}, trial:${trialStatus})`);
  }

  console.log(`\nCreated ${created} organizations, skipped ${skipped}`);

  // 4. Create subsidiary relationships
  console.log('\nCreating subsidiary relationships...');
  for (const mapping of SUBSIDIARY_MAPPINGS) {
    // Find parent org
    const parentName = Object.keys(orgMap).find(name =>
      name.toLowerCase() === mapping.parent.toLowerCase()
    );

    if (!parentName) {
      console.log(`  Parent not found: ${mapping.parent}`);
      continue;
    }

    const parentId = orgMap[parentName];

    // Update subsidiaries
    for (const sub of mapping.subsidiaries) {
      const subName = Object.keys(orgMap).find(name =>
        name.toLowerCase().includes(sub.name.toLowerCase())
      );

      if (subName) {
        const { error } = await supabase
          .from('organizations')
          .update({ parent_id: parentId, region: sub.region })
          .eq('id', orgMap[subName]);

        if (!error) {
          console.log(`  ${sub.name} -> parent: ${mapping.parent}`);
        }
      }
    }
  }

  // 5. Summary
  console.log('\n=== Migration Summary ===');
  console.log(`Total organizations: ${created}`);

  // Count by status
  const { data: statusCounts } = await supabase
    .from('organizations')
    .select('status');

  if (statusCounts) {
    const counts: Record<string, number> = {};
    statusCounts.forEach(o => {
      counts[o.status] = (counts[o.status] || 0) + 1;
    });
    console.log('\nBy status:');
    Object.entries(counts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });
  }

  // Count by trial status
  const { data: trialCounts } = await supabase
    .from('organizations')
    .select('trial_status');

  if (trialCounts) {
    const counts: Record<string, number> = {};
    trialCounts.forEach(o => {
      counts[o.trial_status] = (counts[o.trial_status] || 0) + 1;
    });
    console.log('\nBy trial status:');
    Object.entries(counts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });
  }

  console.log('\nDone!');
  console.log('\nNote: To link contacts to organizations, run the ALTER TABLE in Supabase SQL Editor:');
  console.log('ALTER TABLE sales_pipeline ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);');
}

migrate().catch(console.error);
