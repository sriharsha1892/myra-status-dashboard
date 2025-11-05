import { NextResponse } from 'next/server';

export async function GET() {
  const envCheck = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET (length: ' + process.env.NEXT_PUBLIC_SUPABASE_URL.length + ')' : 'MISSING',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET (length: ' + process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length + ')' : 'MISSING',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET (length: ' + process.env.SUPABASE_SERVICE_ROLE_KEY.length + ')' : 'MISSING',
  };

  return NextResponse.json({
    message: 'Environment variable check',
    variables: envCheck,
    timestamp: new Date().toISOString(),
  });
}
