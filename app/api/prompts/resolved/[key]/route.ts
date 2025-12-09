import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getResolvedPrompt } from '@/lib/prompts/service';

interface RouteParams {
  params: Promise<{ key: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { key } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId') || undefined;

    const resolved = await getResolvedPrompt(key, orgId);

    if (!resolved) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ data: resolved });
  } catch (error) {
    console.error('Error fetching resolved prompt:', error);
    return NextResponse.json(
      { error: 'Failed to fetch resolved prompt' },
      { status: 500 }
    );
  }
}
