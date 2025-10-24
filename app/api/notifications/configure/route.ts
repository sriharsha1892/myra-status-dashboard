import { NextRequest, NextResponse } from 'next/server';

// In-memory storage (in production, this would be a database)
let subscriptions: Map<string, {
  email: string;
  services: string[];
  notifyOnDegraded: boolean;
  notifyOnOutage: boolean;
  notifyOnRecovery: boolean;
  createdAt: string;
}> = new Map();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, services, notifyOnDegraded, notifyOnOutage, notifyOnRecovery } = body;

    // Validate email
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email address required', success: false },
        { status: 400 }
      );
    }

    // Store subscription
    subscriptions.set(email, {
      email,
      services: services || [],
      notifyOnDegraded: notifyOnDegraded !== false,
      notifyOnOutage: notifyOnOutage !== false,
      notifyOnRecovery: notifyOnRecovery !== false,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Notification preferences saved successfully',
      subscription: subscriptions.get(email),
    });
  } catch (error) {
    console.error('Error configuring notifications:', error);
    return NextResponse.json(
      { error: 'Failed to save notification preferences', success: false },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (email) {
      const subscription = subscriptions.get(email);
      if (subscription) {
        return NextResponse.json({
          success: true,
          subscription,
        });
      } else {
        return NextResponse.json(
          { error: 'Subscription not found', success: false },
          { status: 404 }
        );
      }
    }

    // Return all subscriptions (admin only in production)
    return NextResponse.json({
      success: true,
      subscriptions: Array.from(subscriptions.values()),
      total: subscriptions.size,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notification preferences', success: false },
      { status: 500 }
    );
  }
}
