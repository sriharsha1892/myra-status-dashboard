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
  status?: string;
  download_count?: number;
  version?: number;
  contact_email?: string;
}

interface MsaRecord {
  id: string;
  msa_reference: string;
  company_name: string;
  total_value: number;
  prepared_by: string;
  created_at: string;
  currency: string;
  status?: string;
  download_count?: number;
  version?: number;
  contact_email?: string;
}

export async function GET() {
  try {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(now);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    // Fetch all quotes (for total versions count and detailed breakdown)
    const { data: allQuotes, error: quotesError } = await supabase
      .from('quotes')
      .select('id, quote_reference, company_name, total_value, prepared_by, created_at, currency, status, download_count, version, contact_email')
      .order('created_at', { ascending: false });

    if (quotesError) {
      console.error('Failed to fetch quotes:', quotesError);
      return NextResponse.json({ error: quotesError.message }, { status: 500 });
    }

    // Fetch unique quotes (latest version per client) using the view
    // Fallback to manual deduplication if view doesn't exist
    let uniqueQuotes: QuoteRecord[];
    const { data: uniqueQuotesData, error: uniqueQuotesError } = await supabase
      .from('quotes_unique')
      .select('id, quote_reference, company_name, total_value, prepared_by, created_at, currency, status, download_count, version, contact_email')
      .order('created_at', { ascending: false });

    if (uniqueQuotesError) {
      // View doesn't exist yet - manually deduplicate
      const quotesMap = new Map<string, QuoteRecord>();
      (allQuotes || []).forEach((q) => {
        const key = `${q.contact_email}|${q.company_name}`;
        const existing = quotesMap.get(key);
        if (!existing || (q.version || 1) > (existing.version || 1)) {
          quotesMap.set(key, q as QuoteRecord);
        }
      });
      uniqueQuotes = Array.from(quotesMap.values());
    } else {
      uniqueQuotes = (uniqueQuotesData || []) as QuoteRecord[];
    }

    // Fetch all MSAs
    const { data: allMsas, error: msasError } = await supabase
      .from('msas')
      .select('id, msa_reference, company_name, total_value, prepared_by, created_at, currency, status, download_count, version, contact_email')
      .order('created_at', { ascending: false });

    if (msasError) {
      console.error('Failed to fetch MSAs:', msasError);
      return NextResponse.json({ error: msasError.message }, { status: 500 });
    }

    // Fetch unique MSAs
    let uniqueMsas: MsaRecord[];
    const { data: uniqueMsasData, error: uniqueMsasError } = await supabase
      .from('msas_unique')
      .select('id, msa_reference, company_name, total_value, prepared_by, created_at, currency, status, download_count, version, contact_email')
      .order('created_at', { ascending: false });

    if (uniqueMsasError) {
      // View doesn't exist yet - manually deduplicate
      const msasMap = new Map<string, MsaRecord>();
      (allMsas || []).forEach((m) => {
        const key = `${m.contact_email}|${m.company_name}`;
        const existing = msasMap.get(key);
        if (!existing || (m.version || 1) > (existing.version || 1)) {
          msasMap.set(key, m as MsaRecord);
        }
      });
      uniqueMsas = Array.from(msasMap.values());
    } else {
      uniqueMsas = (uniqueMsasData || []) as MsaRecord[];
    }

    const typedAllQuotes = (allQuotes || []) as QuoteRecord[];
    const typedAllMsas = (allMsas || []) as MsaRecord[];

    // Calculate quote stats using UNIQUE quotes for accurate counting
    const uniqueQuotesThisWeek = uniqueQuotes.filter(
      (q) => new Date(q.created_at) >= weekAgo
    ).length;
    const uniqueQuotesThisMonth = uniqueQuotes.filter(
      (q) => new Date(q.created_at) >= monthAgo
    ).length;

    // Total value from UNIQUE quotes only (not inflated by versions)
    const uniqueQuotesTotalValue = uniqueQuotes.reduce(
      (sum, q) => sum + (q.total_value || 0),
      0
    );

    // Total downloads across all quotes
    const totalQuoteDownloads = typedAllQuotes.reduce(
      (sum, q) => sum + (q.download_count || 1),
      0
    );

    // Count by status
    const quotesByStatus = {
      draft: typedAllQuotes.filter(q => q.status === 'draft').length,
      downloaded: typedAllQuotes.filter(q => q.status === 'downloaded').length,
      sent: typedAllQuotes.filter(q => q.status === 'sent').length,
      signed: typedAllQuotes.filter(q => q.status === 'signed').length,
    };

    // Calculate MSA stats using UNIQUE MSAs
    const uniqueMsasThisWeek = uniqueMsas.filter(
      (m) => new Date(m.created_at) >= weekAgo
    ).length;
    const uniqueMsasThisMonth = uniqueMsas.filter(
      (m) => new Date(m.created_at) >= monthAgo
    ).length;
    const uniqueMsasTotalValue = uniqueMsas.reduce(
      (sum, m) => sum + (m.total_value || 0),
      0
    );

    // Total downloads across all MSAs
    const totalMsaDownloads = typedAllMsas.reduce(
      (sum, m) => sum + (m.download_count || 1),
      0
    );

    // Count by status
    const msasByStatus = {
      draft: typedAllMsas.filter(m => m.status === 'draft').length,
      downloaded: typedAllMsas.filter(m => m.status === 'downloaded').length,
      sent: typedAllMsas.filter(m => m.status === 'sent').length,
      signed: typedAllMsas.filter(m => m.status === 'signed').length,
    };

    // Calculate by prepared_by using unique quotes/MSAs
    const byPreparedBy: Record<
      string,
      { quotes: number; msas: number; quoteValue: number; msaValue: number; totalDownloads: number }
    > = {};

    uniqueQuotes.forEach((q) => {
      const name = q.prepared_by || 'Unknown';
      if (!byPreparedBy[name]) {
        byPreparedBy[name] = { quotes: 0, msas: 0, quoteValue: 0, msaValue: 0, totalDownloads: 0 };
      }
      byPreparedBy[name].quotes += 1;
      byPreparedBy[name].quoteValue += q.total_value || 0;
      byPreparedBy[name].totalDownloads += q.download_count || 1;
    });

    uniqueMsas.forEach((m) => {
      const name = m.prepared_by || 'Unknown';
      if (!byPreparedBy[name]) {
        byPreparedBy[name] = { quotes: 0, msas: 0, quoteValue: 0, msaValue: 0, totalDownloads: 0 };
      }
      byPreparedBy[name].msas += 1;
      byPreparedBy[name].msaValue += m.total_value || 0;
      byPreparedBy[name].totalDownloads += m.download_count || 1;
    });

    // Find potential duplicates (same company+email with multiple versions)
    const duplicateGroups: Array<{
      companyName: string;
      contactEmail: string;
      versions: number;
      quotes: Array<{ id: string; version: number; createdAt: string; totalValue: number }>;
    }> = [];

    const quotesByKey = new Map<string, QuoteRecord[]>();
    typedAllQuotes.forEach((q) => {
      const key = `${q.contact_email}|${q.company_name}`;
      if (!quotesByKey.has(key)) {
        quotesByKey.set(key, []);
      }
      quotesByKey.get(key)!.push(q);
    });

    quotesByKey.forEach((quotes, key) => {
      if (quotes.length > 1) {
        const [contactEmail, companyName] = key.split('|');
        duplicateGroups.push({
          companyName: companyName || 'Unknown',
          contactEmail: contactEmail || 'Unknown',
          versions: quotes.length,
          quotes: quotes
            .sort((a, b) => (b.version || 1) - (a.version || 1))
            .map((q) => ({
              id: q.id,
              version: q.version || 1,
              createdAt: q.created_at,
              totalValue: q.total_value,
            })),
        });
      }
    });

    return NextResponse.json({
      quotes: {
        // Unique counts (deduped - what you actually want)
        unique: uniqueQuotes.length,
        uniqueThisWeek: uniqueQuotesThisWeek,
        uniqueThisMonth: uniqueQuotesThisMonth,
        uniqueTotalValue: uniqueQuotesTotalValue,

        // Total versions (all records including duplicates)
        totalVersions: typedAllQuotes.length,

        // Legacy fields (mapped to unique counts for backwards compatibility)
        total: uniqueQuotes.length,
        thisWeek: uniqueQuotesThisWeek,
        thisMonth: uniqueQuotesThisMonth,
        totalValue: uniqueQuotesTotalValue,

        // Download metrics
        totalDownloads: totalQuoteDownloads,

        // Status breakdown
        byStatus: quotesByStatus,

        // Recent unique quotes
        recent: uniqueQuotes.slice(0, 5).map((q) => ({
          id: q.id,
          reference: q.quote_reference,
          companyName: q.company_name,
          totalValue: q.total_value,
          preparedBy: q.prepared_by,
          createdAt: q.created_at,
          currency: q.currency,
          status: q.status || 'draft',
          downloadCount: q.download_count || 1,
          version: q.version || 1,
        })),
      },
      msas: {
        // Unique counts
        unique: uniqueMsas.length,
        uniqueThisWeek: uniqueMsasThisWeek,
        uniqueThisMonth: uniqueMsasThisMonth,
        uniqueTotalValue: uniqueMsasTotalValue,

        // Total versions
        totalVersions: typedAllMsas.length,

        // Legacy fields
        total: uniqueMsas.length,
        thisWeek: uniqueMsasThisWeek,
        thisMonth: uniqueMsasThisMonth,
        totalValue: uniqueMsasTotalValue,

        // Download metrics
        totalDownloads: totalMsaDownloads,

        // Status breakdown
        byStatus: msasByStatus,

        // Recent unique MSAs
        recent: uniqueMsas.slice(0, 5).map((m) => ({
          id: m.id,
          reference: m.msa_reference,
          companyName: m.company_name,
          totalValue: m.total_value,
          preparedBy: m.prepared_by,
          createdAt: m.created_at,
          currency: m.currency,
          status: m.status || 'draft',
          downloadCount: m.download_count || 1,
          version: m.version || 1,
        })),
      },
      byPreparedBy,

      // Duplicate tracking for admin review
      duplicates: {
        count: duplicateGroups.length,
        groups: duplicateGroups.slice(0, 10), // Top 10 for initial display
      },
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
