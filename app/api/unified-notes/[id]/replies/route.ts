import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/unified-notes/[id]/replies
 * Fetch all replies to a specific note (flat threading)
 */
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

    // Fetch all replies in this thread (Linear-style flat)
    const { data: replies, error } = await supabase
      .from('unified_notes')
      .select('*')
      .eq('thread_root_id', id)
      .eq('deleted', false)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      replies: replies || [],
      count: replies?.length || 0
    });

  } catch (error: any) {
    console.error('Error fetching replies:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch replies' },
      { status: 500 }
    );
  }
}
