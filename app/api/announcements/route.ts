import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

/**
 * Announcements API
 *
 * GET - Returns active announcements for the status page
 * POST - Creates a new announcement (admin only)
 * PUT - Updates an announcement (admin only)
 * DELETE - Deletes an announcement (admin only)
 */

// Priority order for sorting
const PRIORITY_ORDER = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
} as const;

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();

    // Fetch active announcements, ordered by priority and created_at
    const { data: announcements, error } = await supabase
      .from('announcements')
      .select('id, type, priority, status, title, message, created_at, updated_at')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching announcements:', error);
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          announcements: [],
        },
        { status: 500 }
      );
    }

    // Sort by priority (critical first, then high, normal, low)
    const sortedAnnouncements = (announcements || []).sort((a, b) => {
      const priorityA = PRIORITY_ORDER[a.priority as keyof typeof PRIORITY_ORDER] ?? 2;
      const priorityB = PRIORITY_ORDER[b.priority as keyof typeof PRIORITY_ORDER] ?? 2;
      return priorityA - priorityB;
    });

    return NextResponse.json({
      success: true,
      announcements: sortedAnnouncements,
    });
  } catch (error: any) {
    console.error('Error fetching announcements:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch announcements',
        announcements: [],
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const body = await request.json();

    const { type, priority, status, title, message } = body;

    // Validate required fields
    if (!type || !title || !message) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: type, title, message' },
        { status: 400 }
      );
    }

    // Validate type
    if (!['feature', 'update', 'maintenance', 'alert'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid type. Must be: feature, update, maintenance, or alert' },
        { status: 400 }
      );
    }

    // Validate priority if provided
    if (priority && !['low', 'normal', 'high', 'critical'].includes(priority)) {
      return NextResponse.json(
        { success: false, error: 'Invalid priority. Must be: low, normal, high, or critical' },
        { status: 400 }
      );
    }

    // Validate status if provided
    if (status && !['draft', 'active', 'archived'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status. Must be: draft, active, or archived' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('announcements')
      .insert({
        type,
        priority: priority || 'normal',
        status: status || 'draft',
        title,
        message,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating announcement:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      announcement: data,
    });
  } catch (error: any) {
    console.error('Error creating announcement:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create announcement' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const body = await request.json();

    const { id, type, priority, status, title, message } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing announcement id' },
        { status: 400 }
      );
    }

    // Build update object with only provided fields
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (type) updates.type = type;
    if (priority) updates.priority = priority;
    if (status) updates.status = status;
    if (title) updates.title = title;
    if (message) updates.message = message;

    const { data, error } = await supabase
      .from('announcements')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating announcement:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      announcement: data,
    });
  } catch (error: any) {
    console.error('Error updating announcement:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update announcement' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing announcement id' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting announcement:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Announcement deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting announcement:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete announcement' },
      { status: 500 }
    );
  }
}
