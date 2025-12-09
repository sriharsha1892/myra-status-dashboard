/**
 * Custom Field Values API
 * GET: Get values for an entity
 * PUT: Update values for an entity
 * POST: Bulk update values for multiple entities
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getCustomFieldValues,
  updateCustomFieldValues,
  bulkUpdateCustomFieldValues,
  type EntityType,
} from '@/lib/customFields';
import { ENTITY_TYPES, customFieldValuesSchema } from '@/lib/customFields/schemas';

/**
 * GET /api/custom-fields/values
 * Query params:
 *   - entity_type: Required. One of the valid entity types.
 *   - entity_id: Required. The ID of the entity.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entity_type') as EntityType;
    const entityId = searchParams.get('entity_id');

    // Validate parameters
    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: 'entity_type and entity_id query parameters are required' },
        { status: 400 }
      );
    }

    if (!ENTITY_TYPES.includes(entityType as typeof ENTITY_TYPES[number])) {
      return NextResponse.json(
        { error: `Invalid entity_type. Must be one of: ${ENTITY_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Fetch values
    const values = await getCustomFieldValues(supabase, entityType, entityId);

    return NextResponse.json({
      success: true,
      data: values,
    });
  } catch (error) {
    console.error('Error fetching custom field values:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch values' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/custom-fields/values
 * Body: {
 *   entity_type: EntityType,
 *   entity_id: string,
 *   values: CustomFieldValues
 * }
 */
export async function PUT(request: NextRequest) {
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

    // Parse body
    const body = await request.json();
    const { entity_type, entity_id, values } = body;

    // Validate parameters
    if (!entity_type || !entity_id || !values) {
      return NextResponse.json(
        { error: 'entity_type, entity_id, and values are required' },
        { status: 400 }
      );
    }

    if (!ENTITY_TYPES.includes(entity_type)) {
      return NextResponse.json(
        { error: `Invalid entity_type. Must be one of: ${ENTITY_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate values shape
    const valuesValidation = customFieldValuesSchema.safeParse(values);
    if (!valuesValidation.success) {
      return NextResponse.json(
        {
          error: 'Invalid values format',
          details: valuesValidation.error.issues,
        },
        { status: 400 }
      );
    }

    // Update values
    const updatedValues = await updateCustomFieldValues(
      supabase,
      entity_type,
      entity_id,
      values
    );

    return NextResponse.json({
      success: true,
      data: updatedValues,
    });
  } catch (error) {
    console.error('Error updating custom field values:', error);

    // Handle validation errors
    if (error instanceof Error && error.message.includes('Validation errors')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update values' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/custom-fields/values
 * Bulk update values for multiple entities
 * Body: {
 *   entity_type: EntityType,
 *   entity_ids: string[],
 *   values: CustomFieldValues
 * }
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

    // Parse body
    const body = await request.json();
    const { entity_type, entity_ids, values } = body;

    // Validate parameters
    if (!entity_type || !entity_ids || !values) {
      return NextResponse.json(
        { error: 'entity_type, entity_ids, and values are required' },
        { status: 400 }
      );
    }

    if (!ENTITY_TYPES.includes(entity_type)) {
      return NextResponse.json(
        { error: `Invalid entity_type. Must be one of: ${ENTITY_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    if (!Array.isArray(entity_ids) || entity_ids.length === 0) {
      return NextResponse.json(
        { error: 'entity_ids must be a non-empty array' },
        { status: 400 }
      );
    }

    if (entity_ids.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 entities can be updated at once' },
        { status: 400 }
      );
    }

    // Validate values shape
    const valuesValidation = customFieldValuesSchema.safeParse(values);
    if (!valuesValidation.success) {
      return NextResponse.json(
        {
          error: 'Invalid values format',
          details: valuesValidation.error.issues,
        },
        { status: 400 }
      );
    }

    // Bulk update values
    const updatedCount = await bulkUpdateCustomFieldValues(
      supabase,
      entity_type,
      entity_ids,
      values
    );

    return NextResponse.json({
      success: true,
      updated_count: updatedCount,
      total_requested: entity_ids.length,
    });
  } catch (error) {
    console.error('Error bulk updating custom field values:', error);

    // Handle validation errors
    if (error instanceof Error && error.message.includes('Validation errors')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to bulk update values' },
      { status: 500 }
    );
  }
}
