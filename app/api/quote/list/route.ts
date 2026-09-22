import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import {
  effectiveStatus,
  flattenOptions,
  groupByAccount,
  normaliseStatus,
  valueRange,
} from '@/lib/quote/register';
import type {
  Currency,
  EffectiveStatus,
  LegacyLineItem,
  PricingModel,
  QuoteRegisterResponse,
  RegisterQuote,
  StoredPricingOption,
} from '@/lib/quote/types';
import { EFFECTIVE_STATUSES } from '@/lib/quote/types';

export const dynamic = 'force-dynamic';

interface QuoteRow {
  id: string;
  quote_reference: string;
  version: number | null;
  company_name: string;
  contact_name: string | null;
  contact_email: string | null;
  prepared_by: string | null;
  currency: string | null;
  status: string | null;
  created_at: string;
  quote_date: string | null;
  valid_until: string | null;
  download_count: number | null;
  option_count: number | null;
  value_min: number | string | null;
  value_max: number | string | null;
  pricing_options: StoredPricingOption[] | null;
  line_items: LegacyLineItem[] | null;
}

const SELECT =
  'id, quote_reference, version, company_name, contact_name, contact_email, prepared_by, currency, status, created_at, quote_date, valid_until, download_count, option_count, value_min, value_max, pricing_options, line_items';

function toNumber(v: number | string | null): number | null {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

function toRegisterQuote(row: QuoteRow, now: Date): RegisterQuote {
  const options = flattenOptions(row.pricing_options, row.line_items);
  // Prefer persisted range; derive when the migration hasn't populated it yet.
  const derived = valueRange(options);
  const status = normaliseStatus(row.status);
  return {
    id: row.id,
    reference: row.quote_reference,
    version: row.version || 1,
    companyName: row.company_name,
    contactName: row.contact_name || '',
    contactEmail: row.contact_email || '',
    preparedBy: row.prepared_by || '',
    currency: (row.currency || 'USD') as Currency,
    status,
    effectiveStatus: effectiveStatus(status, row.valid_until, now),
    createdAt: row.created_at,
    quoteDate: row.quote_date || row.created_at,
    validUntil: row.valid_until,
    downloadCount: row.download_count || 0,
    optionCount: row.option_count ?? options.length,
    valueMin: toNumber(row.value_min) ?? derived.min,
    valueMax: toNumber(row.value_max) ?? derived.max,
    options,
  };
}

export async function GET() {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('quotes')
      .select(SELECT)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch quotes for register:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const now = new Date();
    const quotes = ((data || []) as unknown as QuoteRow[]).map((r) => toRegisterQuote(r, now));
    const accounts = groupByAccount(quotes);

    // Facets
    const amCounts = new Map<string, number>();
    const termSet = new Set<string>();
    const modelSet = new Set<PricingModel>();
    const statusCounts = new Map<EffectiveStatus, number>();
    let optionTotal = 0;

    quotes.forEach((q) => {
      if (q.preparedBy) amCounts.set(q.preparedBy, (amCounts.get(q.preparedBy) || 0) + 1);
      statusCounts.set(q.effectiveStatus, (statusCounts.get(q.effectiveStatus) || 0) + 1);
      optionTotal += q.options.length;
      q.options.forEach((o) => {
        if (o.term) termSet.add(o.term);
        modelSet.add(o.model);
      });
    });

    const body: QuoteRegisterResponse = {
      accounts,
      facets: {
        ams: Array.from(amCounts.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => a.name.localeCompare(b.name)),
        terms: Array.from(termSet).sort(termOrder),
        models: (['per-seat', 'per-project'] as PricingModel[]).filter((m) => modelSet.has(m)),
        statuses: EFFECTIVE_STATUSES.map((status) => ({
          status,
          count: statusCounts.get(status) || 0,
        })),
      },
      totals: { accounts: accounts.length, quotes: quotes.length, options: optionTotal },
    };

    return NextResponse.json(body);
  } catch (error) {
    console.error('Quote register error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to load quote register', details: message }, { status: 500 });
  }
}

/** "1-Year" < "2-Year" < "3-Year" < everything else alphabetically. */
function termOrder(a: string, b: string): number {
  const na = parseInt(a, 10);
  const nb = parseInt(b, 10);
  const aNum = !Number.isNaN(na);
  const bNum = !Number.isNaN(nb);
  if (aNum && bNum) return na - nb;
  if (aNum) return -1;
  if (bNum) return 1;
  return a.localeCompare(b);
}
