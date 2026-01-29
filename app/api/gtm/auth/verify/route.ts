import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, createSessionToken } from '@/lib/gtm/token';
import { isGtmEmail } from '@/lib/gtm/auth';

/**
 * GET - Verify a magic link token and set session cookie.
 * Redirects to dashboard on success, shows error on failure.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return errorResponse('Missing token');
  }

  const secret = process.env.GTM_COOKIE_SECRET;
  if (!secret) {
    console.error('GTM_COOKIE_SECRET not configured');
    return errorResponse('Authentication not configured');
  }

  const payload = verifyToken(token, secret);
  if (!payload) {
    return errorResponse('Link expired or invalid. Contact your administrator for a new link.');
  }

  if (payload.purpose !== 'access_link') {
    return errorResponse('Invalid link type');
  }

  if (!isGtmEmail(payload.email)) {
    return errorResponse('Email not authorized for GTM access');
  }

  // Create session token and set cookie
  const sessionToken = createSessionToken(payload.email);
  const isLocalhost = request.nextUrl.hostname === 'localhost';

  const response = NextResponse.redirect(
    new URL('/quote/admin/dashboard', request.url)
  );

  response.cookies.set('gtm_session', sessionToken, {
    httpOnly: true,
    secure: !isLocalhost,
    sameSite: 'lax',
    path: '/',
    maxAge: 90 * 24 * 60 * 60, // 90 days in seconds
  });

  return response;
}

function errorResponse(message: string): NextResponse {
  const html = `<!DOCTYPE html>
<html>
<head><title>Access Error</title><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#fafafa">
  <div style="text-align:center;max-width:400px;padding:2rem">
    <h1 style="font-size:1.25rem;color:#171717;margin-bottom:0.5rem">Access Error</h1>
    <p style="color:#737373;font-size:0.875rem">${message}</p>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    status: 400,
    headers: { 'Content-Type': 'text/html' },
  });
}
