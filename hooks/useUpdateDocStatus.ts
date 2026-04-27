import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { QuoteMsaStats } from './useQuoteMsaStats';

export type DocStatus = 'draft' | 'downloaded' | 'sent' | 'signed';
type DocType = 'Quote' | 'MSA';

interface UpdateArgs {
  id: string;
  type: DocType;
  status: DocStatus;
}

async function updateStatus({ id, type, status }: UpdateArgs) {
  const url = type === 'Quote' ? `/api/quote/${id}` : `/api/msa/${id}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update status');
  }
  return res.json();
}

export function useUpdateDocStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateStatus,
    onMutate: async ({ id, type, status }) => {
      await queryClient.cancelQueries({ queryKey: ['quote-msa-stats'] });
      const previous = queryClient.getQueryData<QuoteMsaStats>(['quote-msa-stats']);

      if (previous) {
        const next: QuoteMsaStats = JSON.parse(JSON.stringify(previous));
        const bucket = type === 'Quote' ? next.quotes.recent : next.msas.recent;
        const idx = bucket.findIndex((d) => d.id === id);
        if (idx >= 0) bucket[idx].status = status;
        queryClient.setQueryData(['quote-msa-stats'], next);
      }

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['quote-msa-stats'], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['quote-msa-stats'] });
    },
  });
}
