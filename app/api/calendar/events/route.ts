import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  createCalendarEvent,
  listCalendarEvents,
  refreshAccessToken,
  CalendarEvent
} from '@/lib/calendar/microsoftClient';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get calendar integration
    const { data: integration } = await supabase
      .from('calendar_integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'microsoft')
      .single();

    if (!integration) {
      return NextResponse.json({ error: 'Calendar not connected' }, { status: 404 });
    }

    // Check if token needs refresh
    let accessToken = (integration as any).access_token;
    if ((integration as any).expires_at && new Date((integration as any).expires_at) < new Date()) {
      const tokens = await refreshAccessToken((integration as any).refresh_token);
      accessToken = tokens.accessToken;

      // Update tokens in database
      await supabase
        // -ignore - Supabase typing issue with dynamic columns

        .from('calendar_integrations')
        // @ts-ignore - Supabase typing issue with dynamic columns
        .update({
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
          expires_at: tokens.expiresOn,
        })
        .eq('user_id', (user as any).id)
        .eq('provider', 'microsoft');
    }

    // Get events from Microsoft Calendar
    const events = await listCalendarEvents(accessToken);

    return NextResponse.json({ events });
  } catch (error: any) {
    console.error('Get calendar events error:', error);
    return NextResponse.json({
      error: error.message
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { ticketId, title, description, start_time, end_time, attendees, includeTeamsMeeting } = body;

    // Get calendar integration
    const { data: integration } = await supabase
      .from('calendar_integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'microsoft')
      .single();

    if (!integration) {
      return NextResponse.json({ error: 'Calendar not connected' }, { status: 404 });
    }

    // Check if token needs refresh
    let accessToken = (integration as any).access_token;
    if ((integration as any).expires_at && new Date((integration as any).expires_at) < new Date()) {
      const tokens = await refreshAccessToken((integration as any).refresh_token);
      accessToken = tokens.accessToken;

      await supabase
        // -ignore - Supabase typing issue with dynamic columns

        .from('calendar_integrations')
        // @ts-ignore - Supabase typing issue with dynamic columns
        .update({
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
          expires_at: tokens.expiresOn,
        })
        .eq('user_id', (user as any).id)
        .eq('provider', 'microsoft');
    }

    // Create event in Microsoft Calendar
    const event: CalendarEvent = {
      subject: title,
      body: {
        contentType: 'Text',
        content: description || '',
      },
      start: {
        dateTime: new Date(start_time).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: new Date(end_time).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      attendees: attendees?.map((email: string) => ({
        emailAddress: { address: email },
        type: 'required' as const,
      })),
      isOnlineMeeting: includeTeamsMeeting || false,
      onlineMeetingProvider: includeTeamsMeeting ? 'teamsForBusiness' : undefined,
    };

    const createdEvent = await createCalendarEvent(accessToken, event);

    // Store event reference in database
    const { data: dbEvent, error: dbError } = await supabase
      // -ignore - Supabase typing issue with dynamic columns

      .from('ticket_calendar_events')
      // @ts-ignore - Supabase typing issue with dynamic columns
      .insert({
        ticket_id: ticketId,
        user_id: user.id,
        provider: 'microsoft',
        event_id: createdEvent.id,
        title,
        description,
        start_time: new Date(start_time),
        end_time: new Date(end_time),
        attendees,
        metadata: {
          webLink: createdEvent.webLink,
          onlineMeeting: createdEvent.onlineMeeting,
        },
      })
      .select()
      .single();

    if (dbError) {
      console.error('Failed to store event in database:', dbError);
    }

    return NextResponse.json({
      success: true,
      event: createdEvent,
      dbEvent,
    });
  } catch (error: any) {
    console.error('Create calendar event error:', error);
    return NextResponse.json({
      error: error.message
    }, { status: 500 });
  }
}
