// Individual Training Example API - GET, PATCH, DELETE
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = any;

type RouteContext = { params: Promise<{ id: string }> };

const VALIDATION_STATUSES = ['pending', 'validated', 'rejected'] as const;
const CATEGORIES = ['positive', 'edge_case', 'common_error'] as const;

// GET /api/ai/training/[id] - Get single training example
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const supabase = await createClient() as AnySupabaseClient;
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    const { data: example, error } = await supabase
      .from('ai_training_examples')
      .select(`
        *,
        created_by_user:users!ai_training_examples_created_by_fkey(id, email, full_name)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Training example not found' }, { status: 404 });
      }
      console.error('Error fetching training example:', error);
      return NextResponse.json({ error: 'Failed to fetch training example' }, { status: 500 });
    }

    return NextResponse.json({ example });
  } catch (error) {
    console.error('Error fetching training example:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/ai/training/[id] - Update training example
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
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

    const { id } = await context.params;
    const body = await request.json();

    // Validate fields if provided
    if (body.validation_status && !VALIDATION_STATUSES.includes(body.validation_status)) {
      return NextResponse.json(
        { error: `Invalid validation_status. Must be one of: ${VALIDATION_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    if (body.category && !CATEGORIES.includes(body.category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${CATEGORIES.join(', ')}` },
        { status: 400 }
      );
    }

    // Build update object
    const updates: Record<string, unknown> = {};
    const allowedFields = [
      'action_type', 'category', 'input_text', 'expected_output',
      'explanation', 'quality_score', 'validation_status', 'is_active'
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    const { data, error } = await supabase
      .from('ai_training_examples')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating training example:', error);
      return NextResponse.json({ error: 'Failed to update training example' }, { status: 500 });
    }

    return NextResponse.json({ example: data });
  } catch (error) {
    console.error('Error updating training example:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/ai/training/[id] - Delete training example
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
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

    const { id } = await context.params;

    const { error } = await supabase
      .from('ai_training_examples')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting training example:', error);
      return NextResponse.json({ error: 'Failed to delete training example' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting training example:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
