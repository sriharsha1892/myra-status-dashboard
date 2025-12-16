import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const preparedBy = searchParams.get('preparedBy');
    const companyName = searchParams.get('companyName');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const supabase = createServiceClient();

    // Build query
    let query = supabase
      .from('quotes')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply filters
    if (preparedBy) {
      query = query.eq('prepared_by', preparedBy);
    }
    if (companyName) {
      query = query.ilike('company_name', `%${companyName}%`);
    }
    if (startDate) {
      query = query.gte('quote_date', startDate);
    }
    if (endDate) {
      query = query.lte('quote_date', endDate);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching quotes:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch quotes' },
        { status: 500 }
      );
    }

    // Get summary stats
    const { data: stats } = await supabase
      .from('quotes')
      .select('prepared_by, currency, total_value');

    // Calculate stats by AM
    const amStats: Record<string, { count: number; totalValue: number }> = {};
    const currencyTotals: Record<string, number> = {};

    stats?.forEach((q) => {
      // AM stats
      if (!amStats[q.prepared_by]) {
        amStats[q.prepared_by] = { count: 0, totalValue: 0 };
      }
      amStats[q.prepared_by].count++;
      amStats[q.prepared_by].totalValue += parseFloat(q.total_value);

      // Currency totals
      const curr = q.currency;
      if (!currencyTotals[curr]) {
        currencyTotals[curr] = 0;
      }
      currencyTotals[curr] += parseFloat(q.total_value);
    });

    return NextResponse.json({
      success: true,
      quotes: data,
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
      stats: {
        totalQuotes: count,
        byAM: amStats,
        byCurrency: currencyTotals,
      },
    });
  } catch (error) {
    console.error('Quote admin error:', error);
    return NextResponse.json(
      { success: false, error: 'Invalid request' },
      { status: 400 }
    );
  }
}
