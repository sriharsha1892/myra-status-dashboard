import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/gtm/token';
import { isGtmEmail } from '@/lib/gtm/auth';

/**
 * GET - Check if the user has a valid session cookie.
 * Returns { authenticated: true, email } or { authenticated: false }.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const email = getSessionFromRequest(request);

    if (email && isGtmEmail(email)) {
      return NextResponse.json({ authenticated: true, email });
    }
  } catch {
    // Missing GTM_COOKIE_SECRET or malformed token — treat as unauthenticated
  }

  return NextResponse.json({ authenticated: false });
}

/**
 * DELETE - Clear the session cookie (logout).
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const isLocalhost = request.nextUrl.hostname === 'localhost';

  const response = NextResponse.json({ success: true });

  response.cookies.set('gtm_session', '', {
    httpOnly: true,
    secure: !isLocalhost,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return response;
}
