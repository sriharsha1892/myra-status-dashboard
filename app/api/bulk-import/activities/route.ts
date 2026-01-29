/**
 * Bulk Import Activity Events API
 *
 * Server-side endpoint for importing activity timeline events.
 * Receives pre-parsed/transformed data from client and performs database insertions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client with service role
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface ActivityEventItem {
  org_name: string;
  user_id: string;
  event_type: string;
  event_date: string;
  title: string;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export async function POST(request: NextRequest) {
  try {
    const { items } = await request.json() as { items: ActivityEventItem[] };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Missing or empty items array' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Pre-fetch all orgs for faster lookup
    const { data: orgs } = await supabase
      .from('trial_organizations')
      .select('org_id, org_name');

    const orgNameToId = new Map(
      (orgs || []).map(org => [org.org_name.toLowerCase(), org.org_id])
    );

    let successful = 0;
    let failed = 0;
    let skipped = 0;
    const errors: Array<{ item: string; error: string }> = [];

    for (const item of items) {
      try {
        // Resolve org name to org ID
        const orgId = orgNameToId.get(item.org_name.toLowerCase());
        if (!orgId) {
          errors.push({ item: item.title || 'Unknown', error: `Organization not found: ${item.org_name}` });
          failed++;
          continue;
        }

        // Insert activity event
        const { error } = await supabase
          .from('trial_engagement_log')
          .insert({
            org_id: orgId,
            user_id: item.user_id,
            event_type: item.event_type,
            event_date: item.event_date,
            title: item.title,
            description: item.description,
            metadata: item.metadata,
            created_at: item.created_at,
          });

        if (error) {
          errors.push({ item: item.title || 'Unknown', error: error.message });
          failed++;
        } else {
          successful++;
        }
      } catch (error) {
        errors.push({ item: item.title || 'Unknown', error: (error as Error).message || 'Unknown error' });
        failed++;
      }
    }

    return NextResponse.json({
      successful,
      failed,
      skipped,
      errors,
    });
  } catch (error) {
    console.error('Bulk import activities error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
