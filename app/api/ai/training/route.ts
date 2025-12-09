// AI Training Examples API - Manage training examples for model improvement
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = any;

const VALIDATION_STATUSES = ['pending', 'validated', 'rejected'] as const;
const SOURCES = ['manual', 'feedback', 'high_confidence', 'correction'] as const;
const CATEGORIES = ['positive', 'edge_case', 'common_error'] as const;

// GET /api/ai/training - List training examples
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient() as AnySupabaseClient;
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action_type = searchParams.get('action_type');
    const category = searchParams.get('category');
    const validation_status = searchParams.get('validation_status');
    const source = searchParams.get('source');
    const is_active = searchParams.get('is_active');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('ai_training_examples')
      .select(`
        *,
        created_by_user:users!ai_training_examples_created_by_fkey(id, email, full_name)
      `)
      .order('created_at', { ascending: false });

    if (action_type) {
      query = query.eq('action_type', action_type);
    }

    if (category) {
      query = query.eq('category', category);
    }

    if (validation_status) {
      query = query.eq('validation_status', validation_status);
    }

    if (source) {
      query = query.eq('source', source);
    }

    if (is_active !== null) {
      query = query.eq('is_active', is_active === 'true');
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching training examples:', error);
      return NextResponse.json({ error: 'Failed to fetch training examples' }, { status: 500 });
    }

    // Get stats
    const { data: allExamples } = await supabase
      .from('ai_training_examples')
      .select('action_type, category, validation_status, source, is_active');

    const stats = {
      total: allExamples?.length || 0,
      active: allExamples?.filter((e: any) => e.is_active).length || 0,
      by_action_type: {} as Record<string, number>,
      by_category: {} as Record<string, number>,
      by_validation_status: {} as Record<string, number>,
      by_source: {} as Record<string, number>,
    };

    allExamples?.forEach((e: any) => {
      stats.by_action_type[e.action_type] = (stats.by_action_type[e.action_type] || 0) + 1;
      if (e.category) {
        stats.by_category[e.category] = (stats.by_category[e.category] || 0) + 1;
      }
      stats.by_validation_status[e.validation_status] = (stats.by_validation_status[e.validation_status] || 0) + 1;
      stats.by_source[e.source] = (stats.by_source[e.source] || 0) + 1;
    });

    return NextResponse.json({
      examples: data || [],
      stats,
    });
  } catch (error) {
    console.error('Error in training examples API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/ai/training - Create training example
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient() as AnySupabaseClient;
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin permission
    const { data: userData } = await supabase
      .from('users')
      .select('role, is_super_admin')
      .eq('id', user.id)
      .single();

    if (!userData || (userData.role !== 'Admin' && !userData.is_super_admin)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const {
      action_type,
      category,
      input_text,
      expected_output,
      explanation,
      quality_score,
      source,
      source_feedback_id,
    } = body;

    // Validations
    if (!action_type) {
      return NextResponse.json({ error: 'action_type is required' }, { status: 400 });
    }

    if (!input_text?.trim()) {
      return NextResponse.json({ error: 'input_text is required' }, { status: 400 });
    }

    if (!expected_output || typeof expected_output !== 'object') {
      return NextResponse.json({ error: 'expected_output (JSON object) is required' }, { status: 400 });
    }

    if (category && !CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${CATEGORIES.join(', ')}` },
        { status: 400 }
      );
    }

    if (source && !SOURCES.includes(source)) {
      return NextResponse.json(
        { error: `Invalid source. Must be one of: ${SOURCES.join(', ')}` },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('ai_training_examples')
      .insert({
        action_type,
        category: category || null,
        input_text: input_text.trim(),
        expected_output,
        explanation: explanation || null,
        quality_score: quality_score || 1.0,
        validation_status: 'pending',
        source: source || 'manual',
        source_feedback_id: source_feedback_id || null,
        is_active: true,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating training example:', error);
      return NextResponse.json({ error: 'Failed to create training example' }, { status: 500 });
    }

    return NextResponse.json({ example: data }, { status: 201 });
  } catch (error) {
    console.error('Error creating training example:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
