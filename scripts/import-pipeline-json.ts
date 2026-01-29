/**
 * Import pipeline organizations from JSON file
 * Run with: npx tsx scripts/import-pipeline-json.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load env
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Map JSON lifecycle stages to database values
function mapLifecycleStage(stage: string): string {
  const mapping: Record<string, string> = {
    'onboarded': 'customer',
    'negotiation': 'negotiation',
    'demo_done': 'demo_done',
    'prospect': 'prospect',
    'trial_active': 'trial_active',
    'trial_expired': 'trial_expired',
    'lost': 'lost',
    'trial_pending': 'trial_pending',
  };
  return mapping[stage] || 'prospect';
}

interface JsonOrg {
  org_name: string;
  org_lifecycle_stage: string;
  pipeline_stage?: string;
  deal_value: number | null;
  sales_poc: string | null;
  region: string | null;
  domain: string | null;
  prospect_source: string | null;
  demo_date: string | null;
  trial_start_date: string | null;
  deal_momentum: string | null;
  notes: string | null;
}

async function importOrganizations() {
  // Read JSON file
  const jsonPath = path.join(process.env.HOME!, 'Downloads', 'myra-pipeline-final.json');
  const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  const organizations: JsonOrg[] = jsonData.organizations;
  console.log(`Found ${organizations.length} organizations to import`);

  // Transform to database format
  const dbRecords = organizations.map((org) => ({
    org_name: org.org_name,
    org_lifecycle_stage: mapLifecycleStage(org.org_lifecycle_stage),
    deal_value: org.deal_value,
    deal_momentum: org.deal_momentum,
    sales_poc: org.sales_poc,
    domain: org.domain,
    region: org.region,
    trial_start_date: org.trial_start_date,
    demo_date: org.demo_date,
    notes: org.notes,
    prospect_source: org.prospect_source,
  }));

  // Check for existing organizations to avoid duplicates
  const { data: existing } = await supabase
    .from('trial_organizations')
    .select('org_name');

  const existingNames = new Set((existing || []).map((o) => o.org_name.toLowerCase()));

  // Filter out duplicates
  const newRecords = dbRecords.filter((r) => !existingNames.has(r.org_name.toLowerCase()));

  if (newRecords.length === 0) {
    console.log('No new organizations to import (all already exist)');
    return;
  }

  console.log(`Importing ${newRecords.length} new organizations (${dbRecords.length - newRecords.length} already exist)`);

  // Insert in batches of 50
  const batchSize = 50;
  let imported = 0;

  for (let i = 0; i < newRecords.length; i += batchSize) {
    const batch = newRecords.slice(i, i + batchSize);

    const { error } = await supabase
      .from('trial_organizations')
      .insert(batch);

    if (error) {
      console.error(`Error importing batch ${i / batchSize + 1}:`, error);
    } else {
      imported += batch.length;
      console.log(`Imported ${imported}/${newRecords.length}`);
    }
  }

  console.log(`\nDone! Imported ${imported} organizations.`);
}

importOrganizations().catch(console.error);
