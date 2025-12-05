import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

/**
 * Admin Announcements API
 *
 * GET - Returns ALL announcements (not just active) for admin management
 */

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();

    // Fetch ALL announcements for admin view, ordered by created_at descending
    const { data: announcements, error } = await supabase
      .from('announcements')
      .select('id, type, priority, status, title, message, created_at, updated_at')
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

    return NextResponse.json({
      success: true,
      announcements: announcements || [],
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
