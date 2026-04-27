import { useQuery } from '@tanstack/react-query';

type DocType = 'Quote' | 'MSA';

export interface DocDetailRecord {
  id: string;
  // Common
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_title?: string | null;
  currency: string;
  total_value: number;
  prepared_by: string;
  prepared_by_email?: string | null;
  status?: string | null;
  download_count?: number | null;
  version?: number | null;
  created_at: string;
  line_items: unknown;

  // Quote-only
  quote_reference?: string;
  quote_date?: string;
  valid_until?: string;
  deal_context?: Record<string, unknown> | null;
  first_sent_at?: string | null;

  // MSA-only
  msa_reference?: string;
  effective_date?: string;
  jurisdiction?: string;
  client_address?: string | null;
  client_country?: string | null;
  consulting_hours?: number | null;
  additional_hour_rate?: number | null;
  include_consulting?: boolean | null;
  special_terms?: string | null;
}

async function fetchDoc(type: DocType, id: string): Promise<DocDetailRecord> {
  const url = type === 'Quote' ? `/api/quote/${id}` : `/api/msa/${id}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to load document');
  const data = await res.json();
  return (type === 'Quote' ? data.quote : data.msa) as DocDetailRecord;
}

export function useDocDetail(type: DocType | null, id: string | null) {
  return useQuery({
    queryKey: ['doc-detail', type, id],
    queryFn: () => fetchDoc(type as DocType, id as string),
    enabled: !!type && !!id,
    staleTime: 60_000,
  });
}
