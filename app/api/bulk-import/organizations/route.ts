/**
 * Bulk Import Organizations API
 *
 * Server-side endpoint for importing organizations with users.
 * Receives pre-parsed/transformed data from client and performs database insertions.
 *
 * This keeps service role key server-side only (security requirement).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { findAccountManagerBySalesPOC } from '@/lib/organizations/sharedHelpers';

// Server-side Supabase client with service role
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface OrganizationWithUser {
  org_name: string;
  domain: string;
  trial_request_date: string | null;
  trial_access_provided_date: string | null;
  trial_expiry_date: string | null;
  trial_status: string;
  org_lifecycle_stage: string;
  description: string;
  logo_url: string;
  org_url: string;
  account_manager_id: string | null;
  custom_fields?: Record<string, unknown>;
  user_email: string;
  user_name: string;
  user_role: string | null;
  user_current_stage: string;
  user_sales_poc?: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const { items } = await request.json() as { items: OrganizationWithUser[] };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Missing or empty items array' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    let successful = 0;
    let failed = 0;
    let skipped = 0;
    const errors: Array<{ item: string; error: string }> = [];
    const importedOrgIds: string[] = [];

    for (const item of items) {
      try {
        // Lookup account manager if sales_poc exists
        const salesPOC = item.custom_fields?.sales_poc as string | null || item.user_sales_poc;
        const accountManagerId = salesPOC ? await findAccountManagerBySalesPOC(salesPOC) : null;

        // Check if user already exists
        const { data: existingUser } = await supabase
          .from('trial_users')
          .select('user_id, org_id')
          .eq('email', item.user_email)
          .maybeSingle();

        if (existingUser) {
          skipped++;
          continue;
        }

        // Check if org exists
        const { data: existingOrg } = await supabase
          .from('trial_organizations')
          .select('org_id')
          .ilike('org_name', item.org_name)
          .maybeSingle();

        let orgId: string;

        if (existingOrg) {
          orgId = existingOrg.org_id;

          // Update org custom_fields to merge comments/notes
          if (item.custom_fields) {
            await supabase
              .from('trial_organizations')
              .update({
                custom_fields: {
                  ...item.custom_fields,
                  [`comments_${item.user_email}`]: item.custom_fields.comments,
                  [`notes_${item.user_email}`]: item.custom_fields.notes,
                },
              })
              .eq('org_id', orgId);
          }

          if (!importedOrgIds.includes(orgId)) {
            importedOrgIds.push(orgId);
          }
        } else {
          // Create new organization
          const { data: newOrg, error: orgError } = await supabase
            .from('trial_organizations')
            .insert({
              org_name: item.org_name,
              domain: item.domain,
              trial_request_date: item.trial_request_date,
              trial_access_provided_date: item.trial_access_provided_date,
              trial_expiry_date: item.trial_expiry_date,
              trial_status: item.trial_status,
              org_lifecycle_stage: item.org_lifecycle_stage,
              description: item.description,
              logo_url: item.logo_url,
              org_url: item.org_url,
              account_manager_id: accountManagerId,
              custom_fields: item.custom_fields,
            })
            .select('org_id')
            .single();

          if (orgError || !newOrg) {
            errors.push({ item: item.org_name, error: `Failed to create org: ${orgError?.message}` });
            failed++;
            continue;
          }

          orgId = newOrg.org_id;
          importedOrgIds.push(orgId);
        }

        // Create user
        const { error: userError } = await supabase
          .from('trial_users')
          .insert({
            org_id: orgId,
            email: item.user_email,
            name: item.user_name,
            role: item.user_role,
            current_stage: item.user_current_stage,
          });

        if (userError) {
          errors.push({ item: item.org_name, error: `Failed to create user: ${userError.message}` });
          failed++;
        } else {
          successful++;
        }
      } catch (error) {
        errors.push({ item: item.org_name, error: (error as Error).message || 'Unknown error' });
        failed++;
      }
    }

    return NextResponse.json({
      successful,
      failed,
      skipped,
      errors,
      importedOrgIds,
    });
  } catch (error) {
    console.error('Bulk import organizations error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
