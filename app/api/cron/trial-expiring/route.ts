import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendTrialExpiringEmail } from '@/lib/email/resend';

/**
 * Trial Expiring Cron Job
 *
 * Runs daily at 9:00 AM IST (Indian Standard Time) via Vercel Cron
 * Schedule: 30 3 * * * (3:30 AM UTC = 9:00 AM IST)
 *
 * Checks for trials expiring in 2 days and sends notifications
 *
 * Security: Requires CRON_SECRET header to prevent unauthorized access
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('❌ CRON_SECRET not configured');
      return NextResponse.json(
        { error: 'Cron configuration error' },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error('❌ Unauthorized cron request');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const now = new Date();
    const istTime = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'full',
      timeStyle: 'long'
    }).format(now);

    console.log('⏰ Running trial expiring cron job...');
    console.log(`🇮🇳 IST Time: ${istTime}`);

    // 2. Create Supabase admin client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // 3. Calculate target date (2 days from now)
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
    const targetDate = twoDaysFromNow.toISOString().split('T')[0]; // YYYY-MM-DD format

    console.log(`📅 Checking for trials expiring on: ${targetDate}`);

    // 4. Query trials expiring in 2 days that haven't been notified
    const { data: expiringTrials, error: queryError } = await supabase
      .from('trial_organizations')
      .select(`
        org_id,
        org_name,
        trial_end_date,
        account_manager,
        org_lifecycle_stage
      `)
      .eq('trial_end_date', targetDate)
      .is('expiring_notified_at', null)
      .neq('org_lifecycle_stage', 'converted')
      .neq('org_lifecycle_stage', 'churned');

    if (queryError) {
      console.error('❌ Error querying trials:', queryError);
      return NextResponse.json(
        { error: 'Database query failed', details: queryError },
        { status: 500 }
      );
    }

    if (!expiringTrials || expiringTrials.length === 0) {
      console.log('✅ No trials expiring in 2 days');
      return NextResponse.json({
        message: 'No trials expiring',
        count: 0,
      });
    }

    console.log(`🔔 Found ${expiringTrials.length} trial(s) expiring in 2 days`);

    // 5. Process each expiring trial
    const results = [];

    for (const trial of expiringTrials) {
      try {
        console.log(`📧 Processing: ${trial.org_name} (${trial.org_id})`);

        // 5a. Get account manager details
        const { data: accountManager, error: userError } = await supabase
          .from('users')
          .select('id, email, full_name')
          .eq('id', trial.account_manager)
          .single();

        if (userError || !accountManager) {
          console.warn(`⚠️  No account manager found for ${trial.org_name}`);
          results.push({
            org: trial.org_name,
            notification: 'skipped',
            email: 'skipped',
            reason: 'No account manager assigned',
          });
          continue;
        }

        // 5b. Create in-app notification
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert({
            user_id: accountManager.id,
            entity_type: 'trial_org',
            entity_id: trial.org_id,
            entity_title: trial.org_name,
            notification_type: 'trial_expiring',
            title: `Trial expiring in 2 days: ${trial.org_name}`,
            message: `Trial ends on ${trial.trial_end_date}. Time to check in with the customer!`,
            action_url: `/support/trials/${trial.org_id}`,
            priority_score: 80, // High priority
            thread_key: `trial:${trial.org_id}:expiring`,
            status: 'unread',
            category: 'priority',
          });

        if (notificationError) {
          console.error(`❌ Failed to create notification:`, notificationError);
        } else {
          console.log(`✅ Created in-app notification for ${accountManager.full_name}`);
        }

        // 5c. Send email notification
        const emailResult = await sendTrialExpiringEmail({
          to: accountManager.email,
          orgName: trial.org_name,
          trialEndDate: trial.trial_end_date,
          daysRemaining: 2,
          orgId: trial.org_id,
        });

        if (emailResult.error) {
          console.error(`❌ Failed to send email:`, emailResult.error);
        } else {
          console.log(`✅ Sent email to ${accountManager.email}`);
        }

        // 5d. Mark trial as notified to prevent duplicates
        const { error: updateError } = await supabase
          .from('trial_organizations')
          .update({ expiring_notified_at: new Date().toISOString() })
          .eq('org_id', trial.org_id);

        if (updateError) {
          console.error(`❌ Failed to update trial:`, updateError);
        }

        results.push({
          org: trial.org_name,
          notification: notificationError ? 'failed' : 'created',
          email: emailResult.error ? 'failed' : 'sent',
          recipient: accountManager.email,
        });
      } catch (error: any) {
        console.error(`❌ Error processing ${trial.org_name}:`, error);
        results.push({
          org: trial.org_name,
          notification: 'error',
          email: 'error',
          error: error.message,
        });
      }
    }

    // 6. Return summary
    const summary = {
      success: true,
      date: targetDate,
      trialsProcessed: expiringTrials.length,
      results,
      timestamp: new Date().toISOString(),
    };

    console.log('✅ Trial expiring cron job completed:', summary);

    return NextResponse.json(summary);
  } catch (error: any) {
    console.error('❌ Cron job failed:', error);
    return NextResponse.json(
      {
        error: 'Cron job failed',
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Prevent caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
