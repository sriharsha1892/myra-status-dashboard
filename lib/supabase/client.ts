import { createBrowserClient } from '@supabase/ssr';
import { Database } from './types';

export function createClient() {
  // Get environment variables with fallback to prevent build-time errors
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  // Only create client if environment variables are available
  if (!supabaseUrl || !supabaseAnonKey) {
    // Return a mock client for build-time pre-rendering
    // This will never be used in production since pages are dynamically rendered
    return createBrowserClient<Database>('https://placeholder.supabase.co', 'placeholder-key');
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
