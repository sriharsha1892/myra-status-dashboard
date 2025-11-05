import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthUrl } from '@/lib/calendar/microsoftClient';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate OAuth URL with user ID as state
    // Teams uses the same OAuth as Calendar (Microsoft Graph)
    const authUrl = await getAuthUrl(user.id);

    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error('Teams auth error:', error);
    return NextResponse.json({
      error: error.message
    }, { status: 500 });
  }
}
