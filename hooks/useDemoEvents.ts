import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface DemoEvent {
  demo_id: string;
  org_id: string;
  demo_date: string;
  demo_time: string | null;
  sales_poc: string;
  demo_status: 'scheduled' | 'completed' | 'cancelled';
  attendee_names: string[] | null;
  demo_observations: string | null;
  pain_points: string | null;
  next_steps: string | null;
  demo_rating: number | null;
  created_at: string;
  updated_at: string;
  trial_organizations?: {
    org_id: string;
    org_name: string;
    org_logo_url: string | null;
  };
}

export interface DemoEventInput {
  org_id: string;
  demo_date: string;
  demo_time?: string;
  sales_poc: string;
  demo_status?: 'scheduled' | 'completed' | 'cancelled';
  attendee_names?: string[];
  demo_observations?: string;
  pain_points?: string;
  next_steps?: string;
  demo_rating?: number | null;
}

interface DemoFilters {
  orgId?: string;
  status?: 'scheduled' | 'completed' | 'cancelled' | 'all';
  startDate?: string;
  endDate?: string;
}

// Query keys factory
export const demoEventsKeys = {
  all: ['demo-events'] as const,
  list: (filters?: DemoFilters) => [...demoEventsKeys.all, 'list', filters] as const,
  detail: (id: string) => [...demoEventsKeys.all, 'detail', id] as const,
};

// Fetch demo events
async function fetchDemoEvents(filters?: DemoFilters): Promise<DemoEvent[]> {
  const params = new URLSearchParams();
  if (filters?.orgId) params.set('org_id', filters.orgId);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.startDate) params.set('start_date', filters.startDate);
  if (filters?.endDate) params.set('end_date', filters.endDate);

  const response = await fetch(`/api/quote/demos?${params.toString()}`);
  const data = await response.json();

  if (data.error) {
    throw new Error(data.error);
  }

  return data.data || [];
}

// Create demo event
async function createDemoEvent(input: DemoEventInput): Promise<DemoEvent> {
  const response = await fetch('/api/quote/demos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await response.json();

  if (data.error) {
    throw new Error(data.error);
  }

  return data.data;
}

// Update demo event
async function updateDemoEvent({ demoId, updates }: { demoId: string; updates: Partial<DemoEventInput> }): Promise<DemoEvent> {
  const response = await fetch('/api/quote/demos', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ demo_id: demoId, updates }),
  });
  const data = await response.json();

  if (data.error) {
    throw new Error(data.error);
  }

  return data.data;
}

// Delete demo event
async function deleteDemoEvent(demoId: string): Promise<void> {
  const response = await fetch(`/api/quote/demos?demo_id=${demoId}`, {
    method: 'DELETE',
  });
  const data = await response.json();

  if (data.error) {
    throw new Error(data.error);
  }
}

// Hook to fetch demo events
export function useDemoEvents(filters?: DemoFilters) {
  return useQuery({
    queryKey: demoEventsKeys.list(filters),
    queryFn: () => fetchDemoEvents(filters),
    staleTime: 30_000, // 30 seconds
  });
}

// Hook to create a demo event
export function useCreateDemoEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createDemoEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: demoEventsKeys.all });
    },
  });
}

// Hook to update a demo event
export function useUpdateDemoEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateDemoEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: demoEventsKeys.all });
    },
  });
}

// Hook to delete a demo event
export function useDeleteDemoEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteDemoEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: demoEventsKeys.all });
    },
  });
}
