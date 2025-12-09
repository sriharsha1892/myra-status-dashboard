// Individual Ticket API - Single ticket operations
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = any;

type RouteContext = { params: Promise<{ id: string }> };

// Validation schemas
const ticketUpdateSchema = z.object({
  title: z.string().min(1, { message: 'Title cannot be empty' }).optional(),
  description: z.string().optional(),
  status: z.enum(['open', 'in_progress', 'resolved', 'closed'], {
    message: 'Invalid status value'
  }).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent'], {
    message: 'Invalid priority value'
  }).optional(),
  category: z.enum(['general', 'bug', 'feature', 'account', 'technical'], {
    message: 'Invalid category value'
  }).optional(),
  assigned_to: z.string().uuid({ message: 'Invalid user ID' }).nullable().optional(),
  organization: z.string().optional(),
  user_name: z.string().optional(),
  user_email: z.string().email({ message: 'Invalid email' }).optional(),
});

/**
 * GET /api/tickets/[id]
 * Fetch a single ticket with comments
 */
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

    // Fetch ticket with related data
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', id)
      .single();

    if (ticketError) {
      if (ticketError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
      }
      console.error('Error fetching ticket:', ticketError);
      return NextResponse.json(
        { error: 'Failed to fetch ticket' },
        { status: 500 }
      );
    }

    // Fetch comments for this ticket
    const { data: comments, error: commentsError } = await supabase
      .from('ticket_comments')
      .select('*')
      .eq('ticket_id', id)
      .order('created_at', { ascending: true });

    if (commentsError) {
      console.error('Error fetching comments:', commentsError);
      // Don't fail the request if comments fetch fails
    }

    return NextResponse.json({
      ticket,
      comments: comments || []
    });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/tickets/[id]
 * Update ticket (status, assignee, priority, etc.)
 */
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

    const { id } = await context.params;
    const body = await request.json();

    // Validate request body
    const validation = ticketUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.issues.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {};

    // Updatable fields
    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.status !== undefined) updates.status = body.status;
    if (body.priority !== undefined) updates.priority = body.priority;
    if (body.category !== undefined) updates.category = body.category;
    if (body.organization !== undefined) updates.organization = body.organization;
    if (body.user_name !== undefined) updates.user_name = body.user_name;
    if (body.user_email !== undefined) updates.user_email = body.user_email;

    // Handle assigned_to (can be null)
    if (body.assigned_to !== undefined) {
      updates.assigned_to = body.assigned_to;
    }

    // Special handling for status changes
    if (body.status === 'resolved' || body.status === 'closed') {
      updates.resolved_at = new Date().toISOString();
    } else if (body.status && (body.status === 'open' || body.status === 'in_progress')) {
      // Clear resolved_at if status is changed back to open or in_progress
      updates.resolved_at = null;
    }

    // If there are no updates, return error
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Perform the update
    const { data, error } = await supabase
      .from('tickets')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
      }
      console.error('Error updating ticket:', error);
      return NextResponse.json(
        { error: 'Failed to update ticket' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ticket: data });
  } catch (error) {
    console.error('Error updating ticket:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tickets/[id]
 * Soft delete ticket
 */
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

    const { id } = await context.params;

    // Check if ticket exists first
    const { data: existingTicket, error: checkError } = await supabase
      .from('tickets')
      .select('id, status')
      .eq('id', id)
      .single();

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
      }
      console.error('Error checking ticket:', checkError);
      return NextResponse.json(
        { error: 'Failed to check ticket' },
        { status: 500 }
      );
    }

    // Soft delete by setting status to 'closed' and updating resolved_at
    // We don't have a dedicated 'deleted' field, so we use 'closed' status
    const { data, error } = await supabase
      .from('tickets')
      .update({
        status: 'closed',
        resolved_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error deleting ticket:', error);
      return NextResponse.json(
        { error: 'Failed to delete ticket' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Ticket has been closed',
      ticket: data
    });
  } catch (error) {
    console.error('Error deleting ticket:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
