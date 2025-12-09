/**
 * Custom Field Definition by ID API
 * GET: Get a single definition
 * PUT: Update a definition
 * DELETE: Delete a definition
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getCustomFieldDefinitionById,
  updateCustomFieldDefinition,
  deleteCustomFieldDefinition,
} from '@/lib/customFields';
import { updateCustomFieldDefinitionSchema } from '@/lib/customFields/schemas';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/custom-fields/definitions/[id]
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const definition = await getCustomFieldDefinitionById(supabase, id);

    if (!definition) {
      return NextResponse.json(
        { error: 'Custom field definition not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: definition,
    });
  } catch (error) {
    console.error('Error fetching custom field definition:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch definition' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/custom-fields/definitions/[id]
 * Body: UpdateCustomFieldDefinition
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

    // Check if definition exists
    const existing = await getCustomFieldDefinitionById(supabase, id);
    if (!existing) {
      return NextResponse.json(
        { error: 'Custom field definition not found' },
        { status: 404 }
      );
    }

    // Parse and validate body
    const body = await request.json();
    const validation = updateCustomFieldDefinitionSchema.safeParse(body);

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

    // Update the definition
    const definition = await updateCustomFieldDefinition(
      supabase,
      id,
      validation.data,
      user.id
    );

    return NextResponse.json({
      success: true,
      data: definition,
    });
  } catch (error) {
    console.error('Error updating custom field definition:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update definition' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/custom-fields/definitions/[id]
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

    // Check if definition exists
    const existing = await getCustomFieldDefinitionById(supabase, id);
    if (!existing) {
      return NextResponse.json(
        { error: 'Custom field definition not found' },
        { status: 404 }
      );
    }

    // Delete the definition
    await deleteCustomFieldDefinition(supabase, id);

    return NextResponse.json({
      success: true,
      message: 'Custom field definition deleted',
    });
  } catch (error) {
    console.error('Error deleting custom field definition:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete definition' },
      { status: 500 }
    );
  }
}
