import { createBrowserClient } from '@supabase/ssr';
import { Database } from './types';

export function createClient() {
  // Safety check for build-time - return dummy client if env vars not available
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    // During build/prerender, return a dummy client that won't be used
    // This prevents build errors while allowing dynamic pages to work at runtime
    console.warn('Supabase env vars not available - using placeholder client');
    return createBrowserClient<Database>(
      'https://placeholder.supabase.co',
      'placeholder-key'
    );
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseKey);
}
