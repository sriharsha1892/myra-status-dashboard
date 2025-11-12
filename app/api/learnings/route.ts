import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/api-auth-middleware';

/**
 * GET /api/learnings
 * Fetch learnings with optional filters
 * Requires authentication
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    await requireAuth(request);
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const category = searchParams.get('category');
    const impact = searchParams.get('impact')?.split(',');
    const implemented = searchParams.get('implemented');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('learnings')
      .select('*')
      .order('reported_count', { ascending: false })
      .range(offset, offset + limit - 1);

    if (category) {
      query = query.eq('category', category);
    }

    if (impact && impact.length > 0) {
      query = query.in('impact', impact);
    }

    if (implemented !== null && implemented !== undefined) {
      query = query.eq('implemented', implemented === 'true');
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data
    });
  } catch (error: any) {
    console.error('Error fetching learnings:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch learnings' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/learnings
 * Create a new learning
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from('learnings')
      .insert(body)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data
    });
  } catch (error: any) {
    console.error('Error creating learning:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create learning' },
      { status: 500 }
    );
  }
}
