import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protected routes check
  if (request.nextUrl.pathname.startsWith('/support')) {
    const publicPaths = ['/support/login'];
    const isPublicPath = publicPaths.some(path => request.nextUrl.pathname.startsWith(path));

    if (!user && !isPublicPath) {
      return NextResponse.redirect(new URL('/support/login', request.url));
    }

    // If user is authenticated and trying to access login, redirect to trials
    if (user && request.nextUrl.pathname === '/support/login') {
      return NextResponse.redirect(new URL('/support/trials', request.url));
    }

    // Role-based access control
    if (user) {
      const userRole = user.user_metadata?.role;

      // AM role can only access submit page
      if (userRole === 'AM' && !request.nextUrl.pathname.startsWith('/support/submit')) {
        return NextResponse.redirect(new URL('/support/submit', request.url));
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/support/:path*',
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
