import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword } from '@/lib/auth/password';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get user by email
    const { data: user, error: getUserError } = await supabase
      .from('users')
      .select('id, email, password_hash, role, full_name')
      .eq('email', email)
      .single();

    if (getUserError || !user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, (user as any).password_hash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Update last login timestamp
    await supabase
      // -ignore - Supabase typing issue with dynamic columns

      .from('users')
      // @ts-ignore - Supabase typing issue with dynamic columns
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', (user as any).id);

    return NextResponse.json({
      success: true,
      user: {
        id: (user as any).id,
        email: (user as any).email,
        full_name: (user as any).full_name,
        role: (user as any).role,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
