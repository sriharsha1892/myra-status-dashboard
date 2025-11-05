import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST endpoint to save Teams webhook URL
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { webhookUrl, teamName, channelName } = body;

    // Store webhook configuration
    const { data, error } = await supabase
      .from('teams_integration')
      // @ts-ignore - Supabase typing issue with dynamic columns
      .upsert({
        user_id: user.id,
        webhook_url: webhookUrl,
        team_name: teamName,
        channel_name: channelName,
        enabled: true,
        updated_at: new Date(),
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Teams webhook save error:', error);
    return NextResponse.json({
      error: error.message
    }, { status: 500 });
  }
}

// GET endpoint to retrieve Teams webhook configuration
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('teams_integration')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return NextResponse.json({ data: data || null });
  } catch (error: any) {
    console.error('Teams webhook get error:', error);
    return NextResponse.json({
      error: error.message
    }, { status: 500 });
  }
}
