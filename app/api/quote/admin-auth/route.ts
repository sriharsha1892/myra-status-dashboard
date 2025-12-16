import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    const correctPassword = process.env.QUOTE_ADMIN_PASSWORD;

    if (!correctPassword) {
      console.error('QUOTE_ADMIN_PASSWORD not configured');
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const isCorrect = password === correctPassword;

    return NextResponse.json({ success: isCorrect });
  } catch (error) {
    console.error('Admin auth error:', error);
    return NextResponse.json(
      { success: false, error: 'Invalid request' },
      { status: 400 }
    );
  }
}
