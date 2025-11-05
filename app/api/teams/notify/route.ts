import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  sendWebhookMessage,
  createTicketNotificationCard,
  createStatusChangeCard,
} from '@/lib/teams/teamsClient';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { ticketId, notificationType, data: notificationData } = body;

    // Get Teams integration settings
    const { data: integration } = await supabase
      .from('teams_integration')
      .select('*')
      .eq('enabled', true)
      .single();

    if (!integration || !(integration as any).webhook_url) {
      return NextResponse.json({ error: 'Teams not configured' }, { status: 404 });
    }

    // Get ticket details
    const { data: ticket } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const ticketUrl = `${process.env.NEXT_PUBLIC_APP_URL}/support/tickets/${ticketId}`;

    let card;
    let message;

    if (notificationType === 'new_ticket') {
      message = `New ticket created: ${(ticket as any).ticket_number}`;
      card = createTicketNotificationCard({
        ticket_number: (ticket as any).ticket_number,
        organization: (ticket as any).organization,
        priority: (ticket as any).priority,
        category: (ticket as any).category,
        description: (ticket as any).description,
        status: (ticket as any).status,
        ticketUrl,
      });
    } else if (notificationType === 'status_change') {
      message = `Ticket ${(ticket as any).ticket_number} status changed`;
      card = createStatusChangeCard({
        ticket_number: (ticket as any).ticket_number,
        oldStatus: notificationData.oldStatus,
        newStatus: notificationData.newStatus,
        changedBy: notificationData.changedBy,
        ticketUrl,
      });
    } else {
      message = `Update on ticket: ${(ticket as any).ticket_number}`;
    }

    // Send to Teams
    await sendWebhookMessage((integration as any).webhook_url, message, card);

    // Log the notification
    await supabase.from('teams_messages')
      // @ts-ignore - Supabase typing issue with dynamic columns
      .insert({
        ticket_id: ticketId,
        message_type: notificationType,
        sent_at: new Date(),
        metadata: notificationData,
      });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Teams notify error:', error);
    return NextResponse.json({
      error: error.message
    }, { status: 500 });
  }
}
