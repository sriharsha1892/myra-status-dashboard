import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getPromptOverrides,
  createOrUpdatePromptOverride,
} from '@/lib/prompts/service';

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

    const overrides = await getPromptOverrides(templateId, orgId);

    return NextResponse.json({ data: overrides });
  } catch (error) {
    console.error('Error fetching prompt overrides:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prompt overrides' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();

    // Validate required fields
    if (!body.template_id || !body.org_id) {
      return NextResponse.json(
        { error: 'Missing required fields: template_id, org_id' },
        { status: 400 }
      );
    }

    const override = await createOrUpdatePromptOverride(body, user.id);

    return NextResponse.json({ data: override }, { status: 201 });
  } catch (error) {
    console.error('Error creating prompt override:', error);
    return NextResponse.json(
      { error: 'Failed to create prompt override' },
      { status: 500 }
    );
  }
}
