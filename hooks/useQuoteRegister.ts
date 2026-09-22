import { useQuery } from '@tanstack/react-query';
import type { QuoteRegisterResponse } from '@/lib/quote/types';

export const QUOTE_REGISTER_KEY = ['quote-register'] as const;

async function fetchQuoteRegister(): Promise<QuoteRegisterResponse> {
  const response = await fetch('/api/quote/list');
  if (!response.ok) {
    throw new Error('Failed to load quote register');
  }
  return response.json();
}

export function useQuoteRegister() {
  return useQuery({
    queryKey: QUOTE_REGISTER_KEY,
    queryFn: fetchQuoteRegister,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}
