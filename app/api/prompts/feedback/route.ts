import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateExecutionFeedback } from '@/lib/prompts/service';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const { execution_id, feedback, notes } = body;

    if (!execution_id) {
      return NextResponse.json(
        { error: 'execution_id is required' },
        { status: 400 }
      );
    }

    if (!feedback || !['positive', 'negative', 'neutral'].includes(feedback)) {
      return NextResponse.json(
        { error: 'feedback must be one of: positive, negative, neutral' },
        { status: 400 }
      );
    }

    await updateExecutionFeedback(execution_id, feedback, notes);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}
