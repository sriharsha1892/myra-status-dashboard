import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTokensFromCode } from '@/lib/calendar/microsoftClient';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // user ID
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/support/dashboard?calendar_error=${error}`
      );
    }

    if (!code || !state) {
      return NextResponse.json({ error: 'Missing code or state' }, { status: 400 });
    }

    const supabase = await createClient();

    // Get tokens from Microsoft
    const tokens = await getTokensFromCode(code);

    // Store tokens in database
    const { error: dbError } = await supabase
      .from('calendar_integrations')
      // @ts-ignore - Supabase typing issue with dynamic columns
      .upsert({
        user_id: state,
        provider: 'microsoft',
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expires_at: tokens.expiresOn,
        updated_at: new Date()
      }, {
        onConflict: 'user_id,provider'
      });

    if (dbError) {
      console.error('Failed to store calendar tokens:', dbError);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/support/dashboard?calendar_error=storage_failed`
      );
    }

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/support/dashboard?calendar_success=true`
    );
  } catch (error: any) {
    console.error('Calendar callback error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/support/dashboard?calendar_error=${encodeURIComponent(error.message)}`
    );
  }
}
