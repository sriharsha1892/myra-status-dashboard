import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface QueryResult {
  type: 'quotes' | 'msas' | 'organizations' | 'mixed';
  count: number;
  totalValue?: number;
  data: Array<Record<string, unknown>>;
  interpretation: string;
  filters: Record<string, unknown>;
}

// Simple NL parsing without external API calls
function parseNaturalLanguageQuery(query: string): {
  dataType: 'quotes' | 'msas' | 'organizations' | 'mixed';
  filters: Record<string, unknown>;
  interpretation: string;
} {
  const lowerQuery = query.toLowerCase();
  const filters: Record<string, unknown> = {};
  let dataType: 'quotes' | 'msas' | 'organizations' | 'mixed' = 'mixed';
  const interpretationParts: string[] = [];

  // Detect data type
  if (lowerQuery.includes('quote')) {
    dataType = 'quotes';
    interpretationParts.push('Searching quotes');
  } else if (lowerQuery.includes('msa') || lowerQuery.includes('agreement')) {
    dataType = 'msas';
    interpretationParts.push('Searching MSAs');
  } else if (
    lowerQuery.includes('deal') ||
    lowerQuery.includes('org') ||
    lowerQuery.includes('company') ||
    lowerQuery.includes('trial')
  ) {
    dataType = 'organizations';
    interpretationParts.push('Searching organizations');
  } else {
    interpretationParts.push('Searching all documents');
  }

  // Detect value filters
  const valueMatch = lowerQuery.match(/over\s*\$?([\d,]+)k?/i);
  if (valueMatch) {
    let value = parseInt(valueMatch[1].replace(/,/g, ''), 10);
    if (lowerQuery.includes('k')) value *= 1000;
    filters.minValue = value;
    interpretationParts.push(`with value > $${value.toLocaleString()}`);
  }

  const underMatch = lowerQuery.match(/under\s*\$?([\d,]+)k?/i);
  if (underMatch) {
    let value = parseInt(underMatch[1].replace(/,/g, ''), 10);
    if (lowerQuery.includes('k')) value *= 1000;
    filters.maxValue = value;
    interpretationParts.push(`with value < $${value.toLocaleString()}`);
  }

  // Detect time filters
  if (
    lowerQuery.includes('this week') ||
    lowerQuery.includes('past week') ||
    lowerQuery.includes('last 7 days')
  ) {
    filters.timeRange = 'week';
    interpretationParts.push('from this week');
  } else if (
    lowerQuery.includes('this month') ||
    lowerQuery.includes('past month') ||
    lowerQuery.includes('last 30 days')
  ) {
    filters.timeRange = 'month';
    interpretationParts.push('from this month');
  } else if (lowerQuery.includes('today')) {
    filters.timeRange = 'today';
    interpretationParts.push('from today');
  }

  // Detect status filters
  if (lowerQuery.includes('stall') || lowerQuery.includes('stuck')) {
    filters.stalled = true;
    interpretationParts.push('that are stalled');
  }
  if (lowerQuery.includes('expir')) {
    filters.expiring = true;
    interpretationParts.push('that are expiring');
  }
  if (lowerQuery.includes('pending') || lowerQuery.includes('open')) {
    filters.status = 'pending';
    interpretationParts.push('with pending status');
  }
  if (lowerQuery.includes('closed') || lowerQuery.includes('won')) {
    filters.status = 'onboarded';
    interpretationParts.push('that are closed/won');
  }
  if (lowerQuery.includes('lost')) {
    filters.status = 'lost';
    interpretationParts.push('that are lost');
  }

  // Detect prepared_by / sales_poc filter
  const byMatch = lowerQuery.match(/(?:by|from)\s+([a-z]+(?:\s+[a-z]+)?)/i);
  if (byMatch && !['this', 'last', 'past'].includes(byMatch[1].toLowerCase())) {
    filters.preparedBy = byMatch[1];
    interpretationParts.push(`prepared by ${byMatch[1]}`);
  }

  // Detect sorting
  if (lowerQuery.includes('top') || lowerQuery.includes('highest')) {
    filters.sort = 'desc';
    filters.sortBy = 'value';
    interpretationParts.push('sorted by highest value');
  } else if (lowerQuery.includes('recent') || lowerQuery.includes('latest')) {
    filters.sort = 'desc';
    filters.sortBy = 'date';
    interpretationParts.push('sorted by most recent');
  }

  // Detect limit
  const limitMatch = lowerQuery.match(/(?:top|first|show)\s*(\d+)/i);
  if (limitMatch) {
    filters.limit = parseInt(limitMatch[1], 10);
    interpretationParts.push(`limited to ${limitMatch[1]} results`);
  }

  return {
    dataType,
    filters,
    interpretation: interpretationParts.join(' '),
  };
}

export async function POST(request: Request) {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query string required' },
        { status: 400 }
      );
    }

    const { dataType, filters, interpretation } = parseNaturalLanguageQuery(query);

    // Build date filters
    const now = new Date();
    let dateFilter: Date | null = null;
    if (filters.timeRange === 'week') {
      dateFilter = new Date(now);
      dateFilter.setDate(dateFilter.getDate() - 7);
    } else if (filters.timeRange === 'month') {
      dateFilter = new Date(now);
      dateFilter.setMonth(dateFilter.getMonth() - 1);
    } else if (filters.timeRange === 'today') {
      dateFilter = new Date(now);
      dateFilter.setHours(0, 0, 0, 0);
    }

    const results: QueryResult = {
      type: dataType,
      count: 0,
      data: [],
      interpretation,
      filters,
    };

    // Query quotes
    if (dataType === 'quotes' || dataType === 'mixed') {
      let quotesQuery = supabase
        .from('quotes')
        .select('id, quote_reference, company_name, contact_email, total_value, created_at, valid_until, prepared_by, status, download_count');

      if (filters.minValue) {
        quotesQuery = quotesQuery.gte('total_value', filters.minValue);
      }
      if (filters.maxValue) {
        quotesQuery = quotesQuery.lte('total_value', filters.maxValue);
      }
      if (dateFilter) {
        quotesQuery = quotesQuery.gte('created_at', dateFilter.toISOString());
      }
      if (filters.preparedBy) {
        quotesQuery = quotesQuery.ilike('prepared_by', `%${filters.preparedBy}%`);
      }
      if (filters.expiring) {
        const threeDaysFromNow = new Date(now);
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
        quotesQuery = quotesQuery
          .gte('valid_until', now.toISOString())
          .lte('valid_until', threeDaysFromNow.toISOString());
      }

      // Apply sorting
      if (filters.sortBy === 'value') {
        quotesQuery = quotesQuery.order('total_value', {
          ascending: filters.sort !== 'desc',
        });
      } else {
        quotesQuery = quotesQuery.order('created_at', {
          ascending: filters.sort !== 'desc',
        });
      }

      // Apply limit
      const limit = (filters.limit as number) || 20;
      quotesQuery = quotesQuery.limit(limit);

      const { data: quotes } = await quotesQuery;
      if (quotes && quotes.length > 0) {
        results.data.push(
          ...quotes.map((q) => ({
            ...q,
            type: 'quote',
          }))
        );
        results.totalValue = (results.totalValue || 0) +
          quotes.reduce((sum, q) => sum + (q.total_value || 0), 0);
      }
    }

    // Query MSAs
    if (dataType === 'msas' || dataType === 'mixed') {
      let msasQuery = supabase
        .from('msas')
        .select('id, msa_reference, company_name, contact_email, total_value, created_at, prepared_by, status, download_count');

      if (filters.minValue) {
        msasQuery = msasQuery.gte('total_value', filters.minValue);
      }
      if (filters.maxValue) {
        msasQuery = msasQuery.lte('total_value', filters.maxValue);
      }
      if (dateFilter) {
        msasQuery = msasQuery.gte('created_at', dateFilter.toISOString());
      }
      if (filters.preparedBy) {
        msasQuery = msasQuery.ilike('prepared_by', `%${filters.preparedBy}%`);
      }

      // Apply sorting
      if (filters.sortBy === 'value') {
        msasQuery = msasQuery.order('total_value', {
          ascending: filters.sort !== 'desc',
        });
      } else {
        msasQuery = msasQuery.order('created_at', {
          ascending: filters.sort !== 'desc',
        });
      }

      // Apply limit
      const limit = (filters.limit as number) || 20;
      msasQuery = msasQuery.limit(limit);

      const { data: msas } = await msasQuery;
      if (msas && msas.length > 0) {
        results.data.push(
          ...msas.map((m) => ({
            ...m,
            type: 'msa',
          }))
        );
        results.totalValue = (results.totalValue || 0) +
          msas.reduce((sum, m) => sum + (m.total_value || 0), 0);
      }
    }

    // Query organizations
    if (dataType === 'organizations' || dataType === 'mixed') {
      let orgsQuery = supabase
        .from('trial_organizations')
        .select('id, org_name, status, sales_poc, updated_at, deal_value, trial_status');

      if (filters.minValue) {
        orgsQuery = orgsQuery.gte('deal_value', filters.minValue);
      }
      if (filters.maxValue) {
        orgsQuery = orgsQuery.lte('deal_value', filters.maxValue);
      }
      if (dateFilter) {
        orgsQuery = orgsQuery.gte('updated_at', dateFilter.toISOString());
      }
      if (filters.status) {
        orgsQuery = orgsQuery.eq('status', filters.status);
      }
      if (filters.preparedBy) {
        orgsQuery = orgsQuery.ilike('sales_poc', `%${filters.preparedBy}%`);
      }
      if (filters.stalled) {
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        orgsQuery = orgsQuery
          .in('status', ['demo', 'trial', 'proposal'])
          .lt('updated_at', weekAgo.toISOString());
      }

      // Apply sorting
      if (filters.sortBy === 'value') {
        orgsQuery = orgsQuery.order('deal_value', {
          ascending: filters.sort !== 'desc',
        });
      } else {
        orgsQuery = orgsQuery.order('updated_at', {
          ascending: filters.sort !== 'desc',
        });
      }

      // Apply limit
      const limit = (filters.limit as number) || 20;
      orgsQuery = orgsQuery.limit(limit);

      const { data: orgs } = await orgsQuery;
      if (orgs && orgs.length > 0) {
        results.data.push(
          ...orgs.map((o) => ({
            ...o,
            type: 'organization',
          }))
        );
        results.totalValue = (results.totalValue || 0) +
          orgs.reduce((sum, o) => sum + (o.deal_value || 0), 0);
      }
    }

    results.count = results.data.length;

    // Sort mixed results by date if applicable
    if (dataType === 'mixed' && results.data.length > 0) {
      results.data.sort((a, b) => {
        const dateA = new Date(
          (a.created_at as string) || (a.updated_at as string) || 0
        );
        const dateB = new Date(
          (b.created_at as string) || (b.updated_at as string) || 0
        );
        return dateB.getTime() - dateA.getTime();
      });
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Query error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to execute query', details: errorMessage },
      { status: 500 }
    );
  }
}

// GET endpoint for saved queries / suggestions
export async function GET() {
  return NextResponse.json({
    suggestions: [
      'Show deals over $50K this month',
      'Quotes expiring this week',
      'Top 10 MSAs by value',
      'Stalled deals in pipeline',
      'Recent quotes by Sarah',
      'Lost deals this month',
      'Active trials',
      'Pending proposals',
    ],
    recentQueries: [], // Could be persisted per user
  });
}
