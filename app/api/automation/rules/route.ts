/**
 * Automation Rules API
 * GET: List automation rules
 * POST: Create a new automation rule
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getAutomationRules,
  createAutomationRule,
  type AutomationEntityType,
} from '@/lib/automation';
import { createAutomationRuleSchema, AUTOMATION_ENTITY_TYPES } from '@/lib/automation/schemas';

/**
 * GET /api/automation/rules
 * Query params:
 *   - entity_type: Optional. Filter by entity type.
 *   - active_only: Optional. Only return active rules (default: false)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entity_type') as AutomationEntityType | null;
    const activeOnly = searchParams.get('active_only') === 'true';

    // Validate entity_type if provided
    if (entityType && !AUTOMATION_ENTITY_TYPES.includes(entityType as typeof AUTOMATION_ENTITY_TYPES[number])) {
      return NextResponse.json(
        { error: `Invalid entity_type. Must be one of: ${AUTOMATION_ENTITY_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Fetch rules
    const rules = await getAutomationRules(supabase, {
      entityType: entityType || undefined,
      activeOnly,
    });

    return NextResponse.json({
      success: true,
      data: rules,
      count: rules.length,
    });
  } catch (error) {
    console.error('Error fetching automation rules:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch rules' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/automation/rules
 * Body: CreateAutomationRule
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: userData } = await supabase
      .from('users')
      .select('role, is_super_admin')
      .eq('id', user.id)
      .single();

    const userInfo = userData as { role: string; is_super_admin: boolean } | null;
    if (!userInfo || (userInfo.role !== 'Admin' && !userInfo.is_super_admin)) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Parse and validate body
    const body = await request.json();
    const validation = createAutomationRuleSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: validation.error.issues.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    // Create the rule
    const rule = await createAutomationRule(
      supabase,
      validation.data as Parameters<typeof createAutomationRule>[1],
      user.id
    );

    return NextResponse.json({
      success: true,
      data: rule,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating automation rule:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create rule' },
      { status: 500 }
    );
  }
}
