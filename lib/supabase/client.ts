import { createBrowserClient } from '@supabase/ssr';
import { Database } from './types';

export function createClient() {
  // In Next.js, these are replaced at build time with actual values
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // During build time, these might be undefined
  // But in production, they should always be available
  if (!supabaseUrl || !supabaseAnonKey) {
    // For build-time: return placeholder
    // For runtime: this should never happen if env vars are set in Vercel
    if (typeof window === 'undefined') {
      // Build time - return placeholder
      return createBrowserClient<Database>('https://placeholder.supabase.co', 'placeholder-key');
    } else {
      // Runtime - this is an error, env vars are missing
      console.error('Supabase environment variables are missing!');
      console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl);
      console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Set' : 'Missing');
      throw new Error('Missing Supabase environment variables. Please check your Vercel environment variable configuration.');
    }
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
