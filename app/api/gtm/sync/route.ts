import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireGtmAuth } from '@/lib/gtm/auth';

interface ExcelRow {
  name?: string;
  company_name?: string;
  companyName?: string;
  org_name?: string;
  stage?: string;
  lifecycle_stage?: string;
  lifecycleStage?: string;
  org_lifecycle_stage?: string;
  deal_value?: number | string;
  dealValue?: number | string;
  sales_poc?: string;
  salesPoc?: string;
  employee_name?: string;
  vertical?: string;
  domain?: string;
  region?: string;
  trial_start?: string;
  trialStart?: string;
  trial_start_date?: string;
  trial_end?: string;
  trialEnd?: string;
  trial_end_date?: string;
  notes?: string;
  prospect_source?: string;
  demo_date?: string;
  demoDate?: string;
  deal_momentum?: string;
  dealMomentum?: string;
  [key: string]: unknown;
}

interface SyncResult {
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; error: string }>;
}

// Map to trial_organizations.org_lifecycle_stage values
const STAGE_MAPPING: Record<string, string> = {
  // GTM stages to trial_organizations stages
  paying: 'customer',
  paying_customer: 'customer',
  customer: 'customer',
  onboarded: 'customer',

  // Negotiation stages (strong prospects)
  strong_prospects: 'negotiation',
  strong_prospect: 'negotiation',
  negotiation: 'negotiation',

  // Demo done stages
  demo_done: 'demo_done',
  demo_scheduled: 'demo_done',
  demo_completed: 'demo_done',

  // Prospects
  prospects: 'trial_pending',
  prospect: 'prospect',
  trial_pending: 'trial_pending',
  pending: 'trial_pending',

  // Active trials
  active: 'trial_active',
  trial_active: 'trial_active',
  trial: 'trial_active',

  // Dormant / Expired
  dormant: 'trial_expired',
  trial_expired: 'trial_expired',
  expired: 'trial_expired',

  // Lost
  lost: 'lost',
  churned: 'lost',
};

function normalizeStage(stage: string | undefined): string {
  if (!stage) return 'prospect';
  const normalized = stage.toLowerCase().trim().replace(/\s+/g, '_');
  return STAGE_MAPPING[normalized] || 'prospect';
}

function parseDate(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0];
  } catch {
    return null;
  }
}

function parseNumber(value: string | number | undefined): number | null {
  if (value === undefined || value === null || value === '') return null;
  const num = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) : value;
  return isNaN(num) ? null : num;
}

function normalizeMomentum(momentum: string | undefined): string | null {
  if (!momentum) return null;
  const normalized = momentum.toLowerCase().trim().replace(/[\s_-]+/g, '_');
  const mapping: Record<string, string> = {
    positive: 'positive',
    good: 'positive',
    hot: 'positive',
    strong: 'positive',
    neutral: 'neutral',
    ok: 'neutral',
    steady: 'neutral',
    stalled: 'stalled',
    slow: 'stalled',
    stuck: 'stalled',
    at_risk: 'at_risk',
    atrisk: 'at_risk',
    risk: 'at_risk',
    cold: 'at_risk',
    cooling: 'at_risk',
  };
  return mapping[normalized] || null;
}

/**
 * POST - Sync Excel data to trial_organizations
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const gtmEmail = requireGtmAuth(request);
    if (!gtmEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    const body = await request.json();
    const { rows, mode = 'merge' } = body as { rows: ExcelRow[]; mode?: 'merge' | 'replace' | 'append' };

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'No rows provided' }, { status: 400 });
    }

    const result: SyncResult = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    // Process rows in batches
    const BATCH_SIZE = 50;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);

      for (let j = 0; j < batch.length; j++) {
        const row = batch[j];
        const rowIndex = i + j + 1;

        try {
          // Extract and normalize data
          const name = row.name || row.company_name || row.companyName || row.org_name;
          if (!name) {
            result.errors.push({ row: rowIndex, error: 'Missing company name' });
            result.skipped++;
            continue;
          }

          const orgData = {
            org_name: name,
            org_lifecycle_stage: normalizeStage(row.stage || row.lifecycle_stage || row.lifecycleStage || row.org_lifecycle_stage),
            deal_value: parseNumber(row.deal_value || row.dealValue),
            sales_poc: row.sales_poc || row.salesPoc || row.employee_name || null,
            domain: row.vertical || row.domain || null, // domain in trial_orgs is like vertical
            region: row.region || null,
            trial_start_date: parseDate(row.trial_start || row.trialStart || row.trial_start_date),
            trial_end_date: parseDate(row.trial_end || row.trialEnd || row.trial_end_date),
            notes: row.notes || null,
            prospect_source: row.prospect_source || null,
            demo_date: parseDate(row.demo_date || row.demoDate),
            deal_momentum: normalizeMomentum(row.deal_momentum || row.dealMomentum),
          };

          if (mode === 'append') {
            // Always create new record
            const { error: insertError } = await supabase
              .from('trial_organizations')
              .insert(orgData);

            if (insertError) {
              result.errors.push({ row: rowIndex, error: insertError.message });
              result.skipped++;
            } else {
              result.created++;
            }
          } else {
            // Check if org exists by name (case-insensitive)
            const { data: existing } = await supabase
              .from('trial_organizations')
              .select('org_id')
              .ilike('org_name', name)
              .maybeSingle();

            if (existing) {
              if (mode === 'merge') {
                // Update existing - only non-null values
                const updateData: Record<string, unknown> = {};
                for (const [key, value] of Object.entries(orgData)) {
                  if (value !== null && value !== undefined && key !== 'org_name') {
                    updateData[key] = value;
                  }
                }

                if (Object.keys(updateData).length > 0) {
                  const { error: updateError } = await supabase
                    .from('trial_organizations')
                    .update(updateData)
                    .eq('org_id', existing.org_id);

                  if (updateError) {
                    result.errors.push({ row: rowIndex, error: updateError.message });
                    result.skipped++;
                  } else {
                    result.updated++;
                  }
                } else {
                  result.skipped++;
                }
              } else if (mode === 'replace') {
                // Replace existing record
                const { error: updateError } = await supabase
                  .from('trial_organizations')
                  .update(orgData)
                  .eq('org_id', existing.org_id);

                if (updateError) {
                  result.errors.push({ row: rowIndex, error: updateError.message });
                  result.skipped++;
                } else {
                  result.updated++;
                }
              }
            } else {
              // Create new
              const { error: insertError } = await supabase
                .from('trial_organizations')
                .insert(orgData);

              if (insertError) {
                result.errors.push({ row: rowIndex, error: insertError.message });
                result.skipped++;
              } else {
                result.created++;
              }
            }
          }
        } catch (rowError) {
          result.errors.push({
            row: rowIndex,
            error: rowError instanceof Error ? rowError.message : 'Unknown error',
          });
          result.skipped++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      result,
      message: `Processed ${rows.length} rows: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped`,
    });
  } catch (error) {
    console.error('Excel sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync Excel data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET - Download template structure
 */
export async function GET(): Promise<NextResponse> {
  const template = {
    columns: [
      { name: 'name', required: true, description: 'Company name' },
      { name: 'stage', required: false, description: 'Pipeline stage (paying, prospects, active, dormant, lost)' },
      { name: 'deal_value', required: false, description: 'Deal value in USD' },
      { name: 'sales_poc', required: false, description: 'Sales point of contact' },
      { name: 'domain', required: false, description: 'Industry vertical (TMT, NEO, AF&B, E&C, HC, AAD)' },
      { name: 'region', required: false, description: 'Geographic region (MEA, EMEA, APAC, Americas, Global)' },
      { name: 'trial_start', required: false, description: 'Trial start date (YYYY-MM-DD)' },
      { name: 'trial_end', required: false, description: 'Trial end date (YYYY-MM-DD)' },
      { name: 'demo_date', required: false, description: 'Demo date (YYYY-MM-DD)' },
      { name: 'deal_momentum', required: false, description: 'Deal momentum (positive, neutral, stalled, at_risk)' },
      { name: 'notes', required: false, description: 'General notes' },
      { name: 'prospect_source', required: false, description: 'Lead source (cold_outreach, inbound, referral, event, linkedin, website)' },
    ],
    stageMapping: STAGE_MAPPING,
    momentumMapping: {
      positive: 'positive',
      good: 'positive',
      hot: 'positive',
      neutral: 'neutral',
      stalled: 'stalled',
      slow: 'stalled',
      at_risk: 'at_risk',
      risk: 'at_risk',
      cold: 'at_risk',
    },
    example: [
      {
        name: 'Acme Corp',
        stage: 'active',
        deal_value: 50000,
        sales_poc: 'John Smith',
        domain: 'TMT',
        region: 'APAC',
        trial_start: '2026-01-15',
        trial_end: '2026-01-29',
        demo_date: '2026-01-10',
        deal_momentum: 'positive',
        notes: 'Promising trial, high engagement',
      },
    ],
  };

  return NextResponse.json(template);
}
