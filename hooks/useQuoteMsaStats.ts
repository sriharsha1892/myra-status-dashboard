import { useQuery } from '@tanstack/react-query';

interface RecentItem {
  id: string;
  reference: string;
  companyName: string;
  totalValue: number;
  preparedBy: string;
  createdAt: string;
  currency: string;
  status?: string;
  downloadCount?: number;
  version?: number;
}

interface StatusCounts {
  draft: number;
  downloaded: number;
  sent: number;
  signed: number;
}

interface DocumentStats {
  // Unique counts (deduped - primary metrics)
  unique: number;
  uniqueThisWeek: number;
  uniqueThisMonth: number;
  uniqueTotalValue: number;

  // Total versions (all records including duplicates)
  totalVersions: number;

  // Legacy fields (mapped to unique for backwards compatibility)
  total: number;
  thisWeek: number;
  thisMonth: number;
  totalValue: number;

  // Download metrics
  totalDownloads: number;

  // Status breakdown
  byStatus: StatusCounts;

  // Recent items
  recent: RecentItem[];
}

interface PreparedByStats {
  quotes: number;
  msas: number;
  quoteValue: number;
  msaValue: number;
  totalDownloads: number;
}

interface DuplicateQuote {
  id: string;
  version: number;
  createdAt: string;
  totalValue: number;
}

interface DuplicateGroup {
  companyName: string;
  contactEmail: string;
  versions: number;
  quotes: DuplicateQuote[];
}

export interface QuoteMsaStats {
  quotes: DocumentStats;
  msas: DocumentStats;
  byPreparedBy: Record<string, PreparedByStats>;
  duplicates: {
    count: number;
    groups: DuplicateGroup[];
  };
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

// Helper function to format currency values
export function formatStatsCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

// Export types for use in other components
export type { RecentItem, StatusCounts, DocumentStats, PreparedByStats, DuplicateGroup, DuplicateQuote };
