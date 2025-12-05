import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

/**
 * Status Alert Subscriptions API
 *
 * Manages email subscriptions for status page alerts.
 * Persists to database for reliable notification delivery.
 *
 * POST - Subscribe/update subscription
 * DELETE - Unsubscribe
 * GET - Get subscription count (admin)
 */

interface SubscriptionRequest {
  email: string;
  preferences: {
    allChanges: boolean;
    outagesOnly: boolean;
    majorOutagesOnly: boolean;
  };
  providers?: string[];
}

// Simple email validation
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export async function POST(request: NextRequest) {
  try {
    const body: SubscriptionRequest = await request.json();

    // Validate email
    if (!body.email || !isValidEmail(body.email)) {
      return NextResponse.json(
        { success: false, error: 'Valid email address is required' },
        { status: 400 }
      );
    }

    // Validate preferences
    if (!body.preferences) {
      return NextResponse.json(
        { success: false, error: 'Subscription preferences are required' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Upsert subscription (insert or update if email exists)
    const { data, error } = await supabase
      .from('status_subscriptions')
      .upsert(
        {
          email: body.email.toLowerCase().trim(),
          preferences: body.preferences,
          providers: body.providers || null,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'email',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Error saving subscription:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to save subscription' },
        { status: 500 }
      );
    }

    console.log('Status subscription saved:', {
      email: body.email,
      preferences: body.preferences,
      providers: body.providers || 'all',
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Successfully subscribed to status alerts',
      subscription: {
        email: data.email,
        preferences: data.preferences,
        providers: data.providers || [],
      },
    });
  } catch (error: any) {
    console.error('Error processing subscription:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process subscription' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { success: false, error: 'Valid email address is required' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from('status_subscriptions')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('email', email.toLowerCase().trim());

    if (error) {
      console.error('Error unsubscribing:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to unsubscribe' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully unsubscribed from status alerts',
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

    // Get count of active subscriptions
    const { count, error } = await supabase
      .from('status_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

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
      message: 'Subscription endpoint active',
    });
  } catch (error: any) {
    console.error('Error fetching subscriptions:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch subscriptions' },
      { status: 500 }
    );
  }
}
