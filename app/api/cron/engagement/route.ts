import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// This endpoint is called by Vercel Cron to run daily engagement calculations
// Schedule: Every day at 2:00 AM UTC (configured in vercel.json)

export const runtime = 'nodejs';
export const maxDuration = 60; // Allow up to 60 seconds for the job

// Verify the request is from Vercel Cron
function isValidCronRequest(request: NextRequest): boolean {
  // In production, verify the CRON_SECRET header
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    return authHeader === `Bearer ${cronSecret}`;
  }
  // In development, allow all requests
  return process.env.NODE_ENV === 'development';
}

export async function GET(request: NextRequest) {
  // Verify this is a legitimate cron request
  if (!isValidCronRequest(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const startTime = Date.now();

  try {
    // Use service role key for admin operations
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Run the daily engagement job
    const { data, error } = await supabase.rpc('run_daily_engagement_job');

    if (error) {
      console.error('Daily engagement job failed:', error);
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          duration_ms: Date.now() - startTime,
        },
        { status: 500 }
      );
    }

    // Optionally run cleanup of old snapshots (keep last 90 days)
    const { data: cleanupResult, error: cleanupError } = await supabase.rpc(
      'cleanup_old_engagement_snapshots',
      { days_to_keep: 90 }
    );

    if (cleanupError) {
      console.warn('Snapshot cleanup warning:', cleanupError.message);
    }

    const result = {
      success: true,
      job_result: data,
      snapshots_cleaned: cleanupResult || 0,
      duration_ms: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };

    console.log('Daily engagement job completed:', result);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Daily engagement job error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration_ms: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggers from admin panel
export async function POST(request: NextRequest) {
  // For POST requests, require authentication
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // Allow if valid cron secret OR if called from admin with service key
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Check if it's a service role key
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (authHeader !== `Bearer ${supabaseServiceKey}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
  }

  // Reuse GET logic
  return GET(request);
}
