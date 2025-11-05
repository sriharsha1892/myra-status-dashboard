import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();

    let accessToken = '';

    console.log('All cookies:', allCookies.map(c => ({ name: c.name, value: c.value.substring(0, 50) })));

    if (authHeader) {
      accessToken = authHeader.replace('Bearer ', '');
    } else {
      // Try different cookie patterns
      let authCookie = allCookies.find(cookie =>
        cookie.name.includes('sb-') && cookie.name.includes('auth-token')
      );

      // Fallback: try to find any cookie with 'auth' or 'session'
      if (!authCookie) {
        authCookie = allCookies.find(cookie =>
          cookie.name.toLowerCase().includes('auth') || cookie.name.toLowerCase().includes('session')
        );
      }

      if (authCookie) {
        try {
          const cookieValue = JSON.parse(authCookie.value);
          accessToken = cookieValue.access_token || cookieValue[0];
          console.log('Parsed access token from cookie:', authCookie.name);
        } catch {
          accessToken = authCookie.value;
          console.log('Using raw cookie value from:', authCookie.name);
        }
      } else {
        console.log('No auth cookie found');
      }
    }

    if (!accessToken) {
      return NextResponse.json({ error: 'No access token found' }, { status: 401 });
    }

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);

    if (error || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata,
        role: user.user_metadata?.role,
        role_lowercase: user.user_metadata?.role?.toLowerCase(),
      },
    });
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
