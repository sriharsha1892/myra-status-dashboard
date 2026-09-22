import { useQuery } from '@tanstack/react-query';
import type { LegacyLineItem, StoredPricingOption } from '@/lib/quote/types';

export interface QuoteDetailRecord {
  id: string;
  quote_reference: string;
  version?: number | null;
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_title?: string | null;
  currency: string;
  prepared_by: string;
  prepared_by_email?: string | null;
  status?: string | null;
  download_count?: number | null;
  created_at: string;
  quote_date?: string;
  valid_until?: string;
  first_sent_at?: string | null;
  deal_context?: Record<string, unknown> | null;
  pricing_options?: StoredPricingOption[] | null;
  line_items?: LegacyLineItem[] | null;
  option_count?: number | null;
  value_min?: number | string | null;
  value_max?: number | string | null;
}

async function fetchQuote(id: string): Promise<QuoteDetailRecord> {
  const res = await fetch(`/api/quote/${id}`);
  if (!res.ok) throw new Error('Failed to load quote');
  const data = await res.json();
  return data.quote as QuoteDetailRecord;
}

export function useQuoteDetail(id: string | null) {
  return useQuery({
    queryKey: ['quote-detail', id],
    queryFn: () => fetchQuote(id as string),
    enabled: !!id,
    staleTime: 60_000,
  });
}
