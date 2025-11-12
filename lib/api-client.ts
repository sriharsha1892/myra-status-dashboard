/**
 * API Client Utility
 * Handles authenticated API requests with proper headers
 */

import { createClient } from '@/lib/supabase/client';

/**
 * Get authentication headers for API requests
 * Extracts access token from Supabase session and formats as Bearer token
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  return headers;
}

/**
 * Authenticated fetch wrapper
 * Automatically includes auth headers in all requests
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const authHeaders = await getAuthHeaders();

  const mergedOptions: RequestInit = {
    ...options,
    headers: {
      ...authHeaders,
      ...options.headers,
    },
  };

  return fetch(url, mergedOptions);
}
