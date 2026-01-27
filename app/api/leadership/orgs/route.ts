import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isLeadershipEmail } from '@/lib/leadership/auth';

// Valid lifecycle stages for filtering
const VALID_STAGES = [
  'prospect',
  'trial_pending',
  'demo_done',
  'trial_active',
  'trial_expired',
  'negotiation',
  'customer',
  'lost',
];

// Stage display labels for UI
const STAGE_LABELS: Record<string, string> = {
  customer: 'Paying Customer',
  negotiation: 'Negotiation',
  demo_done: 'Demo Done',
  prospect: 'Prospect',
  trial_pending: 'Trial Pending',
  trial_active: 'Trial Active',
  trial_expired: 'Dormant',
  lost: 'Lost',
};

/**
 * GET - List all organizations with filtering
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check leadership access
    if (!isLeadershipEmail(user.email)) {
      return NextResponse.json({ error: 'Access denied. Leadership access required.' }, { status: 403 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const stage = searchParams.get('stage') || '';
    const sortBy = searchParams.get('sortBy') || 'org_name';
    const sortOrder = (searchParams.get('sortOrder') || 'asc') as 'asc' | 'desc';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Build query
    let query = supabase
      .from('trial_organizations')
      .select(
        `
        org_id,
        org_name,
        org_lifecycle_stage,
        deal_value,
        deal_momentum,
        sales_poc,
        domain,
        region,
        trial_start_date,
        trial_end_date,
        demo_date,
        notes,
        prospect_source,
        created_at,
        updated_at
      `,
        { count: 'exact' }
      );

    // Apply search filter
    if (search) {
      query = query.or(`org_name.ilike.%${search}%,sales_poc.ilike.%${search}%,notes.ilike.%${search}%`);
    }

    // Apply stage filter
    if (stage && VALID_STAGES.includes(stage)) {
      query = query.eq('org_lifecycle_stage', stage);
    }

    // Apply sorting
    const validSortColumns = [
      'org_name',
      'org_lifecycle_stage',
      'deal_value',
      'deal_momentum',
      'sales_poc',
      'created_at',
      'updated_at',
    ];
    const actualSortBy = validSortColumns.includes(sortBy) ? sortBy : 'org_name';
    query = query.order(actualSortBy, { ascending: sortOrder === 'asc', nullsFirst: false });

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: organizations, error, count } = await query;

    if (error) {
      console.error('Error fetching organizations:', error);
      return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 });
    }

    // Calculate stage counts for summary
    const { data: stageCounts } = await supabase
      .from('trial_organizations')
      .select('org_lifecycle_stage')
      .then((res) => {
        if (!res.data) return { data: {} };
        const counts: Record<string, number> = {};
        res.data.forEach((org: { org_lifecycle_stage: string | null }) => {
          const stage = org.org_lifecycle_stage || 'unknown';
          counts[stage] = (counts[stage] || 0) + 1;
        });
        return { data: counts };
      });

    return NextResponse.json({
      organizations: organizations || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
      stageCounts: stageCounts || {},
      stageLabels: STAGE_LABELS,
      validStages: VALID_STAGES,
    });
  } catch (error) {
    console.error('Organizations list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organizations', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
