import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { success: false, error: 'Password is required' },
        { status: 400 }
      );
    }

    const correctPassword = process.env.QUOTE_ADMIN_PASSWORD;

    if (!correctPassword) {
      console.error('QUOTE_ADMIN_PASSWORD environment variable is not set');
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const isCorrect = password.trim() === correctPassword.trim();
    return NextResponse.json({ success: isCorrect });
  } catch (error) {
    console.error('Quote admin auth error:', error);
    return NextResponse.json(
      { success: false, error: 'Invalid request' },
      { status: 400 }
    );
  }
}
