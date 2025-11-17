import { NextRequest, NextResponse } from 'next/server';
import { generateAndSendDigests } from '@/lib/email/digest-generator';

/**
 * Daily Digest Cron Job Endpoint
 *
 * This endpoint should be called once per day by a cron service (e.g., Vercel Cron, GitHub Actions, etc.)
 * It generates and sends daily digest emails to all users who have opted in.
 *
 * Security: Protected by CRON_SECRET environment variable
 *
 * Example cron schedule: 0 9 * * * (9 AM daily)
 *
 * Usage:
 * curl -X POST https://your-domain.com/api/cron/send-daily-digest \
 *   -H "Authorization: Bearer YOUR_CRON_SECRET"
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('CRON_SECRET not configured');
      return NextResponse.json(
        { error: 'Cron job not configured' },
        { status: 500 }
      );
    }

    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      console.error('Unauthorized cron job attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Starting daily digest cron job...');

    // Generate and send daily digests
    const result = await generateAndSendDigests('daily');

    console.log('Daily digest cron job completed:', result);

    return NextResponse.json({
      success: result.success,
      message: 'Daily digest emails processed',
      stats: {
        totalUsers: result.totalUsers,
        successfulSends: result.successfulSends,
        failedSends: result.failedSends,
      },
      errors: result.errors,
    });
  } catch (error: any) {
    console.error('Error in daily digest cron job:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to process daily digests',
      },
      { status: 500 }
    );
  }
}

// Allow GET for health check
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json({ status: 'not configured' });
  }

  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ status: 'unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    status: 'ready',
    endpoint: 'send-daily-digest',
    type: 'daily',
  });
}
