import { NextRequest, NextResponse } from 'next/server';
import {
  createAnnouncement,
  getActiveAnnouncements,
  getAllAnnouncements,
  updateAnnouncement,
  deleteAnnouncement,
  Announcement,
} from '@/lib/announcements';

/**
 * GET /api/announcements
 * Query params:
 * - active: 'true' to get only active announcements (default for public)
 * - all: 'true' to get all announcements (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const showAll = searchParams.get('all') === 'true';

    const announcements = showAll ? getAllAnnouncements() : getActiveAnnouncements();

    return NextResponse.json({
      success: true,
      announcements,
      total: announcements.length,
    });
  } catch (error) {
    console.error('Error fetching announcements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch announcements', success: false },
      { status: 500 }
    );
  }
}

/**
 * POST /api/announcements
 * Create a new announcement (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, message, type, active, createdBy, expiresAt } = body;

    // Validate required fields
    if (!title || !message || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: title, message, type', success: false },
        { status: 400 }
      );
    }

    // Validate type
    const validTypes = ['info', 'warning', 'success', 'maintenance'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(', ')}`, success: false },
        { status: 400 }
      );
    }

    const announcement = createAnnouncement({
      title,
      message,
      type,
      active: active !== false,
      createdBy,
      expiresAt,
    });

    return NextResponse.json({
      success: true,
      message: 'Announcement created successfully',
      announcement,
    });
  } catch (error) {
    console.error('Error creating announcement:', error);
    return NextResponse.json(
      { error: 'Failed to create announcement', success: false },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/announcements
 * Update an existing announcement (admin only)
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Announcement ID is required', success: false },
        { status: 400 }
      );
    }

    const announcement = updateAnnouncement(id, updates);

    if (!announcement) {
      return NextResponse.json(
        { error: 'Announcement not found', success: false },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Announcement updated successfully',
      announcement,
    });
  } catch (error) {
    console.error('Error updating announcement:', error);
    return NextResponse.json(
      { error: 'Failed to update announcement', success: false },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/announcements
 * Delete an announcement (admin only)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Announcement ID is required', success: false },
        { status: 400 }
      );
    }

    const deleted = deleteAnnouncement(id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Announcement not found', success: false },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Announcement deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    return NextResponse.json(
      { error: 'Failed to delete announcement', success: false },
      { status: 500 }
    );
  }
}
