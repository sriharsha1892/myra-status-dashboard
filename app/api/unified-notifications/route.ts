import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculatePriorityScore } from '@/lib/notifications/priorityScoring';

/**
 * GET /api/unified-notifications
 * Fetch notifications for the current user with filtering and pagination
 *
 * Query params:
 * - category: 'priority' | 'recent' | 'archived'
 * - status: 'unread' | 'read' | 'archived'
 * - limit: number (default 50)
 * - offset: number (default 0)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('priority_score', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (category) {
      query = query.eq('category', category);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data: notifications, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      notifications: notifications || [],
      count: notifications?.length || 0
    });

  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/unified-notifications
 * Create a new notification
 *
 * Body:
 * - entity_type: 'note' | 'ticket' | 'roadmap_item' | 'meeting' | 'trial_org'
 * - entity_id: UUID
 * - entity_title: string
 * - notification_type: 'mention' | 'assigned' | 'comment' | 'status_change' | 'issue_linked' | 'watching_update'
 * - actor_id: UUID (optional)
 * - title: string
 * - message: string (optional)
 * - action_url: string
 * - mentioned_user_ids: UUID[] (who should receive this notification)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      entity_type,
      entity_id,
      entity_title,
      notification_type,
      actor_id,
      title,
      message,
      action_url,
      mentioned_user_ids
    } = body;

    // Validation
    if (!entity_type || !entity_id || !notification_type || !title || !action_url) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!mentioned_user_ids || !Array.isArray(mentioned_user_ids) || mentioned_user_ids.length === 0) {
      return NextResponse.json(
        { error: 'mentioned_user_ids must be a non-empty array' },
        { status: 400 }
      );
    }

    // Create notification for each mentioned user
    const notifications = [];

    for (const userId of mentioned_user_ids) {
      // Calculate priority score
      const priorityScore = calculatePriorityScore({
        notificationType: notification_type,
        entityType: entity_type,
        actorId: actor_id,
        createdAt: new Date(),
        // Additional context would be fetched here in production
      });

      const notification = {
        user_id: userId,
        entity_type,
        entity_id,
        entity_title,
        notification_type,
        actor_id: actor_id || user.id,
        title,
        message,
        action_url,
        priority_score: priorityScore,
        thread_key: `${entity_type}:${entity_id}`,
        status: 'unread'
      };

      notifications.push(notification);
    }

    // Insert all notifications
    const { data, error } = await supabase
      .from('notifications')
      .insert(notifications)
      .select();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      notifications: data,
      count: data?.length || 0
    });

  } catch (error: any) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create notification' },
      { status: 500 }
    );
  }
}
