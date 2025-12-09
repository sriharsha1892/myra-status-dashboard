// Competitive Mentions API - CRUD for competitor tracking
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = any;

const POSITION_TYPES = ['advantage', 'neutral', 'concern'] as const;

// GET /api/competitive-mentions - List competitive mentions
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient() as AnySupabaseClient;
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const org_id = searchParams.get('org_id');
    const competitor = searchParams.get('competitor');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('competitive_mentions')
      .select(`
        *,
        trial_organizations (org_name)
      `)
      .order('mentioned_at', { ascending: false });

    if (org_id) {
      query = query.eq('org_id', org_id);
    }

    if (competitor) {
      query = query.ilike('competitor_name', `%${competitor}%`);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching competitive mentions:', error);
      return NextResponse.json({ error: 'Failed to fetch mentions' }, { status: 500 });
    }

    // Also get aggregate stats
    const { data: stats } = await supabase
      .from('competitive_mentions')
      .select('competitor_name, our_position')
      .order('mentioned_at', { ascending: false });

    // Calculate competitor frequency
    const competitorCounts: Record<string, number> = {};
    const positionCounts: Record<string, { advantage: number; neutral: number; concern: number }> = {};

    stats?.forEach((s: any) => {
      competitorCounts[s.competitor_name] = (competitorCounts[s.competitor_name] || 0) + 1;
      if (!positionCounts[s.competitor_name]) {
        positionCounts[s.competitor_name] = { advantage: 0, neutral: 0, concern: 0 };
      }
      if (s.our_position) {
        positionCounts[s.competitor_name][s.our_position as keyof typeof positionCounts[string]]++;
      }
    });

    const topCompetitors = Object.entries(competitorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count, positions: positionCounts[name] }));

    return NextResponse.json({
      mentions: data || [],
      stats: {
        topCompetitors,
        totalMentions: stats?.length || 0
      }
    });
  } catch (error) {
    console.error('Error in competitive mentions API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/competitive-mentions - Create competitive mention
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient() as AnySupabaseClient;
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { org_id, competitor_name, comparison_context, our_position } = body;

    if (!org_id) {
      return NextResponse.json({ error: 'org_id is required' }, { status: 400 });
    }

    if (!competitor_name) {
      return NextResponse.json({ error: 'competitor_name is required' }, { status: 400 });
    }

    // Validate position type
    if (our_position && !POSITION_TYPES.includes(our_position)) {
      return NextResponse.json(
        { error: `Invalid position type. Must be one of: ${POSITION_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Normalize competitor name
    const normalizedName = competitor_name
      .trim()
      .split(' ')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    const { data, error } = await supabase
      .from('competitive_mentions')
      .insert({
        org_id,
        competitor_name: normalizedName,
        comparison_context: comparison_context || null,
        our_position: our_position || null,
        mentioned_by: user.id,
        mentioned_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating competitive mention:', error);
      return NextResponse.json({ error: 'Failed to create mention' }, { status: 500 });
    }

    return NextResponse.json({ mention: data }, { status: 201 });
  } catch (error) {
    console.error('Error creating competitive mention:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
