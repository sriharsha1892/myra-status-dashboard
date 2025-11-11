import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/todos
 * Returns todos for the authenticated user (bypasses RLS)
 *
 * Query params:
 * - type: 'my' | 'mentioned' (default: 'my')
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create admin client to bypass RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'my';

    if (type === 'mentioned') {
      // Get todos where user is mentioned
      const { data: mentions, error: mentionsError } = await supabaseAdmin
        .from('todo_mentions')
        .select('todo_id, is_read')
        .eq('mentioned_user_id', user.id);

      if (mentionsError) {
        console.error('Error fetching mentioned todos:', mentionsError);
        return NextResponse.json({ todos: [] });
      }

      if (!mentions || mentions.length === 0) {
        return NextResponse.json({ todos: [] });
      }

      const todoIds = mentions.map(m => m.todo_id);

      const { data: todos, error: todosError } = await supabaseAdmin
        .from('user_todos')
        .select(`
          *,
          trial_organizations(org_name)
        `)
        .in('todo_id', todoIds)
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (todosError) {
        console.error('Error fetching mentioned todos data:', todosError);
        return NextResponse.json({ todos: [] });
      }

      // Add is_mentioned flag and is_read status
      const todosWithMentions = (todos || []).map(todo => ({
        ...todo,
        is_mentioned: true,
        is_read: mentions.find(m => m.todo_id === todo.todo_id)?.is_read || false,
      }));

      return NextResponse.json({ todos: todosWithMentions });
    } else {
      // Get user's own todos
      const { data, error } = await supabaseAdmin
        .from('user_todos')
        .select(`
          *,
          trial_organizations(org_name)
        `)
        .eq('user_id', user.id)
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching my todos:', error);
        return NextResponse.json({ todos: [] });
      }

      return NextResponse.json({ todos: data || [] });
    }
  } catch (error: any) {
    console.error('Error in GET /api/todos:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
