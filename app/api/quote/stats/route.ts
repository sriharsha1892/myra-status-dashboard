import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface QuoteRecord {
  id: string;
  quote_reference: string;
  company_name: string;
  total_value: number;
  prepared_by: string;
  created_at: string;
  currency: string;
}

interface MsaRecord {
  id: string;
  msa_reference: string;
  company_name: string;
  total_value: number;
  prepared_by: string;
  created_at: string;
  currency: string;
}

export async function GET() {
  try {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(now);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    // Fetch all quotes
    const { data: quotes, error: quotesError } = await supabase
      .from('quotes')
      .select('id, quote_reference, company_name, total_value, prepared_by, created_at, currency')
      .order('created_at', { ascending: false });

    if (quotesError) {
      console.error('Failed to fetch quotes:', quotesError);
      return NextResponse.json({ error: quotesError.message }, { status: 500 });
    }

    // Fetch all MSAs
    const { data: msas, error: msasError } = await supabase
      .from('msas')
      .select('id, msa_reference, company_name, total_value, prepared_by, created_at, currency')
      .order('created_at', { ascending: false });

    if (msasError) {
      console.error('Failed to fetch MSAs:', msasError);
      return NextResponse.json({ error: msasError.message }, { status: 500 });
    }

    const typedQuotes = (quotes || []) as QuoteRecord[];
    const typedMsas = (msas || []) as MsaRecord[];

    // Calculate quote stats
    const quotesThisWeek = typedQuotes.filter(
      (q) => new Date(q.created_at) >= weekAgo
    ).length;
    const quotesThisMonth = typedQuotes.filter(
      (q) => new Date(q.created_at) >= monthAgo
    ).length;
    const quotesTotalValue = typedQuotes.reduce(
      (sum, q) => sum + (q.total_value || 0),
      0
    );

    // Calculate MSA stats
    const msasThisWeek = typedMsas.filter(
      (m) => new Date(m.created_at) >= weekAgo
    ).length;
    const msasThisMonth = typedMsas.filter(
      (m) => new Date(m.created_at) >= monthAgo
    ).length;
    const msasTotalValue = typedMsas.reduce(
      (sum, m) => sum + (m.total_value || 0),
      0
    );

    // Calculate by prepared_by
    const byPreparedBy: Record<
      string,
      { quotes: number; msas: number; quoteValue: number; msaValue: number }
    > = {};

    typedQuotes.forEach((q) => {
      const name = q.prepared_by || 'Unknown';
      if (!byPreparedBy[name]) {
        byPreparedBy[name] = { quotes: 0, msas: 0, quoteValue: 0, msaValue: 0 };
      }
      byPreparedBy[name].quotes += 1;
      byPreparedBy[name].quoteValue += q.total_value || 0;
    });

    typedMsas.forEach((m) => {
      const name = m.prepared_by || 'Unknown';
      if (!byPreparedBy[name]) {
        byPreparedBy[name] = { quotes: 0, msas: 0, quoteValue: 0, msaValue: 0 };
      }
      byPreparedBy[name].msas += 1;
      byPreparedBy[name].msaValue += m.total_value || 0;
    });

    return NextResponse.json({
      quotes: {
        total: typedQuotes.length,
        thisWeek: quotesThisWeek,
        thisMonth: quotesThisMonth,
        totalValue: quotesTotalValue,
        recent: typedQuotes.slice(0, 5).map((q) => ({
          id: q.id,
          reference: q.quote_reference,
          companyName: q.company_name,
          totalValue: q.total_value,
          preparedBy: q.prepared_by,
          createdAt: q.created_at,
          currency: q.currency,
        })),
      },
      msas: {
        total: typedMsas.length,
        thisWeek: msasThisWeek,
        thisMonth: msasThisMonth,
        totalValue: msasTotalValue,
        recent: typedMsas.slice(0, 5).map((m) => ({
          id: m.id,
          reference: m.msa_reference,
          companyName: m.company_name,
          totalValue: m.total_value,
          preparedBy: m.prepared_by,
          createdAt: m.created_at,
          currency: m.currency,
        })),
      },
      byPreparedBy,
    });
  } catch (error) {
    console.error('Quote stats error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch quote/MSA stats', details: errorMessage },
      { status: 500 }
    );
  }
}
