/**
 * TEMPORARY DIAGNOSTIC ENDPOINT
 * Shows which environment variables are available (names only, not values)
 * DELETE THIS FILE after debugging is complete
 */

import { NextResponse } from 'next/server';

export async function GET() {
  // Get all environment variable names (not values for security)
  const envVars = Object.keys(process.env);

  // Filter for relevant variables
  const relevantVars = envVars.filter(key =>
    key.includes('GROQ') ||
    key.includes('SUPABASE') ||
    key.includes('NEXT_PUBLIC')
  );

  // Check specific variables we care about
  const checks = {
    GROQ_API_KEY: {
      exists: !!process.env.GROQ_API_KEY,
      hasValue: process.env.GROQ_API_KEY ? process.env.GROQ_API_KEY.length > 0 : false,
      firstChars: process.env.GROQ_API_KEY ? process.env.GROQ_API_KEY.substring(0, 4) : 'N/A',
    },
    NEXT_PUBLIC_SUPABASE_URL: {
      exists: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasValue: process.env.NEXT_PUBLIC_SUPABASE_URL ? process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0 : false,
    },
    SUPABASE_SERVICE_ROLE_KEY: {
      exists: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasValue: process.env.SUPABASE_SERVICE_ROLE_KEY ? process.env.SUPABASE_SERVICE_ROLE_KEY.length > 0 : false,
    },
  };

  return NextResponse.json({
    message: 'Environment variable diagnostic',
    timestamp: new Date().toISOString(),
    checks,
    relevantVars,
    totalEnvVars: envVars.length,
    allVarNames: envVars.sort(),
  });
}
