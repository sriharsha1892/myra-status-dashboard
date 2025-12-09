/**
 * Organization Search API
 *
 * Search organizations by name for the org selector dropdown
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.length < 2) {
      return NextResponse.json({ organizations: [] });
    }

    const supabase = getSupabase();

    // Search by name (case-insensitive partial match)
    const { data: orgs, error } = await supabase
      .from('trial_organizations')
      .select('org_id, org_name, is_prospect')
      .ilike('org_name', `%${query}%`)
      .order('org_name')
      .limit(20);

    if (error) {
      console.error('Org search error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ organizations: orgs || [] });
  } catch (error) {
    console.error('Org search error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
