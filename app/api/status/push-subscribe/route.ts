import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { sendTestPush } from '@/lib/push/sendPush';

/**
 * Push Subscription API for Web Push Notifications
 *
 * POST - Subscribe to push notifications
 * DELETE - Unsubscribe from push notifications
 * GET - Get subscription count (admin)
 */

interface PushSubscriptionRequest {
  subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
  preferences?: {
    allChanges?: boolean;
    outagesOnly?: boolean;
    majorOutagesOnly?: boolean;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: PushSubscriptionRequest = await request.json();

    // Validate subscription object
    if (!body.subscription?.endpoint || !body.subscription?.keys?.p256dh || !body.subscription?.keys?.auth) {
      return NextResponse.json(
        { success: false, error: 'Invalid push subscription object' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Default preferences
    const preferences = {
      allChanges: body.preferences?.allChanges ?? false,
      outagesOnly: body.preferences?.outagesOnly ?? true,
      majorOutagesOnly: body.preferences?.majorOutagesOnly ?? false,
    };

    // Get user agent for debugging
    const userAgent = request.headers.get('user-agent') || undefined;

    // Upsert subscription (insert or update if endpoint exists)
    // Note: Using type cast since push_subscriptions table types may not be generated yet
    const subscriptionData = {
      endpoint: body.subscription.endpoint,
      p256dh: body.subscription.keys.p256dh,
      auth: body.subscription.keys.auth,
      preferences,
      user_agent: userAgent,
    };

    const { data, error } = await (supabase
      .from('push_subscriptions') as any)
      .upsert(subscriptionData, { onConflict: 'endpoint' })
      .select()
      .single();

    if (error) {
      console.error('Error saving push subscription:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to save subscription' },
        { status: 500 }
      );
    }

    // Send a test notification to confirm it works
    try {
      await sendTestPush({
        endpoint: body.subscription.endpoint,
        p256dh: body.subscription.keys.p256dh,
        auth: body.subscription.keys.auth,
      });
    } catch (testError) {
      console.log('Test push skipped (VAPID may not be configured):', testError);
    }

    console.log('Push subscription saved:', {
      endpoint: body.subscription.endpoint.slice(0, 50) + '...',
      preferences,
      timestamp: new Date().toISOString(),
    });

    const result = data as { id: string; preferences: any } | null;

    return NextResponse.json({
      success: true,
      message: 'Successfully subscribed to push notifications',
      subscription: result ? {
        id: result.id,
        preferences: result.preferences,
      } : null,
    });
  } catch (error: any) {
    console.error('Error processing push subscription:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process subscription' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { endpoint } = await request.json();

    if (!endpoint) {
      return NextResponse.json(
        { success: false, error: 'Endpoint is required' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Delete the subscription
    const { error } = await (supabase
      .from('push_subscriptions') as any)
      .delete()
      .eq('endpoint', endpoint);

    if (error) {
      console.error('Error deleting push subscription:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to unsubscribe' },
        { status: 500 }
      );
    }

    console.log('Push subscription deleted:', endpoint.slice(0, 50) + '...');

    return NextResponse.json({
      success: true,
      message: 'Successfully unsubscribed from push notifications',
    });
  } catch (error: any) {
    console.error('Error processing unsubscribe:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to unsubscribe' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = createServiceClient();

    // Get count of subscriptions
    const { count, error } = await (supabase
      .from('push_subscriptions') as any)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('Error fetching subscription count:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch subscription count' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      totalSubscriptions: count || 0,
      vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null,
    });
  } catch (error: any) {
    console.error('Error fetching subscriptions:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch subscriptions' },
      { status: 500 }
    );
  }
}
