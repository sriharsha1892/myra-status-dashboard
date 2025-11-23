// Service Role Client for Server-Side Admin Operations
// Use ONLY for trusted server-side operations that need to bypass RLS
// NEVER expose this client to the browser

import { createClient } from '@supabase/supabase-js';
import { Database } from './types';

/**
 * Create a Supabase client with service role permissions
 * This client bypasses Row Level Security (RLS) policies
 * Use only for admin operations like bulk imports
 */
export function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Missing Supabase URL or Service Role Key. Check your environment variables.'
    );
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
