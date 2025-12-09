import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { z } from 'zod';

// Validation schemas
const roadmapStatusSchema = z.enum(['planned', 'in_progress', 'completed', 'cancelled']);
const roadmapPrioritySchema = z.enum(['low', 'medium', 'high', 'critical']);

const createRoadmapSchema = z.object({
  org_id: z.string().uuid({ message: 'Invalid organization ID' }).nullable().optional(),
  title: z.string().min(1, { message: 'Title is required' }),
  description: z.string().optional().nullable(),
  status: roadmapStatusSchema.default('planned'),
  priority: roadmapPrioritySchema.default('medium'),
  target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be in YYYY-MM-DD format' }).optional().nullable(),
  estimated_completion_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be in YYYY-MM-DD format' }).optional().nullable(),
  owner_id: z.string().uuid({ message: 'Invalid owner ID' }).optional().nullable(),
  owner_name: z.string().optional().nullable(),
  progress_percentage: z.number().min(0).max(100).default(0).optional(),
  external_blocker: z.string().optional().nullable(),
  milestone_id: z.string().uuid({ message: 'Invalid milestone ID' }).optional().nullable(),
  proposer: z.string().optional().nullable(),
  goal: z.string().optional().nullable(),
  area: z.string().optional().nullable(),
  rationale: z.string().optional().nullable(),
  version_planned: z.string().optional().nullable(),
  assigned_to: z.string().optional().nullable(),
  strategic_categories: z.array(z.string()).default([]).optional(),
  parent_item_id: z.string().uuid({ message: 'Invalid parent item ID' }).optional().nullable(),
  item_type: z.enum(['macro-goal', 'task']).default('task').optional(),
  created_by: z.string().optional().nullable(),
});

// GET /api/roadmap - List roadmap items with filters
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();

    const { searchParams } = new URL(request.url);
    const org_id = searchParams.get('org_id');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const item_type = searchParams.get('item_type');
    const parent_item_id = searchParams.get('parent_item_id');
    const include_deleted = searchParams.get('include_deleted') === 'true';
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('org_product_roadmap')
      .select(`
        *,
        trial_organizations (org_name, org_lifecycle_stage),
        roadmap_milestones (title, target_date, status)
      `)
      .order('target_date', { ascending: true, nullsFirst: false })
      .order('priority', { ascending: false });

    // Filter by org_id (including null for master roadmap items)
    if (org_id === 'null' || org_id === '') {
      query = query.is('org_id', null);
    } else if (org_id) {
      query = query.eq('org_id', org_id);
    }

    // Filter by status
    if (status) {
      const statuses = status.split(',');
      if (statuses.length === 1) {
        query = query.eq('status', statuses[0]);
      } else {
        query = query.in('status', statuses);
      }
    }

    // Filter by priority
    if (priority) {
      const priorities = priority.split(',');
      if (priorities.length === 1) {
        query = query.eq('priority', priorities[0]);
      } else {
        query = query.in('priority', priorities);
      }
    }

    // Filter by item_type
    if (item_type) {
      query = query.eq('item_type', item_type);
    }

    // Filter by parent_item_id
    if (parent_item_id === 'null') {
      query = query.is('parent_item_id', null);
    } else if (parent_item_id) {
      query = query.eq('parent_item_id', parent_item_id);
    }

    // Exclude deleted items by default
    if (!include_deleted) {
      // Assuming there's a deleted field - if not, this can be removed
      // query = query.eq('deleted', false);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching roadmap items:', error);
      return NextResponse.json(
        { error: 'Failed to fetch roadmap items', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      roadmap_items: data || [],
      count: data?.length || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error in roadmap API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST /api/roadmap - Create roadmap item
export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();

    const body = await request.json();

    // Validate request body
    const validationResult = createRoadmapSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          }))
        },
        { status: 400 }
      );
    }

    const validatedData = validationResult.data;

    // Create the roadmap item
    const { data, error } = await supabase
      .from('org_product_roadmap')
      .insert({
        org_id: validatedData.org_id || null,
        title: validatedData.title,
        description: validatedData.description || null,
        status: validatedData.status || 'planned',
        priority: validatedData.priority || 'medium',
        target_date: validatedData.target_date || null,
        estimated_completion_date: validatedData.estimated_completion_date || null,
        owner_id: validatedData.owner_id || null,
        owner_name: validatedData.owner_name || null,
        progress_percentage: validatedData.progress_percentage ?? 0,
        external_blocker: validatedData.external_blocker || null,
        milestone_id: validatedData.milestone_id || null,
        proposer: validatedData.proposer || null,
        goal: validatedData.goal || null,
        area: validatedData.area || null,
        rationale: validatedData.rationale || null,
        version_planned: validatedData.version_planned || null,
        assigned_to: validatedData.assigned_to || null,
        strategic_categories: validatedData.strategic_categories || [],
        parent_item_id: validatedData.parent_item_id || null,
        item_type: validatedData.item_type || 'task',
        created_by: validatedData.created_by || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating roadmap item:', error);
      return NextResponse.json(
        { error: 'Failed to create roadmap item', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ roadmap_item: data }, { status: 201 });
  } catch (error) {
    console.error('Error creating roadmap item:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
