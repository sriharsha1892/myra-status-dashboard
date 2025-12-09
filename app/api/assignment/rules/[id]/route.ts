// Assignment Rules API - Single rule operations
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getAssignmentRule,
  updateAssignmentRule,
  deleteAssignmentRule,
} from '@/lib/assignment/service';
import { validateRule } from '@/lib/assignment/engine';
import type { UpdateRuleInput } from '@/lib/assignment/types';

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/assignment/rules/[id] - Get single rule
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const rule = await getAssignmentRule(id);

    if (!rule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    return NextResponse.json({ rule });
  } catch (error) {
    console.error('Error fetching assignment rule:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rule' },
      { status: 500 }
    );
  }
}

// PUT /api/assignment/rules/[id] - Update rule
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json() as UpdateRuleInput;

    // Validate if relevant fields are being updated
    if (body.conditions || body.assignment_type || body.name) {
      const existingRule = await getAssignmentRule(id);
      if (!existingRule) {
        return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
      }

      const validationErrors = validateRule({
        name: body.name ?? existingRule.name,
        conditions: body.conditions ?? existingRule.conditions,
        assignment_type: body.assignment_type ?? existingRule.assignment_type,
        assigned_user_id: body.assigned_user_id ?? existingRule.assigned_user_id,
        round_robin_pool: body.round_robin_pool ?? existingRule.round_robin_pool,
      });

      if (validationErrors.length > 0) {
        return NextResponse.json(
          { error: 'Validation failed', errors: validationErrors },
          { status: 400 }
        );
      }
    }

    const rule = await updateAssignmentRule(id, body);
    return NextResponse.json({ rule });
  } catch (error) {
    console.error('Error updating assignment rule:', error);
    return NextResponse.json(
      { error: 'Failed to update rule' },
      { status: 500 }
    );
  }
}

// DELETE /api/assignment/rules/[id] - Delete rule
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    await deleteAssignmentRule(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting assignment rule:', error);
    return NextResponse.json(
      { error: 'Failed to delete rule' },
      { status: 500 }
    );
  }
}
