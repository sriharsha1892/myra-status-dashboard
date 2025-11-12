import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/api-auth-middleware';

/**
 * GET /api/pain-points
 * Fetch pain points with optional filters
 * Requires authentication
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    await requireAuth(request);
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const category = searchParams.get('category');
    const severity = searchParams.get('severity')?.split(',');
    const status = searchParams.get('status')?.split(',');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('pain_points')
      .select('*')
      .order('reported_count', { ascending: false })
      .range(offset, offset + limit - 1);

    if (category) {
      query = query.eq('category', category);
    }

    if (severity && severity.length > 0) {
      query = query.in('severity', severity);
    }

    if (status && status.length > 0) {
      query = query.in('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data
    });
  } catch (error: any) {
    console.error('Error fetching pain points:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch pain points' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pain-points
 * Create a new pain point
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
      .from('pain_points')
      .insert(body)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data
    });
  } catch (error: any) {
    console.error('Error creating pain point:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create pain point' },
      { status: 500 }
    );
  }
}
