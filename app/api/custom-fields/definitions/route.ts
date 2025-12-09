/**
 * Custom Field Definitions API
 * GET: List definitions for an entity type
 * POST: Create a new field definition
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getCustomFieldDefinitions,
  createCustomFieldDefinition,
  type EntityType,
} from '@/lib/customFields';
import { createCustomFieldDefinitionSchema, ENTITY_TYPES } from '@/lib/customFields/schemas';

/**
 * GET /api/custom-fields/definitions
 * Query params:
 *   - entity_type: Required. One of the valid entity types.
 *   - include_hidden: Optional. Include hidden fields (default: false)
 *   - filterable_only: Optional. Only return filterable fields (default: false)
 *   - list_only: Optional. Only return fields shown in list view (default: false)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entity_type') as EntityType;
    const includeHidden = searchParams.get('include_hidden') === 'true';
    const filterableOnly = searchParams.get('filterable_only') === 'true';
    const listOnly = searchParams.get('list_only') === 'true';

    // Validate entity_type
    if (!entityType) {
      return NextResponse.json(
        { error: 'entity_type query parameter is required' },
        { status: 400 }
      );
    }

    if (!ENTITY_TYPES.includes(entityType as typeof ENTITY_TYPES[number])) {
      return NextResponse.json(
        { error: `Invalid entity_type. Must be one of: ${ENTITY_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Fetch definitions
    const definitions = await getCustomFieldDefinitions(supabase, entityType, {
      includeHidden,
      filterableOnly,
      listOnly,
    });

    return NextResponse.json({
      success: true,
      data: definitions,
      count: definitions.length,
    });
  } catch (error) {
    console.error('Error fetching custom field definitions:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch definitions' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/custom-fields/definitions
 * Body: CreateCustomFieldDefinition
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
    const validation = createCustomFieldDefinitionSchema.safeParse(body);

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

    // Create the definition
    const definition = await createCustomFieldDefinition(
      supabase,
      validation.data,
      user.id
    );

    return NextResponse.json({
      success: true,
      data: definition,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating custom field definition:', error);

    // Handle duplicate key error
    if (error instanceof Error && error.message.includes('already exists')) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create definition' },
      { status: 500 }
    );
  }
}
