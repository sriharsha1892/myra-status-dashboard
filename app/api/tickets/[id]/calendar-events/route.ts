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
      throw error;
    }

    return NextResponse.json({ events: events || [] });
  } catch (error: any) {
    console.error('Get ticket calendar events error:', error);
    return NextResponse.json({
      error: error.message
    }, { status: 500 });
  }
}
