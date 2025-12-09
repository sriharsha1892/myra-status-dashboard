// Feature Interests API - Track features prospects are interested in
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = any;

// GET /api/feature-interests - List feature interests
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient() as AnySupabaseClient;
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const org_id = searchParams.get('org_id');
    const feature = searchParams.get('feature');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('feature_interests')
      .select(`
        *,
        trial_organizations (org_name)
      `)
      .order('mentioned_at', { ascending: false });

    if (org_id) {
      query = query.eq('org_id', org_id);
    }

    if (feature) {
      query = query.ilike('feature_name', `%${feature}%`);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching feature interests:', error);
      return NextResponse.json({ error: 'Failed to fetch feature interests' }, { status: 500 });
    }

    // Get aggregate stats - most requested features
    const { data: stats } = await supabase
      .from('feature_interests')
      .select('feature_name, context');

    const featureCounts: Record<string, { count: number; contexts: string[] }> = {};
    stats?.forEach((s: any) => {
      if (!featureCounts[s.feature_name]) {
        featureCounts[s.feature_name] = { count: 0, contexts: [] };
      }
      featureCounts[s.feature_name].count++;
      if (s.context && !featureCounts[s.feature_name].contexts.includes(s.context)) {
        featureCounts[s.feature_name].contexts.push(s.context);
      }
    });

    const topFeatures = Object.entries(featureCounts)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 20)
      .map(([name, data]) => ({ name, ...data }));

    return NextResponse.json({
      interests: data || [],
      stats: {
        topFeatures,
        totalInterests: stats?.length || 0
      }
    });
  } catch (error) {
    console.error('Error in feature interests API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/feature-interests - Create feature interest
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient() as AnySupabaseClient;
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { org_id, feature_name, context, feature_request_id } = body;

    if (!org_id) {
      return NextResponse.json({ error: 'org_id is required' }, { status: 400 });
    }

    if (!feature_name) {
      return NextResponse.json({ error: 'feature_name is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('feature_interests')
      .insert({
        org_id,
        feature_name: feature_name.trim(),
        context: context || null,
        feature_request_id: feature_request_id || null,
        mentioned_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating feature interest:', error);
      return NextResponse.json({ error: 'Failed to create feature interest' }, { status: 500 });
    }

    return NextResponse.json({ interest: data }, { status: 201 });
  } catch (error) {
    console.error('Error creating feature interest:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
