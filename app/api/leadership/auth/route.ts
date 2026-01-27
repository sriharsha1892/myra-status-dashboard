import { NextRequest, NextResponse } from 'next/server';
import { isLeadershipEmail } from '@/lib/leadership/auth';

interface AuthRequest {
  email: string;
  password: string;
}

/**
 * POST - Verify leadership email + password
 *
 * Simple authentication for leadership dashboard:
 * 1. Checks if email is in LEADERSHIP_EMAILS list
 * 2. Checks if password matches LEADERSHIP_PASSWORD
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: AuthRequest = await request.json();

    // Validate required fields
    if (!body.email || !body.password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const email = body.email.trim().toLowerCase();

    // Check if email is authorized for leadership access
    if (!isLeadershipEmail(email)) {
      return NextResponse.json(
        { error: 'Email not authorized for leadership access' },
        { status: 401 }
      );
    }

    // Check password
    const leadershipPassword = process.env.LEADERSHIP_PASSWORD;
    if (!leadershipPassword) {
      console.error('LEADERSHIP_PASSWORD environment variable not set');
      return NextResponse.json(
        { error: 'Authentication not configured' },
        { status: 500 }
      );
    }

    if (body.password !== leadershipPassword) {
      return NextResponse.json(
        { error: 'Incorrect password' },
        { status: 401 }
      );
    }

    // Success
    return NextResponse.json({
      success: true,
      email: email,
    });
  } catch (error) {
    console.error('Leadership auth error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
