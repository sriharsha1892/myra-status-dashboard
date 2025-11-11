import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/support-tickets
 * Create a support ticket with optional file attachments
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await request.json();
    const {
      subject,
      description,
      category,
      priority,
      attachments, // Array of file URLs uploaded to storage
      user_email,
      user_name
    } = body;

    // Validation
    if (!subject || !description) {
      return NextResponse.json(
        { error: 'Subject and description are required' },
        { status: 400 }
      );
    }

    // Format ticket description with attachments
    let ticketDescription = description;

    if (attachments && attachments.length > 0) {
      ticketDescription += '\n\n<hr>\n<h4>Attachments:</h4>\n<ul>';
      attachments.forEach((attachment: { name: string; url: string; type: string }) => {
        if (attachment.type.startsWith('image/')) {
          ticketDescription += `\n<li><strong>${attachment.name}</strong><br><img src="${attachment.url}" alt="${attachment.name}" style="max-width: 600px; margin: 10px 0; border: 1px solid #ddd; border-radius: 4px;"></li>`;
        } else {
          ticketDescription += `\n<li><a href="${attachment.url}" target="_blank">${attachment.name}</a></li>`;
        }
      });
      ticketDescription += '\n</ul>';
    }

    // Add user info
    ticketDescription += `\n\n<hr>\n<p><small><strong>Submitted by:</strong> ${user_name || user_email || 'Anonymous'}</small></p>`;
    if (user_email) {
      ticketDescription += `<p><small><strong>Email:</strong> ${user_email}</small></p>`;
    }

    // Create ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .insert({
        title: subject,
        description: ticketDescription,
        status: 'open',
        priority: priority || 'medium',
        category: category || 'general',
        created_by: user?.id || null,
        source: 'support_form'
      })
      .select('ticket_id')
      .single();

    if (ticketError) throw ticketError;

    // Notify all super admins
    try {
      const { data: superAdmins } = await supabase
        .from('users')
        .select('id')
        .eq('is_super_admin', true);

      if (superAdmins && superAdmins.length > 0) {
        const notifications = superAdmins.map(admin => ({
          user_id: admin.id,
          entity_type: 'ticket',
          entity_id: ticket.ticket_id,
          entity_title: subject,
          notification_type: 'support_ticket',
          actor_id: user?.id || null,
          title: `🎫 New Support Ticket: ${subject}`,
          message: description.replace(/<[^>]*>/g, '').substring(0, 200),
          action_url: `/support/tickets?id=${ticket.ticket_id}`,
          priority_score: priority === 'urgent' ? 95 : priority === 'high' ? 85 : 75,
          thread_key: `support_ticket:${ticket.ticket_id}`,
          status: 'unread'
        }));

        await supabase.from('notifications').insert(notifications);
      }
    } catch (notifError) {
      console.error('Error creating notifications for support ticket:', notifError);
      // Don't fail ticket creation if notifications fail
    }

    return NextResponse.json({
      success: true,
      ticketId: ticket.ticket_id,
      message: 'Support ticket created successfully'
    });

  } catch (error: any) {
    console.error('Error creating support ticket:', error);
    return NextResponse.json(
      {
        error: 'Failed to create support ticket',
        message: error.message
      },
      { status: 500 }
    );
  }
}
