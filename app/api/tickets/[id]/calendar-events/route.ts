import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const ticketId = id;

    // Get calendar events for this ticket
    const { data: events, error } = await supabase
      .from('ticket_calendar_events')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('start_time', { ascending: true });

    if (error) {
      // If table doesn't exist, return empty array instead of error
      if (error.code === 'PGRST205' || error.message.includes('does not exist')) {
        console.log('Calendar events table not yet created - returning empty array');
        return NextResponse.json({ events: [] });
      }
      throw error;
    }

    return NextResponse.json({ events: events || [] });
  } catch (error: any) {
    console.error('Get ticket calendar events error:', error);

    // Return empty array for missing table instead of 500 error
    if (error.code === 'PGRST205' || error.message?.includes('does not exist')) {
      return NextResponse.json({ events: [] });
    }

    return NextResponse.json({
      error: error.message
    }, { status: 500 });
  }
}
