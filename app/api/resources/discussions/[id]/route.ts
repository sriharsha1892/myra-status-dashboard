import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyUserAccess } from '@/lib/auth-helper';

// Create Supabase Admin client
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

// DELETE - Delete a discussion/question (author or admin only)
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Await params (Next.js 15+ requirement)
    const params = await context.params;
    const discussionId = params.id;

    // Verify user access
    const { authorized, userId, role, is_super_admin } = await verifyUserAccess(request);
    if (!authorized || !userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Get the discussion to check ownership
    const supabaseAdmin = getSupabaseAdmin();
    const { data: discussion, error: fetchError } = await supabaseAdmin
      .from('resource_discussions')
      .select('id, author_id, discussion_type')
      .eq('id', discussionId)
      .single();

    if (fetchError || !discussion) {
      return NextResponse.json(
        { error: 'Discussion not found' },
        { status: 404 }
      );
    }

    // Check authorization: user must be author OR admin OR super admin
    const isAuthor = discussion.author_id === userId;
    const isAdmin = role?.toLowerCase() === 'admin';
    const isSuperAdmin = is_super_admin === true;

    if (!isAuthor && !isAdmin && !isSuperAdmin) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this post' },
        { status: 403 }
      );
    }

    // Delete the discussion (CASCADE will handle related records)
    // This will automatically delete:
    // - Answers/replies (parent_discussion_id foreign key)
    // - Reactions (discussion_id foreign key)
    // - Notifications (related foreign keys)
    const { error: deleteError } = await supabaseAdmin
      .from('resource_discussions')
      .delete()
      .eq('id', discussionId);

    if (deleteError) {
      console.error('Error deleting discussion:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete discussion' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Discussion deleted successfully',
    });
  } catch (error) {
    console.error('Error in DELETE /api/resources/discussions/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
