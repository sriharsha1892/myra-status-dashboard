import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  parseMyraUsageText,
  fuzzyMatchUser,
  aggregateByUser,
  aggregateByDate,
  type ParsedUsageEntry,
} from '@/lib/parsers/myra-usage-parser';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface UserMapping {
  user_name: string;
  org_id: string;
  user_id: string | null;
}

interface ParseResponse {
  success: boolean;
  entries: Array<
    ParsedUsageEntry & {
      matched_user_id: string | null;
      matched_org_id: string | null;
      match_confidence: 'high' | 'low' | 'none';
      suggested_org_name: string | null;
    }
  >;
  summary: {
    totalParsed: number;
    totalCost: number;
    uniqueUsers: number;
    matchedUsers: number;
    unmatchedUsers: number;
  };
  aggregations: {
    byUser: ReturnType<typeof aggregateByUser>;
    byDate: ReturnType<typeof aggregateByDate>;
  };
  errors: string[];
}

/**
 * POST - Parse usage text and match users
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { text } = body as { text: string };

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'No text provided' },
        { status: 400 }
      );
    }

    // Parse the text
    const { entries, errors, summary } = parseMyraUsageText(text);

    if (entries.length === 0) {
      return NextResponse.json(
        {
          error: 'No valid entries found in the text',
          parseErrors: errors,
        },
        { status: 400 }
      );
    }

    // Fetch known users and cached mappings
    const [usersResult, mappingsResult] = await Promise.all([
      supabase
        .from('trial_users')
        .select('id, name, org_id, trial_organizations(org_name)')
        .not('name', 'is', null),
      supabase.from('myra_user_org_mappings').select('user_name, org_id, user_id'),
    ]);

    const knownUsers =
      (usersResult.data || []).map((u) => ({
        id: u.id,
        name: u.name || '',
        org_id: u.org_id,
        org_name:
          (u.trial_organizations as { org_name: string } | null)?.org_name || '',
      }));

    const cachedMappings = new Map<string, UserMapping>();
    if (mappingsResult.data) {
      for (const m of mappingsResult.data) {
        // Skip entries with null/undefined user_name
        if (m.user_name) {
          cachedMappings.set(m.user_name.toLowerCase(), m as UserMapping);
        }
      }
    }

    // Match users for each entry
    let matchedUsers = 0;
    const enrichedEntries = entries.map((entry) => {
      // First check cached mappings (with null check)
      const cached = entry.user_name
        ? cachedMappings.get(entry.user_name.toLowerCase())
        : undefined;
      if (cached) {
        matchedUsers++;
        return {
          ...entry,
          matched_user_id: cached.user_id,
          matched_org_id: cached.org_id,
          match_confidence: 'high' as const,
          suggested_org_name: null,
        };
      }

      // Try fuzzy matching
      const { match, confidence } = fuzzyMatchUser(entry.user_name, knownUsers);
      if (match && confidence !== 'none') {
        matchedUsers++;
      }

      return {
        ...entry,
        matched_user_id: match?.id || null,
        matched_org_id: match?.org_id || null,
        match_confidence: confidence,
        suggested_org_name: match?.org_name || null,
      };
    });

    // Calculate aggregations
    const aggregations = {
      byUser: aggregateByUser(entries),
      byDate: aggregateByDate(entries),
    };

    const response: ParseResponse = {
      success: true,
      entries: enrichedEntries,
      summary: {
        ...summary,
        matchedUsers,
        unmatchedUsers: summary.uniqueUsers - matchedUsers,
      },
      aggregations,
      errors,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Parse usage error:', error);
    return NextResponse.json(
      { error: 'Failed to parse usage data' },
      { status: 500 }
    );
  }
}

/**
 * PUT - Save parsed entries to database
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { entries, saveUserMappings = true } = body as {
      entries: Array<{
        conversation_title: string;
        user_name: string;
        timestamp: string;
        cost: number;
        matched_user_id: string | null;
        matched_org_id: string | null;
        match_method: 'auto' | 'manual';
      }>;
      saveUserMappings?: boolean;
    };

    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json(
        { error: 'No entries provided' },
        { status: 400 }
      );
    }

    // Generate batch ID
    const batchId = crypto.randomUUID();

    // Insert usage logs
    const logsToInsert = entries.map((e) => ({
      conversation_title: e.conversation_title,
      user_name: e.user_name,
      usage_timestamp: e.timestamp,
      cost_usd: e.cost,
      matched_user_id: e.matched_user_id,
      matched_org_id: e.matched_org_id,
      match_method: e.match_method,
      import_batch_id: batchId,
    }));

    const { error: insertError, data: insertedLogs } = await supabase
      .from('myra_usage_logs')
      .insert(logsToInsert)
      .select('id');

    if (insertError) {
      console.error('Failed to insert usage logs:', insertError);
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    // Save user-org mappings for manually matched entries
    if (saveUserMappings) {
      const manualMappings = entries
        .filter((e) => e.match_method === 'manual' && e.matched_org_id)
        .map((e) => ({
          user_name: e.user_name,
          org_id: e.matched_org_id,
          user_id: e.matched_user_id,
          confidence: 'manual',
        }));

      if (manualMappings.length > 0) {
        // Upsert mappings
        await supabase
          .from('myra_user_org_mappings')
          .upsert(manualMappings, { onConflict: 'user_name' });
      }
    }

    return NextResponse.json({
      success: true,
      batchId,
      entriesSaved: insertedLogs?.length || 0,
    });
  } catch (error) {
    console.error('Save usage error:', error);
    return NextResponse.json(
      { error: 'Failed to save usage data' },
      { status: 500 }
    );
  }
}

/**
 * GET - Fetch aggregated usage stats
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Fetch usage summary
    const { data: summary } = await supabase
      .from('myra_usage_totals')
      .select('*')
      .single();

    // Fetch recent usage by date
    const { data: byDate } = await supabase
      .from('myra_usage_summary')
      .select('*')
      .gte('usage_date', startDate.toISOString().split('T')[0])
      .order('usage_date', { ascending: false });

    // Fetch top users
    const { data: topUsers } = await supabase
      .from('myra_usage_by_user')
      .select('*')
      .order('total_cost', { ascending: false })
      .limit(10);

    // Fetch organizations for context
    const orgIds = [...new Set((topUsers || []).map((u) => u.matched_org_id).filter(Boolean))];
    let orgNames: Record<string, string> = {};

    if (orgIds.length > 0) {
      const { data: orgs } = await supabase
        .from('trial_organizations')
        .select('id, org_name')
        .in('id', orgIds);

      orgNames = (orgs || []).reduce(
        (acc, o) => ({ ...acc, [o.id]: o.org_name }),
        {}
      );
    }

    return NextResponse.json({
      summary: summary || {
        total_conversations: 0,
        total_cost: 0,
        total_users: 0,
        total_orgs: 0,
      },
      byDate: byDate || [],
      topUsers: (topUsers || []).map((u) => ({
        ...u,
        org_name: u.matched_org_id ? orgNames[u.matched_org_id] : null,
      })),
    });
  } catch (error) {
    console.error('Get usage stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch usage stats' },
      { status: 500 }
    );
  }
}
