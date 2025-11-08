import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { learnFromDecision } from '@/lib/trials/autoLink';

// GET: Fetch review queue items
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const priority = searchParams.get('priority');
    const review_type = searchParams.get('review_type');

    let query = supabase
      .from('review_queue')
      .select('*')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true });

    if (status) {
      query = query.eq('status', status);
    }

    if (priority) {
      query = query.eq('priority', priority);
    }

    if (review_type) {
      query = query.eq('review_type', review_type);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    // Group by priority for better UX
    const grouped = {
      critical: data?.filter(item => item.priority === 'critical') || [],
      high: data?.filter(item => item.priority === 'high') || [],
      normal: data?.filter(item => item.priority === 'normal') || [],
      low: data?.filter(item => item.priority === 'low') || []
    };

    return NextResponse.json({
      success: true,
      items: data || [],
      grouped,
      counts: {
        total: data?.length || 0,
        critical: grouped.critical.length,
        high: grouped.high.length,
        normal: grouped.normal.length,
        low: grouped.low.length
      }
    });
  } catch (error) {
    console.error('Error fetching review queue:', error);
    return NextResponse.json(
      { error: 'Failed to fetch review queue', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST: Resolve a review queue item
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { item_id, decision, resolution_data } = body;

    if (!item_id || !decision) {
      return NextResponse.json({ error: 'item_id and decision are required' }, { status: 400 });
    }

    // Get the review item
    const { data: item, error: itemError } = await supabase
      .from('review_queue')
      .select('*')
      .eq('id', item_id)
      .single();

    if (itemError || !item) {
      return NextResponse.json({ error: 'Review item not found' }, { status: 404 });
    }

    // Update review queue status
    const { error: updateError } = await supabase
      .from('review_queue')
      .update({
        status: 'resolved',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        resolution: { decision, ...resolution_data }
      })
      .eq('id', item_id);

    if (updateError) {
      throw updateError;
    }

    // If it's a duplicate decision, learn from it
    if (
      (item.review_type === 'org_duplicate' || item.review_type === 'user_duplicate') &&
      (decision === 'merge' || decision === 'separate')
    ) {
      const entityType = item.review_type === 'org_duplicate' ? 'org' : 'user';
      await learnFromDecision(
        item_id,
        decision,
        item.source_data,
        resolution_data.target || {},
        entityType,
        user.id
      );
    }

    // If decision was to create new terminology mapping
    if (item.review_type === 'terminology_learning' && decision === 'approve') {
      await supabase
        .from('terminology_mappings')
        .insert({
          phrase: resolution_data.phrase,
          phrase_normalized: resolution_data.phrase.toLowerCase().trim(),
          mapping_type: resolution_data.mapping_type,
          target_value: resolution_data.target_value,
          metadata: resolution_data.metadata || {},
          is_core_term: false, // Learned terms start as non-core
          learn_variations: true,
          created_by: user.id
        });
    }

    return NextResponse.json({
      success: true,
      message: 'Review item resolved successfully'
    });
  } catch (error) {
    console.error('Error resolving review item:', error);
    return NextResponse.json(
      { error: 'Failed to resolve review item', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE: Dismiss a review queue item without action
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const item_id = searchParams.get('item_id');

    if (!item_id) {
      return NextResponse.json({ error: 'item_id is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('review_queue')
      .update({
        status: 'dismissed',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', item_id);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Review item dismissed'
    });
  } catch (error) {
    console.error('Error dismissing review item:', error);
    return NextResponse.json(
      { error: 'Failed to dismiss review item', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
