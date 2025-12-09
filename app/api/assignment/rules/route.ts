// Assignment Rules API - List and create rules
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAssignmentRules, createAssignmentRule } from '@/lib/assignment/service';
import { validateRule } from '@/lib/assignment/engine';
import type { CreateRuleInput } from '@/lib/assignment/types';

// GET /api/assignment/rules - List all rules
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';

    const rules = await getAssignmentRules(activeOnly);

    return NextResponse.json({ rules });
  } catch (error) {
    console.error('Error fetching assignment rules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assignment rules' },
      { status: 500 }
    );
  }
}

// POST /api/assignment/rules - Create new rule
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as CreateRuleInput;

    // Validate the rule
    const validationErrors = validateRule({
      name: body.name,
      conditions: body.conditions,
      assignment_type: body.assignment_type,
      assigned_user_id: body.assigned_user_id,
      round_robin_pool: body.round_robin_pool,
    });

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', errors: validationErrors },
        { status: 400 }
      );
    }

    const rule = await createAssignmentRule(body, user.id);

    return NextResponse.json({ rule }, { status: 201 });
  } catch (error) {
    console.error('Error creating assignment rule:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create rule' },
      { status: 500 }
    );
  }
}
