/**
 * Automation Rule by ID API
 * GET: Get a single rule
 * PUT: Update a rule
 * DELETE: Delete a rule
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getAutomationRuleById,
  updateAutomationRule,
  deleteAutomationRule,
  toggleAutomationRule,
} from '@/lib/automation';
import { updateAutomationRuleSchema } from '@/lib/automation/schemas';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/automation/rules/[id]
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const rule = await getAutomationRuleById(supabase, id);

    if (!rule) {
      return NextResponse.json(
        { error: 'Automation rule not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: rule,
    });
  } catch (error) {
    console.error('Error fetching automation rule:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch rule' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/automation/rules/[id]
 * Body: UpdateAutomationRule
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
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

    // Check if rule exists
    const existing = await getAutomationRuleById(supabase, id);
    if (!existing) {
      return NextResponse.json(
        { error: 'Automation rule not found' },
        { status: 404 }
      );
    }

    // Parse and validate body
    const body = await request.json();
    const validation = updateAutomationRuleSchema.safeParse(body);

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

    // Update the rule
    const rule = await updateAutomationRule(
      supabase,
      id,
      validation.data as Parameters<typeof updateAutomationRule>[2],
      user.id
    );

    return NextResponse.json({
      success: true,
      data: rule,
    });
  } catch (error) {
    console.error('Error updating automation rule:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update rule' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/automation/rules/[id]
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
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

    // Check if rule exists
    const existing = await getAutomationRuleById(supabase, id);
    if (!existing) {
      return NextResponse.json(
        { error: 'Automation rule not found' },
        { status: 404 }
      );
    }

    // Delete the rule
    await deleteAutomationRule(supabase, id);

    return NextResponse.json({
      success: true,
      message: 'Automation rule deleted',
    });
  } catch (error) {
    console.error('Error deleting automation rule:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete rule' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/automation/rules/[id]
 * Toggle active status
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
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

    // Parse body
    const body = await request.json();
    const { is_active } = body;

    if (typeof is_active !== 'boolean') {
      return NextResponse.json(
        { error: 'is_active must be a boolean' },
        { status: 400 }
      );
    }

    // Toggle the rule
    const rule = await toggleAutomationRule(supabase, id, is_active, user.id);

    return NextResponse.json({
      success: true,
      data: rule,
    });
  } catch (error) {
    console.error('Error toggling automation rule:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to toggle rule' },
      { status: 500 }
    );
  }
}
