import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/error-reports
 * Submit error report to support team
 * Creates a ticket for the support team to investigate
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

    // Format error details for ticket description
    const ticketDescription = `
<h3>🔴 Automated Error Report</h3>

<p><strong>Error Message:</strong> ${error_message}</p>

<p><strong>Context:</strong> ${context}</p>

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
    `.trim();

    // Create a support ticket for this error
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .insert({
        title: `Error Report: ${context} - ${error_message.substring(0, 50)}${error_message.length > 50 ? '...' : ''}`,
        description: ticketDescription,
        status: 'open',
        priority: 'high', // Error reports should be high priority
        category: 'bug',
        created_by: user_id || user?.id || null,
        assigned_to: null, // Will be assigned by admin
        source: 'error_report'
      })
      .select('ticket_id')
      .single();

    if (ticketError) throw ticketError;

    // Notify all super admins about this error report
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
            entity_id: ticket.ticket_id,
            entity_title: `Error Report: ${context}`,
            notification_type: 'error_report',
            actor_id: user_id || user?.id || null,
            title: `🔴 New Error Report: ${context}`,
            message: error_message.substring(0, 200),
            action_url: `/support/tickets?id=${ticket.ticket_id}`,
            priority_score: 90, // Very high priority for error reports
            thread_key: `error_report:${ticket.ticket_id}`,
            status: 'unread'
          }));

          await supabase.from('notifications').insert(notifications);
        }
      }
    } catch (notifError) {
      console.error('Error creating notifications for error report:', notifError);
      // Don't fail the error report if notifications fail
    }

    return NextResponse.json({
      success: true,
      ticketId: ticket.ticket_id,
      message: 'Error report submitted successfully. Our team will investigate shortly.'
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
