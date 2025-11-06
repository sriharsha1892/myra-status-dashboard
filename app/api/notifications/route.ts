import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Simple in-memory cache with 15-second TTL to reduce database load
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 15000; // 15 seconds

// GET - List notifications for current user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check cache first
    const cacheKey = `notifications:${user.email}`;
    const cached = cache.get(cacheKey);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      // Return cached data if still valid
      return NextResponse.json(cached.data);
    }

    // Get notifications with note details
    const { data: notifications, error } = await supabase
      .from('activity_note_notifications')
      .select(`
        *,
        org_activity_notes (
          note_id,
          org_id,
          note_category,
          note_text,
          logged_by,
          created_at,
          trial_organizations (
            org_id,
            org_name
          )
        )
      `)
      .eq('user_email', user.email)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    // Cache the result
    const responseData = { notifications: notifications || [] };
    cache.set(cacheKey, { data: responseData, timestamp: now });

    // Clean up old cache entries (simple cache eviction)
    if (cache.size > 100) {
      const firstKey = cache.keys().next().value;
      if (firstKey) cache.delete(firstKey);
    }

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

// PATCH - Mark notifications as read
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { notification_ids } = body;

    if (!notification_ids || !Array.isArray(notification_ids)) {
      return NextResponse.json(
        { error: 'notification_ids array is required' },
        { status: 400 }
      );
    }

    // Mark as read
    const { error } = await supabase
      .from('activity_note_notifications')
      .update({ read: true })
      .in('notification_id', notification_ids)
      .eq('user_email', user.email);

    if (error) throw error;

    // Invalidate cache for this user
    const cacheKey = `notifications:${user.email}`;
    cache.delete(cacheKey);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating notifications:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update notifications' },
      { status: 500 }
    );
  }
}
