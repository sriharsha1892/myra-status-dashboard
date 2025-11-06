import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and password are required' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get token data
    const { data: tokenData, error: tokenError } = await supabase
      .from('signup_tokens')
      .select('email, expires_at, used, user_role')
      .eq('token', token)
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json(
        { error: 'Invalid signup link' },
        { status: 400 }
      );
    }

    if (tokenData.used) {
      return NextResponse.json(
        { error: 'This signup link has already been used' },
        { status: 400 }
      );
    }

    const expiresAt = new Date(tokenData.expires_at);
    if (expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'This signup link has expired' },
        { status: 400 }
      );
    }

    // Create the user account
    const { data: authData, error: createError } = await supabase.auth.admin.createUser({
      email: tokenData.email,
      password: password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        role: tokenData.user_role || 'user'
      }
    });

    if (createError) {
      console.error('User creation error:', createError);
      return NextResponse.json(
        { error: createError.message || 'Failed to create account' },
        { status: 400 }
      );
    }

    // Mark token as used
    await supabase
      .from('signup_tokens')
      .update({ used: true })
      .eq('token', token);

    return NextResponse.json({
      success: true,
      user: authData.user
    });
  } catch (error) {
    console.error('Signup completion error:', error);
    return NextResponse.json(
      { error: 'Failed to complete signup' },
      { status: 500 }
    );
  }
}
