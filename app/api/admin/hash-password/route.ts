import { NextRequest, NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth/password';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    const hash = await hashPassword(password);

    return NextResponse.json({
      password,
      hash,
      message: 'Copy the hash value above and insert it into the users table'
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
