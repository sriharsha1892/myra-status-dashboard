// Assignment History API
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAssignmentHistory } from '@/lib/assignment/service';

// GET /api/assignment/history - Get assignment history
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const org_id = searchParams.get('org_id') || undefined;
    const assigned_to = searchParams.get('assigned_to') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const history = await getAssignmentHistory({
      org_id,
      assigned_to,
      limit,
      offset,
    });

    return NextResponse.json({ history });
  } catch (error) {
    console.error('Error fetching assignment history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assignment history' },
      { status: 500 }
    );
  }
}
