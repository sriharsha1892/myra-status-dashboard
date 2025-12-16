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

    const correctPassword = process.env.QUOTE_ACCESS_PASSWORD;

    if (!correctPassword) {
      console.error('QUOTE_ACCESS_PASSWORD environment variable is not set');
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Trim both to handle any whitespace issues
    const isCorrect = password.trim() === correctPassword.trim();

    // Debug logging (remove after troubleshooting)
    console.log('Auth attempt:', {
      inputLength: password.length,
      envLength: correctPassword.length,
      inputTrimmedLength: password.trim().length,
      envTrimmedLength: correctPassword.trim().length,
      match: isCorrect,
    });

    return NextResponse.json({ success: isCorrect });
  } catch (error) {
    console.error('Quote auth error:', error);
    return NextResponse.json(
      { success: false, error: 'Invalid request' },
      { status: 400 }
    );
  }
}
