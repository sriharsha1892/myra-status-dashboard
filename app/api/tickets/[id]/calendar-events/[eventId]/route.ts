import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { deleteCalendarEvent, refreshAccessToken } from '@/lib/calendar/microsoftClient';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; eventId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId } = await params;

    // Get event details
    const { data: event } = await supabase
      .from('ticket_calendar_events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Get calendar integration
    const { data: integration } = await supabase
      .from('calendar_integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'microsoft')
      .single();

    if (integration && (event as any).event_id) {
      // Check if token needs refresh
      let accessToken = (integration as any).access_token;
      if ((integration as any).expires_at && new Date((integration as any).expires_at) < new Date()) {
        const tokens = await refreshAccessToken((integration as any).refresh_token);
        accessToken = tokens.accessToken;
      }

      // Delete from Microsoft Calendar
      try {
        await deleteCalendarEvent(accessToken, (event as any).event_id);
      } catch (err) {
        console.error('Failed to delete from Microsoft Calendar:', err);
        // Continue anyway to delete from our database
      }
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('ticket_calendar_events')
      .delete()
      .eq('id', eventId);

    if (dbError) {
      throw dbError;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete calendar event error:', error);
    return NextResponse.json({
      error: error.message
    }, { status: 500 });
  }
}
