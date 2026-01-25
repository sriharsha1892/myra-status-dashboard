import { useQuery } from '@tanstack/react-query';

export interface QuoteMsaStats {
  quotes: {
    total: number;
    thisWeek: number;
    thisMonth: number;
    totalValue: number;
    recent: Array<{
      id: string;
      reference: string;
      companyName: string;
      totalValue: number;
      preparedBy: string;
      createdAt: string;
      currency: string;
    }>;
  };
  msas: {
    total: number;
    thisWeek: number;
    thisMonth: number;
    totalValue: number;
    recent: Array<{
      id: string;
      reference: string;
      companyName: string;
      totalValue: number;
      preparedBy: string;
      createdAt: string;
      currency: string;
    }>;
  };
  byPreparedBy: Record<
    string,
    {
      quotes: number;
      msas: number;
      quoteValue: number;
      msaValue: number;
    }
  >;
}

async function fetchQuoteMsaStats(): Promise<QuoteMsaStats> {
  const response = await fetch('/api/quote/stats');
  if (!response.ok) {
    throw new Error('Failed to fetch quote/MSA stats');
  }
  return response.json();
}

export function useQuoteMsaStats() {
  return useQuery({
    queryKey: ['quote-msa-stats'],
    queryFn: fetchQuoteMsaStats,
    staleTime: 30_000, // 30 seconds
    refetchOnWindowFocus: false,
  });
}
