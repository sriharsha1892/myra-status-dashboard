import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { deletePromptOverride } from '@/lib/prompts/service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
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

    await deletePromptOverride(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting prompt override:', error);
    return NextResponse.json(
      { error: 'Failed to delete prompt override' },
      { status: 500 }
    );
  }
}
