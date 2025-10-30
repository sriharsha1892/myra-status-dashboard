import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Admin password - set via environment variable ADMIN_PASSWORD
// Default: "admin123" (change this!)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Generate a simple token
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// POST - Authenticate admin
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { success: false, error: 'Password is required' },
        { status: 400 }
      );
    }

    // Simple password check
    if (password === ADMIN_PASSWORD) {
      const token = generateToken();

      return NextResponse.json({
        success: true,
        token,
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid password' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Error in admin auth:', error);
    return NextResponse.json(
      { success: false, error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
