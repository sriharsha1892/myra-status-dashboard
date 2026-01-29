import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Detect error type from error message
 */
function detectErrorType(errorMessage: string): string {
  const msg = errorMessage.toLowerCase();

  if (msg.includes('fetch') || msg.includes('network') || msg.includes('connection')) {
    return 'network';
  }
  if (msg.includes('unauthorized') || msg.includes('auth') || msg.includes('login')) {
    return 'auth';
  }
  if (msg.includes('duplicate') || msg.includes('unique') || msg.includes('already exists')) {
    return 'duplicate';
  }
  if (msg.includes('required') || msg.includes('invalid') || msg.includes('validation')) {
    return 'validation';
  }
  if (msg.includes('permission') || msg.includes('forbidden') || msg.includes('access denied')) {
    return 'permission';
  }
  if (msg.includes('database') || msg.includes('constraint') || msg.includes('foreign key')) {
    return 'database';
  }
  if (msg.includes('timeout') || msg.includes('timed out')) {
    return 'timeout';
  }

  return 'unknown';
}

/**
 * Calculate priority score (0-100)
 */
function calculatePriorityScore(errorType: string, context: string): number {
  let score = 50; // Base score

  // Error type modifiers
  const typeScores: Record<string, number> = {
    'auth': 80,
    'database': 85,
    'permission': 75,
    'network': 60,
    'validation': 40,
    'timeout': 70,
    'unknown': 55,
    'duplicate': 30
  };

  score = typeScores[errorType] || 50;

  // Context modifiers (critical operations)
  if (context.includes('create') || context.includes('delete')) {
    score += 10;
  }
  if (context.includes('login') || context.includes('auth')) {
    score += 15;
  }
  if (context.includes('payment') || context.includes('subscription')) {
    score += 20;
  }

  // Cap at 100
  return Math.min(score, 100);
}

/**
 * POST /api/error-reports
 * Submit error report to support team
 * Saves to error_reports table and creates support ticket
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await request.json();
    const {
      error_message,
      error_stack,
      context,
      user_email,
      user_id,
      page_url,
      timestamp,
      user_agent,
      additional_info
    } = body;

    // Validation
    if (!error_message || !context) {
      return NextResponse.json(
        { error: 'error_message and context are required' },
        { status: 400 }
      );
    }

    // Detect error type and calculate priority
    const error_type = detectErrorType(error_message);
    const priority_score = calculatePriorityScore(error_type, context);

    // Check for duplicate errors (same message + context from same user in last 5 minutes)
    let errorReportId: string | null = null;
    let isNewError = true;

    if (user_id) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

      const { data: existingError } = await supabase
        .from('error_reports')
        .select('id, occurrence_count')
        .eq('error_message', error_message)
        .eq('context', context)
        .eq('user_id', user_id)
        .gte('reported_at', fiveMinutesAgo)
        .order('reported_at', { ascending: false })
        .limit(1)
        .single();

      if (existingError) {
        // Update existing error
        isNewError = false;
        errorReportId = existingError.id;

        await supabase
          .from('error_reports')
          .update({
            occurrence_count: existingError.occurrence_count + 1,
            last_occurrence_at: new Date().toISOString()
          })
          .eq('id', existingError.id);
      }
    }

    // Create new error report if not duplicate
    if (isNewError) {
      const { data: newError, error: errorInsertError } = await supabase
        .from('error_reports')
        .insert({
          error_message,
          error_stack,
          error_type,
          context,
          user_id: user_id || user?.id || null,
          user_email: user_email || user?.email || null,
          page_url,
          user_agent,
          additional_info,
          occurred_at: timestamp ? new Date(timestamp).toISOString() : new Date().toISOString(),
          priority_score,
          status: 'open'
        })
        .select('id')
        .single();

      if (errorInsertError) {
        console.error('Error saving to error_reports:', errorInsertError);
        // Don't fail the entire request if error tracking fails
      } else {
        errorReportId = newError.id;
      }
    }

    // Create support ticket only for new errors (not duplicates)
    let ticketId: string | null = null;

    if (isNewError) {
      const ticketDescription = `
<h3>🔴 Automated Error Report</h3>

<p><strong>Error Message:</strong> ${error_message}</p>

<p><strong>Context:</strong> ${context}</p>

<p><strong>Error Type:</strong> ${error_type}</p>

<p><strong>Priority Score:</strong> ${priority_score}/100</p>

<p><strong>Page URL:</strong> <a href="${page_url}">${page_url}</a></p>

<p><strong>Timestamp:</strong> ${new Date(timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>

${user_email ? `<p><strong>User Email:</strong> ${user_email}</p>` : ''}

${error_stack ? `
<details>
<summary><strong>Technical Details (Stack Trace)</strong></summary>
<pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 12px;">
${error_stack}
</pre>
</details>
` : ''}

${user_agent ? `
<details>
<summary><strong>Environment Details</strong></summary>
<p><strong>User Agent:</strong> ${user_agent}</p>
${additional_info ? `<p><strong>Additional Info:</strong></p><pre>${JSON.stringify(additional_info, null, 2)}</pre>` : ''}
</details>
` : ''}

<hr>
<p><em>This error was automatically reported by the user. Please investigate and respond promptly.</em></p>
<p><em>Error Report ID: ${errorReportId}</em></p>
      `.trim();

      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .insert({
          title: `Error Report: ${context} - ${error_message.substring(0, 50)}${error_message.length > 50 ? '...' : ''}`,
          description: ticketDescription,
          status: 'open',
          priority: priority_score >= 80 ? 'critical' : priority_score >= 60 ? 'high' : 'medium',
          category: 'bug',
          created_by: user_id || user?.id || null,
          assigned_to: null,
          source: 'error_report'
        })
        .select('ticket_id')
        .single();

      if (ticketError) {
        console.error('Error creating ticket:', ticketError);
        // Don't fail if ticket creation fails
      } else {
        ticketId = ticket.ticket_id;

        // Link error report to ticket
        if (errorReportId) {
          await supabase
            .from('error_reports')
            .update({ ticket_id: ticketId })
            .eq('id', errorReportId);
        }
      }
    }

    // Notify all super admins about this error report (only for new errors with tickets)
    if (isNewError && ticketId) {
      try {
        const { data: { users: allUsers } } = await supabase.auth.admin.listUsers();

        if (allUsers) {
          const { data: superAdmins } = await supabase
            .from('users')
            .select('id')
            .eq('is_super_admin', true);

          if (superAdmins && superAdmins.length > 0) {
            const notifications = superAdmins.map(admin => ({
              user_id: admin.id,
              entity_type: 'ticket',
              entity_id: ticketId,
              entity_title: `Error Report: ${context}`,
              notification_type: 'error_report',
              actor_id: user_id || user?.id || null,
              title: `🔴 New Error Report: ${context}`,
              message: error_message.substring(0, 200),
              action_url: `/status`,
              priority_score: 90, // Very high priority for error reports
              thread_key: `error_report:${ticketId}`,
              status: 'unread'
            }));

            await supabase.from('notifications').insert(notifications);
          }
        }
      } catch (notifError) {
        console.error('Error creating notifications for error report:', notifError);
        // Don't fail the error report if notifications fail
      }
    }

    return NextResponse.json({
      success: true,
      errorReportId,
      ticketId,
      isDuplicate: !isNewError,
      message: isNewError
        ? 'Error report submitted successfully. Our team will investigate shortly.'
        : 'Error report updated. This error was already reported recently.'
    });

  } catch (error: any) {
    console.error('Error creating error report:', error);
    return NextResponse.json(
      {
        error: 'Failed to submit error report',
        message: error.message
      },
      { status: 500 }
    );
  }
}
