import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getExecutionStats } from '@/lib/prompts/service';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: userData } = await supabase
      .from('users')
      .select('role, is_super_admin')
      .eq('id', user.id)
      .single();

    const userInfo = userData as { role: string; is_super_admin: boolean } | null;
    if (!userInfo || (userInfo.role !== 'Admin' && !userInfo.is_super_admin)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('templateId') || undefined;
    const orgId = searchParams.get('orgId') || undefined;
    const days = parseInt(searchParams.get('days') || '30');

    const stats = await getExecutionStats(templateId, orgId, days);

    return NextResponse.json({ data: stats });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
