import { NextRequest, NextResponse } from 'next/server';

/**
 * Announcements API
 *
 * Returns active announcements for the status page
 * Currently returns an empty array - can be extended to fetch from database
 */

export async function GET(request: NextRequest) {
  try {
    // TODO: Fetch announcements from database when announcement management is implemented
    // For now, return empty array to prevent status page errors

    return NextResponse.json({
      success: true,
      announcements: [],
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
