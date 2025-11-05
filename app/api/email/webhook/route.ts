import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { processInboundEmail, extractTicketNumber, extractUserInfo, isReply } from '@/lib/email/parser';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const rawEmail = await request.text();

    // Parse the incoming email
    const email = await processInboundEmail(rawEmail);

    // Check if this is a reply to an existing ticket
    const ticketNumber = extractTicketNumber(email.subject);

    if (ticketNumber && isReply(email)) {
      // This is a reply - find the ticket and add comment
      const { data: ticket } = await supabase
        .from('tickets')
        .select('id')
        .eq('ticket_number', ticketNumber)
        .single();

      if (ticket) {
        // Add comment to existing ticket
        const { error } = await supabase.from('ticket_comments')
          // @ts-ignore - Supabase typing issue with dynamic columns
          .insert({
            ticket_id: (ticket as any).id,
            comment: email.bodyText || email.bodyHtml || '',
            created_by: 'system',
            is_internal: false,
            metadata: {
              source: 'email',
              messageId: email.messageId,
              from: email.from
            }
          });

        if (!error) {
          // Log in email_threads table
          await supabase.from('email_threads')
            // @ts-ignore - Supabase typing issue with dynamic columns
            .insert({
              ticket_id: (ticket as any).id,
              message_id: email.messageId,
              from_email: email.from,
              to_email: email.to,
              subject: email.subject,
              body_text: email.bodyText,
              body_html: email.bodyHtml,
              timestamp: email.receivedAt
            });

          return NextResponse.json({ success: true, action: 'reply_added' });
        }
      }
    } else {
      // This is a new ticket - create it
      const userInfo = extractUserInfo(email.from);

      const { data: ticket, error } = await supabase.from('tickets')
        // @ts-ignore - Supabase typing issue with dynamic columns
        .insert({
          organization: userInfo.email.split('@')[1] || 'Unknown',
          user_name: userInfo.name,
          user_email: userInfo.email,
          category: 'Email Support',
          priority: 'Medium',
          status: 'New',
          description: email.bodyText || email.bodyHtml || '',
          metadata: {
            source: 'email',
            messageId: email.messageId,
            subject: email.subject
          }
        }).select().single();

      if (!error && ticket) {
        // Log in email_threads table
        await supabase.from('email_threads')
          // @ts-ignore - Supabase typing issue with dynamic columns
          .insert({
            ticket_id: (ticket as any).id,
            message_id: email.messageId,
            from_email: email.from,
            to_email: email.to,
            subject: email.subject,
            body_text: email.bodyText,
            body_html: email.bodyHtml,
            timestamp: email.receivedAt
          });

        return NextResponse.json({
          success: true,
          action: 'ticket_created',
          ticketId: (ticket as any).id
        });
      }
    }

    return NextResponse.json({ success: false, error: 'Failed to process email' });

  } catch (error: any) {
    console.error('Email webhook error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
