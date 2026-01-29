import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface SnapshotData {
  date: string;
  [key: string]: string | number;
}

interface SnapshotResponse {
  data: SnapshotData[];
  error?: string;
}

interface CaptureResponse {
  success: boolean;
  error?: string;
}

// Query keys
export const pipelineSnapshotKeys = {
  all: ['pipeline-snapshots'] as const,
  list: (days: number) => [...pipelineSnapshotKeys.all, 'list', days] as const,
};

// Fetch snapshots
async function fetchSnapshots(days: number): Promise<SnapshotData[]> {
  const response = await fetch(`/api/cron/pipeline-snapshot?days=${days}`);
  const data: SnapshotResponse = await response.json();

  if (data.error) {
    throw new Error(data.error);
  }

  return data.data || [];
}

// Capture new snapshot
async function captureSnapshot(): Promise<CaptureResponse> {
  const response = await fetch('/api/cron/pipeline-snapshot', {
    method: 'POST',
  });
  const data: CaptureResponse = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to capture snapshot');
  }

  return data;
}

/**
 * Hook to fetch pipeline snapshot data
 */
export function usePipelineSnapshots(days: number, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: pipelineSnapshotKeys.list(days),
    queryFn: () => fetchSnapshots(days),
    staleTime: 60_000, // 1 minute
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook to capture a new pipeline snapshot
 */
export function useCaptureSnapshot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: captureSnapshot,
    onSuccess: () => {
      // Invalidate all snapshot queries to refetch
      queryClient.invalidateQueries({ queryKey: pipelineSnapshotKeys.all });
    },
  });
}
